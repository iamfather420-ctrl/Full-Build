import { readFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { assertPublicEd25519 } from '../auth/installHumanRoot';
import { verifyClaims } from '../auth/VerifiedHumanSession';
import { AuthService } from '../auth/AuthService';
import { HumanApprovalGate, productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { disposeBlockedGates } from '../governance/gateDisposition';
import { SandboxRehearsal } from '../governance/sandboxIntegrationRehearsal';
import { CapabilityRegistry } from './CapabilityRegistry';
import { loadSandbox } from './independentLifecycle';

export const VERIFIER_VERSION = 'lifecycle-verifier-1';

export interface RawChain {
  name: string;
  source: string;
  exportName: string;
  statement: string;
  integrationStatement: string;
  publicKeyPem: string;
  candidate: { claims: Record<string, string | number>; signature: string };
  integration: { claims: Record<string, string | number>; signature: string };
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
export function readRawBundle(parsed: unknown): { chains: RawChain[] } | { error: string } {
  if (!parsed || typeof parsed !== 'object') return { error: 'BLOCKED: evidence is not an object.' };
  const record = parsed as { schema?: unknown; chains?: unknown; transitions?: unknown };
  if (record.schema !== 'SOLVEX_LIFECYCLE_RAW_V1') return { error: 'BLOCKED: evidence schema is not a raw lifecycle bundle.' };
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
    if (!candidate || !integration || !text(row.source) || !text(row.publicKeyPem)) {
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
    });
  }
  const canonical = ['DISCOVER', 'BUILD', 'AUTHORIZE_CANDIDATE', 'AUTHORIZE_INTEGRATION', 'REGISTRY', 'INTEGRATE', 'FAILURE', 'RECOVER', 'REPLAY', 'HUMAN_BOUNDARY'];
  if ('transitions' in record) {
    if (!Array.isArray(record.transitions)) return { error: 'BLOCKED: transitions are reordered or incomplete.' };
    const expected = raw.flatMap((_, index) => canonical).concat(raw.length >= 2 ? ['NO_INHERITED_SOURCE'] : []);
    const actual = record.transitions.map((item) => (item && typeof item === 'object' ? text((item as { step?: unknown }).step) : ''));
    if (actual.join('\n') !== expected.join('\n')) return { error: 'BLOCKED: transitions are reordered or incomplete.' };
  }
  return { chains: raw };
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
  const expired = JSON.parse(readFileSync('/workspace/artifacts/human-owner-approval.json', 'utf8')) as { approval_id: string; public_key_fingerprint: string; expires_at: number };
  const gates = JSON.parse(readFileSync('/workspace/artifacts/gates46-rerun.json', 'utf8')) as { overall_verdict: string; non_passed: Array<{ id: string; status: string; name: string }> };
  const disposition = disposeBlockedGates(gates.non_passed.map((gate) => ({ id: gate.id, status: gate.status, name: gate.name })));
  if (!disposition.ok || gates.overall_verdict !== 'BLOCKED') findings.push('BLOCKED: governance gate blockers are not still retained.');
  if (now < expired.expires_at) findings.push('BLOCKED: expired approval record is still inside its lifetime.');

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

    const signatureOk = operator !== '' && verifyClaims(chain.publicKeyPem, chain.candidate.claims, chain.candidate.signature) && verifyClaims(chain.publicKeyPem, chain.integration.claims, chain.integration.signature);
    const hashBound = chain.candidate.claims.content_sha256 === sourceHash && chain.integration.claims.content_sha256 === sourceHash && computeSha256(chain.statement) === chain.candidate.claims.statement_sha256 && computeSha256(chain.integrationStatement) === chain.integration.claims.statement_sha256;
    note('AUTHORIZE_CANDIDATE', signatureOk && hashBound && chain.candidate.claims.typ === 'solvex-sandbox-candidate-v1', signatureOk && hashBound ? candidateAuth : 'candidate signature is not bound to this source hash', candidateAuth);
    const separate = chain.candidate.signature !== chain.integration.signature && candidateNonce !== integrationNonce && chain.integration.claims.candidate_nonce === candidateNonce && chain.integration.claims.typ === 'solvex-sandbox-integration-v1' && chain.integration.claims.production === 'false';
    note('AUTHORIZE_INTEGRATION', signatureOk && hashBound && separate, separate ? integrationAuth : 'integration authorization is not a separate bound signature', integrationAuth);

    const registry = new CapabilityRegistry(new HumanApprovalGate());
    const proposed = registry.propose(chain.name, 'independent verification');
    const marked = registry.markVerified(proposed.id, sourceHash);
    const production = registry.deploy(proposed.id, null, now);
    note('REGISTRY', proposed.id === registryId && marked.ok === true && marked.ok && marked.record.evidence_sha256 === sourceHash && marked.record.executable === false && production.deployed === false && registry.get(proposed.id)?.status === 'APPROVAL_REQUIRED', production.deployed ? 'production deploy occurred' : production.reason, 'none');

    const slot = new SandboxRehearsal(chain.publicKeyPem);
    const deployed = slot.deploy({ source: chain.source, candidate: chain.candidate, integration: chain.integration, now });
    note('INTEGRATE', deployed.ok === true && deployed.hash === sourceHash && slot.hash() === sourceHash, deployed.reason, integrationAuth);
    slot.corrupt();
    const corrupted = slot.hash();
    note('FAILURE', corrupted !== sourceHash, corrupted ?? 'missing', integrationAuth);
    const restored = slot.rollback();
    note('RECOVER', restored === true && slot.hash() === sourceHash, slot.hash() ?? 'missing', integrationAuth);
    const replay = slot.deploy({ source: chain.source, candidate: chain.candidate, integration: chain.integration, now });
    note('REPLAY', replay.ok === false && slot.hash() === sourceHash, replay.reason, integrationAuth);
    const gate = new HumanApprovalGate(chain.publicKeyPem);
    const rejected = gate.submitSignedApproval(chain.candidate as never, chain.integration as never, now);
    note('HUMAN_BOUNDARY', rejected.status === 'BLOCKED' && gate.count() === 0 && operator !== expired.public_key_fingerprint && !JSON.stringify(chain).includes(expired.approval_id), rejected.reason, 'production-human-root:none');

    if (seenFingerprints.has(operator) || seenNonces.has(integrationNonce) || seenHashes.has(sourceHash)) findings.push(`${chain.name}: inherited operator, nonce, or source hash.`);
    seenFingerprints.add(operator);
    seenNonces.add(integrationNonce);
    seenHashes.add(sourceHash);
    if (!slot.switchRemainedFalse()) findings.push(`${chain.name}: production switch changed during sandbox rehearsal.`);
  }

  if (bundle.chains.length >= 2) {
    const [left, right] = bundle.chains;
    const crossed = new SandboxRehearsal(right.publicKeyPem).deploy({ source: left.source, candidate: right.candidate, integration: right.integration, now });
    const crossPass = crossed.ok === false;
    transitions.push({
      chain: right.name,
      step: 'NO_INHERITED_SOURCE',
      source_sha256: computeSha256(left.source),
      registry_id: `cap_${computeSha256(right.name.toLowerCase()).slice(0, 12)}`,
      operator_fingerprint: computeSha256(assertPublicEd25519(right.publicKeyPem)),
      authorization: `integration:${String(right.integration.claims.nonce ?? '')}`,
      pass: crossPass,
      detail: crossed.reason,
    });
    if (!crossPass) findings.push('second authorization accepted the first candidate source');
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
