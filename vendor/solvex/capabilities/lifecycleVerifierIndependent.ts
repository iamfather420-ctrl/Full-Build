import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const INDEPENDENT_VERIFIER_VERSION = 'lifecycle-verifier-independent-2';

export interface IndependentVerdict {
  ok: boolean;
  findings: string[];
}

type Claims = Record<string, string | number>;
type Signed = { claims: Claims; signature: string };

const asText = (value: unknown): string => typeof value === 'string' ? value : '';
const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

function normalizeEd25519(pem: string) {
  if (!pem || pem.includes('PRIVATE KEY')) throw new Error('private or missing key material');
  const key = createPublicKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('key is not Ed25519');
  const normalizedPem = key.export({ type: 'spki', format: 'pem' }).toString();
  return { key, normalizedPem };
}

function canonicalClaims(claims: Claims): Buffer {
  const sorted: Record<string, string | number> = {};
  for (const name of Object.keys(claims).sort()) {
    const value = claims[name];
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error('claim type is invalid');
    sorted[name] = value;
  }
  return Buffer.from(JSON.stringify(sorted), 'utf8');
}

function independentlyVerifySignature(key: ReturnType<typeof createPublicKey>, claims: Claims, signature: string): boolean {
  try {
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length !== 64) return false;
    return verifySignature(null, canonicalClaims(claims), key, bytes);
  } catch {
    return false;
  }
}

