import { readFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { assertPublicEd25519 } from '../auth/installHumanRoot';
import { verifyClaims } from '../auth/VerifiedHumanSession';
import { AuthService } from '../auth/AuthService';
import { HumanApprovalGate, productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { SandboxRehearsal } from '../governance/sandboxIntegrationRehearsal';
import { CapabilityRegistry } from './CapabilityRegistry';
import { loadSandbox } from './independentLifecycle';

export const INDEPENDENT_VERIFIER_VERSION = 'lifecycle-verifier-independent-2';

export interface IndependentVerdict {
  ok: boolean;
  findings: string[];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function behavior(exportName: string, source: string): boolean {
  const fn = loadSandbox(source, exportName);
  if (exportName === 'boundDistance') {
    const good = fn({ distance: 16, epsilon: 1 }) as { status?: string; authority?: string; value?: number };
    const bad = fn(null) as { status?: string; authority?: string };
    return good.status === 'BOUNDED' && typeof good.value === 'number' && good.value < 1 && good.authority === 'none' && bad.status === 'INVALID';
  }
  if (exportName === 'rejectUnsigned') {
    const unsigned = fn({}) as { status?: string; accepted?: boolean; authority?: string };
    const signed = fn({ signature: 'present' }) as { status?: string; accepted?: boolean; authority?: string };
    return unsigned.status === 'UNSIGNED' && signed.accepted === false && signed.authority === 'none' && signed.status === 'SIGNED_STILL_NOT_AUTHORITY';
  }
  return false;
}

/** A separate verdict function. It does not call the primary verifier. */
export function verifyLifecycleIndependently(parsed: unknown, now = Date.now()): IndependentVerdict {
  const findings: string[] = [];
  if (typeof parsed === 'string') return { ok: false, findings: ['BLOCKED: evidence seal must be checked before parsing.'] };
  if (productionIntegrationPermitted() !== false) findings.push('BLOCKED: production switch is not false.');
  if (AuthService.getInstance().authorize(null, 'deploy').authorized) findings.push('BLOCKED: AuthService authorized a deployment.');
  // Read the committed production public key only to reject its reuse as a
  // sandbox operator identity. This is not a live authorization check.
  const installedRootPem = readFileSync(new URL('../auth/installed-human-root.pub.pem', import.meta.url), 'utf8');
  const productionRootFingerprint = computeSha256(assertPublicEd25519(installedRootPem));
  if (!parsed || typeof parsed !== 'object' || (parsed as { schema?: unknown }).schema !== 'SOLVEX_LIFECYCLE_RAW_V1') {
    findings.push('BLOCKED: evidence schema is not a raw lifecycle bundle.');
    return { ok: false, findings };
  }
  const record = parsed as { chains?: unknown; transitions?: unknown };
  const chains = Array.isArray(record.chains) ? record.chains : [];
  if (chains.length === 0) return { ok: false, findings: [...findings, 'BLOCKED: evidence has no raw chains.'] };
  const canonical = ['DISCOVER', 'BUILD', 'AUTHORIZE_CANDIDATE', 'AUTHORIZE_INTEGRATION', 'REGISTRY', 'INTEGRATE', 'FAILURE', 'RECOVER', 'REPLAY', 'HUMAN_BOUNDARY'];
  if ('transitions' in record) {
    const actual = Array.isArray(record.transitions) ? record.transitions.map((item) => text((item as { step?: unknown })?.step)) : [];
    const expected = chains.flatMap(() => canonical).concat(chains.length >= 2 ? ['NO_INHERITED_SOURCE'] : []);
    if (actual.join('\n') !== expected.join('\n')) findings.push('BLOCKED: transitions are reordered or incomplete.');
  }
  const seen = new Set<string>();
  for (const item of chains) {
    const row = item as Record<string, unknown>;
    const source = text(row.source);
    const candidate = row.candidate as { claims?: Record<string, string | number>; signature?: string } | undefined;
    const integration = row.integration as { claims?: Record<string, string | number>; signature?: string } | undefined;
    if (!source || !candidate?.claims || !candidate.signature || !integration?.claims || !integration.signature || !text(row.publicKeyPem)) {
      findings.push('BLOCKED: chain is missing source, operator key, or authorization signatures. A stored hash is not evidence.');
      continue;
    }
    if ('recovered_artifact' in row && computeSha256(text(row.recovered_artifact)) !== computeSha256(source)) {
      findings.push('BLOCKED: recovery artifact does not match the source hash.');
      continue;
    }
    const registryId = `cap_${computeSha256(text(row.name).toLowerCase()).slice(0, 12)}`;
    const sourceHash = computeSha256(source);
    let fingerprint = '';
    try {
      fingerprint = computeSha256(assertPublicEd25519(text(row.publicKeyPem)));
    } catch (error) {
      findings.push(error instanceof Error ? error.message : 'BLOCKED: operator key rejected.');
      continue;
    }
    const key = `${fingerprint}:${String(integration.claims.nonce)}:${sourceHash}`;
    if (seen.has(key)) findings.push(`${text(row.name)}: inherited operator, nonce, or source hash.`);
    seen.add(key);
    if (computeSha256(text(row.statement)) !== candidate.claims.statement_sha256 || computeSha256(text(row.integrationStatement)) !== integration.claims.statement_sha256) {
      findings.push(`${text(row.name)} AUTHORIZE_CANDIDATE: statement hash is not bound`);
    }
    const signedHash = candidate.claims.content_sha256 === sourceHash && integration.claims.content_sha256 === sourceHash;
    const signatureOk = verifyClaims(text(row.publicKeyPem), candidate.claims, candidate.signature) && verifyClaims(text(row.publicKeyPem), integration.claims, integration.signature);
    if (candidate.claims.capability_id !== registryId || candidate.claims.version !== 1) findings.push(`${text(row.name)} DISCOVER: registry id is not derived from the capability name`);
    if (!signatureOk || !signedHash || candidate.claims.typ !== 'solvex-sandbox-candidate-v1') findings.push(`${text(row.name)} AUTHORIZE_CANDIDATE: candidate signature is not bound to this source hash`);
    if (candidate.signature === integration.signature || candidate.claims.nonce === integration.claims.nonce || integration.claims.candidate_nonce !== candidate.claims.nonce || integration.claims.production !== 'false') {
      findings.push(`${text(row.name)} AUTHORIZE_INTEGRATION: integration authorization is not a separate bound signature`);
    }
    let ran = false;
    try { ran = behavior(text(row.exportName), source); } catch { ran = false; }
    if (!ran) findings.push(`${text(row.name)} BUILD: sandbox behavior did not match the source`);
    const registry = new CapabilityRegistry(new HumanApprovalGate());
    const proposed = registry.propose(text(row.name), 'independent verifier');
    const marked = registry.markVerified(proposed.id, sourceHash);
    const production = registry.deploy(proposed.id, null, now);
    if (proposed.id !== registryId || marked.ok !== true || production.deployed !== false) findings.push(`${text(row.name)} REGISTRY: production deploy occurred`);
    const slot = new SandboxRehearsal(text(row.publicKeyPem));
    const deployed = slot.deploy({ source, candidate: { claims: candidate.claims, signature: candidate.signature }, integration: { claims: integration.claims, signature: integration.signature }, now });
    if (!deployed.ok || slot.hash() !== sourceHash) findings.push(`${text(row.name)} INTEGRATE: ${deployed.reason}`);
    slot.corrupt();
    if (slot.hash() === sourceHash) findings.push(`${text(row.name)} FAILURE: corruption was not detected`);
    if (!slot.rollback() || slot.hash() !== sourceHash) findings.push(`${text(row.name)} RECOVER: recovered hash does not match the source`);
    if (slot.deploy({ source, candidate: { claims: candidate.claims, signature: candidate.signature }, integration: { claims: integration.claims, signature: integration.signature }, now }).ok) findings.push(`${text(row.name)} REPLAY: duplicate approval was accepted`);
    const gate = new HumanApprovalGate(text(row.publicKeyPem));
    const rejected = gate.submitSignedApproval(candidate as never, integration as never, now);
    if (rejected.status !== 'BLOCKED' || fingerprint === productionRootFingerprint || text(row.publicKeyPem).includes('PRIVATE KEY')) findings.push(`${text(row.name)} HUMAN_BOUNDARY: sandbox token was treated as production authority`);
  }
  if (chains.length >= 2) {
    const left = chains[0] as { source?: string };
    const right = chains[1] as { publicKeyPem?: string; candidate?: { claims: Record<string, string | number>; signature: string }; integration?: { claims: Record<string, string | number>; signature: string } };
    if (right.candidate && right.integration && right.publicKeyPem && left.source) {
      const crossed = new SandboxRehearsal(right.publicKeyPem).deploy({ source: left.source, candidate: right.candidate, integration: right.integration, now });
      if (crossed.ok) findings.push('second authorization accepted the first candidate source');
    }
  }
  return { ok: findings.length === 0, findings };
}
