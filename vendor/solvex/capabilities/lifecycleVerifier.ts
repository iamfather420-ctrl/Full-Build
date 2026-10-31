import { readFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { assertPublicEd25519 } from '../auth/installHumanRoot';
import { verifyClaims } from '../auth/VerifiedHumanSession';
import { AuthService } from '../auth/AuthService';
import { productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { loadSandbox } from './independentLifecycle';

export const VERIFIER_VERSION = 'lifecycle-verifier-2';

export interface RawChain {
  name: string;
  source: string;
  exportName: string;
  statement: string;
  integrationStatement: string;
  publicKeyPem: string;
  candidate: { claims: Record<string, string | number>; signature: string };
  integration: { claims: Record<string, string | number>; signature: string };
  execution: Record<string, any>;
}

export interface Transition {
  chain: string;
  step: string;
  source_sha256: string;
  registry_id: string;
  operator_fingerprint: string;
  authorization: string;
  pass: boolean;
  detail: string;
}

export interface TrustVerdict {
  ok: boolean;
  isolated_capability_development: boolean;
  production_ready: false;
  autonomous_operating_system: false;
  production_switch: false;
  production_blockers_resolved: false;
  inherited_state: false;
  used_self_reported_success: false;
  transitions: Transition[];
  findings: string[];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function token(value: unknown): { claims: Record<string, string | number>; signature: string } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { claims?: unknown; signature?: unknown };
  if (!record.claims || typeof record.claims !== 'object' || typeof record.signature !== 'string') return null;
  const claims: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(record.claims)) {
    if (typeof item === 'string' || typeof item === 'number') claims[key] = item;
  }
  return { claims, signature: record.signature };
}

/** Accepts only raw fields. Boolean success flags in the input are ignored. */
export function readRawBundle(parsed: unknown): { chains: RawChain[]; cross_chain: Record<string, any> } | { error: string } {
  if (!parsed || typeof parsed !== 'object') return { error: 'BLOCKED: evidence is not an object.' };
  const record = parsed as { schema?: unknown; chains?: unknown; cross_chain?: unknown };
  if (record.schema !== 'SOLVEX_LIFECYCLE_RAW_V2') return { error: 'BLOCKED: evidence schema is not a raw lifecycle bundle.' };
  const chains = record.chains;
  if (!Array.isArray(chains) || chains.length === 0) return { error: 'BLOCKED: evidence has no raw chains.' };
  const raw: RawChain[] = [];
  for (const item of chains) {
    if (!item || typeof item !== 'object') return { error: 'BLOCKED: a chain is not raw evidence.' };
    const row = item as Record<string, unknown>;
    if ('recovered_artifact' in row && computeSha256(text(row.recovered_artifact)) !== computeSha256(text(row.source))) {
      return { error: 'BLOCKED: recovery artifact does not match the source hash.' };
    }
    const candidate = token(row.candidate);
    const integration = token(row.integration);
    if (!candidate || !integration || !text(row.source) || !text(row.publicKeyPem) || !row.execution || typeof row.execution !== 'object') {
      return { error: 'BLOCKED: chain is missing source, operator key, or authorization signatures. A stored hash is not evidence.' };
    }
    raw.push({
      name: text(row.name),
      source: text(row.source),
      exportName: text(row.exportName),
      statement: text(row.statement),
      integrationStatement: text(row.integrationStatement),
      publicKeyPem: text(row.publicKeyPem),
      candidate,
      integration,
      execution: row.execution as Record<string, any>,
    });
  }
  if (!record.cross_chain || typeof record.cross_chain !== 'object') return { error: 'BLOCKED: raw cross-chain transition evidence is missing.' };
  return { chains: raw, cross_chain: record.cross_chain as Record<string, any> };
}

function behaviorHolds(exportName: string, fn: (input: unknown) => unknown): boolean {
  if (exportName === 'boundDistance') {
    const good = fn({ distance: 16, epsilon: 1 }) as { status?: string; authority?: string; value?: number };
    const bad = fn(null) as { status?: string; authority?: string };
    return good.status === 'BOUNDED' && typeof good.value === 'number' && good.value < 1 && good.authority === 'none' && bad.status === 'INVALID' && bad.authority === 'none';
  }
  if (exportName === 'rejectUnsigned') {
    const unsigned = fn({}) as { status?: string; authority?: string; accepted?: boolean };
    const signed = fn({ signature: 'present' }) as { status?: string; authority?: string; accepted?: boolean };
    return unsigned.status === 'UNSIGNED' && signed.status === 'SIGNED_STILL_NOT_AUTHORITY' && signed.accepted === false && signed.authority === 'none' && unsigned.authority === 'none';
  }
  return false;
}

export function verifyLifecycleBundle(parsed: unknown, now = Date.now()): TrustVerdict {
  if (typeof parsed === 'string') {
    return {
      ok: false,
      isolated_capability_development: false,
      production_ready: false,
      autonomous_operating_system: false,
      production_switch: false,
      production_blockers_resolved: false,
      inherited_state: false,
      used_self_reported_success: false,
      transitions: [],
      findings: ['BLOCKED: evidence seal must be checked before parsing.'],
    };
  }
  const findings: string[] = [];
  const transitions: Transition[] = [];
  const production_switch = productionIntegrationPermitted();
  if (production_switch !== false) findings.push('BLOCKED: production switch is not false.');
  const auth = AuthService.getInstance().authorize(null, 'deploy');
  if (auth.authorized) findings.push('BLOCKED: AuthService authorized a deployment.');
  // The production ceremony key is a committed public artifact. Its presence is
  // used only to distinguish sandbox operators; it is never treated as a live approval.
  const installedRootPem = readFileSync(new URL('../auth/installed-human-root.pub.pem', import.meta.url), 'utf8');
  const productionRootFingerprint = computeSha256(assertPublicEd25519(installedRootPem));

  const bundle = readRawBundle(parsed);
  if ('error' in bundle) {
    findings.push(bundle.error);
    return {
      ok: false,
      isolated_capability_development: false,
      production_ready: false,
      autonomous_operating_system: false,
      production_switch: false,
      production_blockers_resolved: false,
      inherited_state: false,
      used_self_reported_success: false,
      transitions,
      findings,
    };
  }

  const seenFingerprints = new Set<string>();
  const seenNonces = new Set<string>();
  const seenHashes = new Set<string>();
  for (const chain of bundle.chains) {
    const sourceHash = computeSha256(chain.source);
    const registryId = `cap_${computeSha256(chain.name.toLowerCase()).slice(0, 12)}`;
    let operator = '';
    try {
      operator = computeSha256(assertPublicEd25519(chain.publicKeyPem));
    } catch (error) {
      findings.push(error instanceof Error ? error.message : 'BLOCKED: operator key rejected.');
    }
    const candidateNonce = String(chain.candidate.claims.nonce ?? '');
    const integrationNonce = String(chain.integration.claims.nonce ?? '');
    const candidateIssued = Number(chain.candidate.claims.issued_at);
    const candidateExpires = Number(chain.candidate.claims.expires_at);
    const integrationIssued = Number(chain.integration.claims.issued_at);
    const integrationExpires = Number(chain.integration.claims.expires_at);
    const lifetimeValid = Number.isFinite(candidateIssued) && Number.isFinite(candidateExpires) && Number.isFinite(integrationIssued) && Number.isFinite(integrationExpires)
      && candidateIssued <= now && now < candidateExpires && integrationIssued <= now && now < integrationExpires
      && candidateExpires - candidateIssued <= 15 * 60 * 1000 && integrationExpires - integrationIssued <= 15 * 60 * 1000;
    const candidateAuth = `candidate:${candidateNonce}`;
    const integrationAuth = `integration:${integrationNonce}`;
    const note = (step: string, pass: boolean, detail: string, authorization: string) => {
      transitions.push({ chain: chain.name, step, source_sha256: sourceHash, registry_id: registryId, operator_fingerprint: operator, authorization, pass, detail });
      if (!pass) findings.push(`${chain.name} ${step}: ${detail}`);
    };

    note('DISCOVER', chain.candidate.claims.capability_id === registryId && chain.candidate.claims.version === 1, chain.candidate.claims.capability_id === registryId ? registryId : 'registry id is not derived from the capability name', 'none');
    let behavior = false;
    try {
      behavior = behaviorHolds(chain.exportName, loadSandbox(chain.source, chain.exportName));
    } catch (error) {
      behavior = false;
      note('BUILD', false, error instanceof Error ? error.message : 'sandbox rejected the source', 'none');
    }
    if (behavior) note('BUILD', true, 'sandbox behavior matched the source', 'none');
    else if (!transitions.some((item) => item.chain === chain.name && item.step === 'BUILD')) note('BUILD', false, 'sandbox behavior did not match the source', 'none');

    const signatureOk = operator !== '' && lifetimeValid && verifyClaims(chain.publicKeyPem, chain.candidate.claims, chain.candidate.signature) && verifyClaims(chain.publicKeyPem, chain.integration.claims, chain.integration.signature);
    const hashBound = chain.candidate.claims.content_sha256 === sourceHash && chain.integration.claims.content_sha256 === sourceHash && computeSha256(chain.statement) === chain.candidate.claims.statement_sha256 && computeSha256(chain.integrationStatement) === chain.integration.claims.statement_sha256;
    note('AUTHORIZE_CANDIDATE', signatureOk && hashBound && chain.candidate.claims.typ === 'solvex-sandbox-candidate-v1', signatureOk && hashBound ? candidateAuth : lifetimeValid ? 'candidate signature is not bound to this source hash' : 'candidate or integration signature has expired or has an invalid lifetime', candidateAuth);
    const separate = chain.candidate.signature !== chain.integration.signature && candidateNonce !== integrationNonce && chain.integration.claims.candidate_nonce === candidateNonce && chain.integration.claims.typ === 'solvex-sandbox-integration-v1' && chain.integration.claims.procedure === 'SANDBOX_INTEGRATION_REHEARSAL_V1' && chain.candidate.claims.environment === 'sandbox' && chain.integration.claims.environment === 'sandbox' && chain.candidate.claims.production === 'false' && chain.integration.claims.production === 'false' && chain.integration.claims.production_credentials === 'false';
    note('AUTHORIZE_INTEGRATION', signatureOk && hashBound && separate, separate ? integrationAuth : 'integration authorization is not a separate bound signature', integrationAuth);

    const execution = chain.execution;
    const expectedOrder = ['DISCOVER', 'BUILD', 'AUTHORIZE_CANDIDATE', 'AUTHORIZE_INTEGRATION', 'REGISTRY', 'INTEGRATE', 'FAILURE', 'RECOVER', 'REPLAY', 'HUMAN_BOUNDARY'];
    if (JSON.stringify(execution.transition_order) !== JSON.stringify(expectedOrder) || execution.observed_at !== candidateIssued) findings.push(`${chain.name}: recorded transition order or observation time is invalid.`);
    const registry = execution.registry ?? {};
    const sandbox = execution.sandbox ?? {};
    const recovery = sandbox.recovery ?? {};
    const integrationResult = sandbox.integration ?? {};
    const replayResult = sandbox.replay ?? {};
    const registryPass = registry.id === registryId && registry.version === 1 && registry.status_after_verification === 'APPROVAL_REQUIRED' && registry.evidence_sha256 === sourceHash && registry.executable === false && registry.production_deploy_attempted === true && registry.production_deploy_succeeded === false;
    note('REGISTRY', registryPass, 'recorded registry outputs do not match the expected fail-closed state', 'none');
    note('INTEGRATE', integrationResult.accepted === true && integrationResult.reported_hash === sourceHash && sandbox.artifact_after_integration === chain.source, 'recorded integration artifact does not match signed source bytes', integrationAuth);
    note('FAILURE', typeof sandbox.failure?.artifact === 'string' && computeSha256(sandbox.failure.artifact) !== sourceHash, 'recorded corruption artifact does not differ from the signed source', integrationAuth);
    note('RECOVER', recovery.restored === true && recovery.artifact === chain.source && computeSha256(recovery.artifact) === sourceHash, 'recorded recovery artifact does not match the signed source', integrationAuth);
    note('REPLAY', replayResult.accepted === false && replayResult.artifact_after_attempt === chain.source && /replay/i.test(text(replayResult.reason)), 'recorded replay was not rejected while preserving the recovered artifact', integrationAuth);
    note('HUMAN_BOUNDARY', operator !== productionRootFingerprint && !chain.publicKeyPem.includes('PRIVATE KEY') && Array.isArray(sandbox.production_switch_samples) && sandbox.production_switch_samples.length >= 4 && sandbox.production_switch_samples.every((value: unknown) => value === false), 'sandbox key or production-switch observations crossed the production boundary', 'production-human-root:none');
    if (seenFingerprints.has(operator) || seenNonces.has(integrationNonce) || seenHashes.has(sourceHash)) findings.push(`${chain.name}: inherited operator, nonce, or source hash.`);
    seenFingerprints.add(operator);
    seenNonces.add(integrationNonce);
    seenHashes.add(sourceHash);
  }

  if (bundle.chains.length >= 2) {
    const [left, right] = bundle.chains;
    const cross = bundle.cross_chain;
    const crossPass = cross.source_sha256 === computeSha256(left.source) && cross.target_source_sha256 === computeSha256(right.source) && cross.accepted === false && typeof cross.reason === 'string' && /hash|artifact/i.test(cross.reason) && cross.artifact_after_attempt === null;
    transitions.push({
      chain: right.name,
      step: 'NO_INHERITED_SOURCE',
      source_sha256: computeSha256(left.source),
      registry_id: `cap_${computeSha256(right.name.toLowerCase()).slice(0, 12)}`,
      operator_fingerprint: computeSha256(assertPublicEd25519(right.publicKeyPem)),
      authorization: `integration:${String(right.integration.claims.nonce ?? '')}`,
      pass: crossPass,
      detail: text(cross.reason),
    });
    if (!crossPass) findings.push('recorded cross-chain attempt does not prove source isolation');
  }

  const chainStepsOk = transitions.every((item) => item.pass);
  return {
    ok: findings.length === 0 && chainStepsOk && production_switch === false,
    isolated_capability_development: findings.length === 0 && chainStepsOk,
    production_ready: false,
    autonomous_operating_system: false,
    production_switch: false,
    production_blockers_resolved: false,
    inherited_state: findings.some((item) => item.includes('inherited')),
    used_self_reported_success: false,
    transitions,
    findings,
  };
}

if (process.argv[1]?.includes('lifecycleVerifier.ts')) {
  const { writeFileSync } = await import('node:fs');
  const parsed = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const verdict = verifyLifecycleBundle(parsed);
  writeFileSync('/workspace/artifacts/lifecycle-trust-boundary.json', JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify({ ok: verdict.ok, findings: verdict.findings, transitions: verdict.transitions.length }));
  process.exit(verdict.ok ? 0 : 1);
}