function executeCandidate(source: string, exportName: string): (input: unknown) => unknown {
  const prohibited = [/child_process/, /\brequire\s*\(/, /\bprocess\b/, /paypal/i, /marketplace/i, /AuthService/, /HumanApprovalGate/, /\beval\s*\(/, /\bFunction\s*\(/, /\bimport\s/, /node:/];
  if (prohibited.some((pattern) => pattern.test(source))) throw new Error('candidate source crossed sandbox boundary');
  const sandbox: Record<string, unknown> = { deployed: false };
  const context = vm.createContext(sandbox);
  new vm.Script(source, { filename: 'independent-verifier-candidate.js' }).runInContext(context, { timeout: 1000 });
  const candidate = sandbox[exportName];
  if (typeof candidate !== 'function') throw new Error('candidate export is missing');
  return (input: unknown) => {
    const output = (candidate as (value: unknown) => unknown)(input);
    if (sandbox.deployed !== false) throw new Error('candidate mutated deployment state');
    return output;
  };
}

function behaviorMatches(source: string, exportName: string): boolean {
  const run = executeCandidate(source, exportName);
  if (exportName === 'boundDistance') {
    const good = run({ distance: 16, epsilon: 1 }) as { status?: string; authority?: string; value?: number };
    const bad = run(null) as { status?: string; authority?: string };
    return good.status === 'BOUNDED' && typeof good.value === 'number' && good.value < 1 && good.authority === 'none' && bad.status === 'INVALID' && bad.authority === 'none';
  }
  if (exportName === 'rejectUnsigned') {
    const unsigned = run({}) as { status?: string; authority?: string; accepted?: boolean };
    const signed = run({ signature: 'present' }) as { status?: string; authority?: string; accepted?: boolean };
    return unsigned.status === 'UNSIGNED' && signed.status === 'SIGNED_STILL_NOT_AUTHORITY' && signed.accepted === false && signed.authority === 'none' && unsigned.authority === 'none';
  }
  return false;
}

/**
 * Independent implementation: Node crypto canonicalization/signature checks,
 * key parsing/fingerprinting, VM execution, source hashing, and transition
 * evidence checks are implemented here without importing primary-verifier
 * crypto, registry, approval-gate, or sandbox helpers.
 */
export function verifyLifecycleIndependently(parsed: unknown, now = Date.now()): IndependentVerdict {
  const findings: string[] = [];
  if (typeof parsed === 'string') return { ok: false, findings: ['BLOCKED: evidence seal must be checked before parsing.'] };
  if (!parsed || typeof parsed !== 'object') return { ok: false, findings: ['BLOCKED: evidence is not an object.'] };
  const bundle = parsed as { schema?: unknown; chains?: unknown; cross_chain?: unknown };
  if (bundle.schema !== 'SOLVEX_LIFECYCLE_RAW_V2') return { ok: false, findings: ['BLOCKED: lifecycle evidence schema is not raw V2.'] };
  if (!Array.isArray(bundle.chains) || bundle.chains.length !== 2) return { ok: false, findings: ['BLOCKED: exactly two independent raw chains are required.'] };

  const installedPem = readFileSync(new URL('../auth/installed-human-root.pub.pem', import.meta.url), 'utf8');
  let productionFingerprint = '';
  try {
    productionFingerprint = digest(normalizeEd25519(installedPem).normalizedPem);
  } catch {
    findings.push('BLOCKED: installed production public key is invalid.');
  }
  const gateSource = readFileSync(new URL('../governance/HumanApprovalGate.ts', import.meta.url), 'utf8');
  const authSource = readFileSync(new URL('../auth/AuthService.ts', import.meta.url), 'utf8');
  if (!/export function productionIntegrationPermitted\(\): false\s*\{\s*return false;\s*\}/.test(gateSource)) {
    findings.push('BLOCKED: production integration source is not fail-closed.');
  }
  if (!/authorize[\s\S]*authorized:\s*false/.test(authSource)) {
    findings.push('BLOCKED: AuthService source is not fail-closed.');
  }

  const fingerprints = new Set<string>();
  const nonces = new Set<string>();
  const sourceHashes = new Set<string>();
  const expectedSteps = ['DISCOVER', 'BUILD', 'AUTHORIZE_CANDIDATE', 'AUTHORIZE_INTEGRATION', 'REGISTRY', 'INTEGRATE', 'FAILURE', 'RECOVER', 'REPLAY', 'HUMAN_BOUNDARY'];

  for (const raw of bundle.chains) {
    if (!raw || typeof raw !== 'object') {
      findings.push('BLOCKED: chain record is not an object.');
      continue;
    }
    const row = raw as Record<string, any>;
    const source = asText(row.source);
    const name = asText(row.name);
    const exportName = asText(row.exportName);
    const candidate = row.candidate as Signed | undefined;
    const integration = row.integration as Signed | undefined;
    const execution = row.execution as Record<string, any> | undefined;
    if (!source || !name || !candidate?.claims || !candidate.signature || !integration?.claims || !integration.signature || !asText(row.publicKeyPem) || !execution) {
      findings.push('BLOCKED: raw chain is missing source, public key, signatures, or transition outputs.');
      continue;
    }

    let key: ReturnType<typeof createPublicKey>;
    let fingerprint: string;
    try {
      const parsedKey = normalizeEd25519(asText(row.publicKeyPem));
      key = parsedKey.key;
      fingerprint = digest(parsedKey.normalizedPem);
    } catch {
      findings.push(`${name}: operator public key is invalid or not Ed25519.`);
      continue;
    }

    const sourceHash = digest(source);
    const expectedRegistry = `cap_${digest(name.toLowerCase()).slice(0, 12)}`;
    const candidateNonce = String(candidate.claims.nonce ?? '');
    const integrationNonce = String(integration.claims.nonce ?? '');
    const issued = Number(candidate.claims.issued_at);
    const expires = Number(candidate.claims.expires_at);
    const candidateTimeValid = Number.isFinite(issued) && Number.isFinite(expires) && issued <= now && now < expires && expires - issued <= 15 * 60 * 1000;
    const integrationTimeValid = Number(integration.claims.issued_at) <= now && now < Number(integration.claims.expires_at)
      && Number(integration.claims.expires_at) - Number(integration.claims.issued_at) <= 15 * 60 * 1000;
    const candidateSig = independentlyVerifySignature(key, candidate.claims, candidate.signature);
    const integrationSig = independentlyVerifySignature(key, integration.claims, integration.signature);

    if (candidate.claims.capability_id !== expectedRegistry || candidate.claims.version !== 1) findings.push(`${name}: discovery registry identity mismatch.`);
    if (candidate.claims.typ !== 'solvex-sandbox-candidate-v1' || candidate.claims.content_sha256 !== sourceHash
      || candidate.claims.statement_sha256 !== digest(asText(row.statement)) || !candidateSig || !candidateTimeValid) {
      findings.push(`${name}: candidate signature, lifetime, statement, or source binding failed.`);
    }
    if (integration.claims.typ !== 'solvex-sandbox-integration-v1'
      || integration.claims.procedure !== 'SANDBOX_INTEGRATION_REHEARSAL_V1'
      || integration.claims.content_sha256 !== sourceHash
      || integration.claims.statement_sha256 !== digest(asText(row.integrationStatement))
      || integration.claims.candidate_nonce !== candidateNonce
      || integration.claims.production !== 'false'
      || integration.claims.production_credentials !== 'false'
      || candidate.signature === integration.signature
      || candidateNonce === integrationNonce
      || !integrationSig || !integrationTimeValid) {
      findings.push(`${name}: separate integration signature is invalid or not bound to this candidate.`);
    }
    if (fingerprint === productionFingerprint) findings.push(`${name}: sandbox operator reused the installed production ceremony key.`);
    if (fingerprints.has(fingerprint) || nonces.has(integrationNonce) || sourceHashes.has(sourceHash)) findings.push(`${name}: operator, nonce, or source was inherited across chains.`);
    fingerprints.add(fingerprint);
    nonces.add(integrationNonce);
    sourceHashes.add(sourceHash);

    try {
      if (!behaviorMatches(source, exportName)) findings.push(`${name}: independently executed source behavior did not match.`);
    } catch {
      findings.push(`${name}: source did not execute within the independent sandbox boundary.`);
    }

    const expectedOrder = ['DISCOVER', 'BUILD', 'AUTHORIZE_CANDIDATE', 'AUTHORIZE_INTEGRATION', 'REGISTRY', 'INTEGRATE', 'FAILURE', 'RECOVER', 'REPLAY', 'HUMAN_BOUNDARY'];
    if (JSON.stringify(execution.transition_order) !== JSON.stringify(expectedOrder) || execution.observed_at !== issued) findings.push(`${name}: raw transition order or execution timestamp is invalid.`);
    const registry = execution.registry ?? {};
    const sandbox = execution.sandbox ?? {};
    const recovery = sandbox.recovery ?? {};
    const replay = sandbox.replay ?? {};
    if (registry.id !== expectedRegistry || registry.version !== 1 || registry.status_after_verification !== 'APPROVAL_REQUIRED'
      || registry.evidence_sha256 !== sourceHash || registry.executable !== false
      || registry.production_deploy_attempted !== true || registry.production_deploy_succeeded !== false) {
      findings.push(`${name}: recorded registry transitions are incomplete or not fail-closed.`);
    }
    if (sandbox.integration?.accepted !== true || sandbox.integration?.reported_hash !== sourceHash || sandbox.artifact_after_integration !== source) {
      findings.push(`${name}: recorded sandbox integration bytes do not match signed source.`);
    }
    if (typeof sandbox.failure?.artifact !== 'string' || digest(sandbox.failure.artifact) === sourceHash) {
      findings.push(`${name}: recorded failure artifact does not demonstrate corruption.`);
    }
    if (recovery.restored !== true || recovery.artifact !== source || digest(asText(recovery.artifact)) !== sourceHash) {
      findings.push(`${name}: recorded recovery bytes do not match signed source.`);
    }
    if (replay.accepted !== false || replay.artifact_after_attempt !== source || !/replay/i.test(asText(replay.reason))) {
      findings.push(`${name}: recorded replay was not rejected while preserving the recovered artifact.`);
    }
    if (!Array.isArray(sandbox.production_switch_samples) || sandbox.production_switch_samples.length < 4
      || sandbox.production_switch_samples.some((sample: unknown) => sample !== false)) {
      findings.push(`${name}: production switch observations are missing or not closed.`);
    }
  }

  const cross = bundle.cross_chain as Record<string, any> | undefined;
  if (!cross || cross.source_sha256 !== digest(asText((bundle.chains[0] as Record<string, any>).source))
    || cross.target_source_sha256 !== digest(asText((bundle.chains[1] as Record<string, any>).source))
    || cross.accepted !== false || !/hash|artifact/i.test(asText(cross.reason)) || cross.artifact_after_attempt !== null) {
    findings.push('BLOCKED: cross-chain source substitution was not independently recorded as rejected.');
  }

  return { ok: findings.length === 0, findings };
}
