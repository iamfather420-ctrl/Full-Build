import { readFileSync } from 'node:fs';
import { productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { loadSealedEvidence, sealEvidence } from '../governance/sealedEvidence';
import { VERIFIER_VERSION, verifyLifecycleBundle, type TrustVerdict } from './lifecycleVerifier';
import { INDEPENDENT_VERIFIER_VERSION, verifyLifecycleIndependently } from './lifecycleVerifierIndependent';

export const VERIFIER_SOURCE = '/workspace/vendor/solvex/capabilities/lifecycleVerifier.ts';
export const INDEPENDENT_VERIFIER_SOURCE = '/workspace/vendor/solvex/capabilities/lifecycleVerifierIndependent.ts';

export interface LifecycleAcceptance {
  accepted: boolean;
  reason: string;
  verdict: TrustVerdict | null;
  verifier_version: string | null;
  verifier_source_sha256: string | null;
  independent_verifier_version: string | null;
  independent_verifier_source_sha256: string | null;
  evidence_sha256: string | null;
  evidence_parsed: boolean;
  production_authority: false;
}

export interface AcceptanceRecord {
  schema: 'SOLVEX_LIFECYCLE_ACCEPTANCE_V1';
  evidence_version: string;
  evidence_sha256: string;
  verifier_version: string;
  verifier_source_sha256: string;
  independent_verifier_version: string;
  independent_verifier_source_sha256: string;
  production_authority: false;
}

function refused(reason: string, extra: Partial<LifecycleAcceptance> = {}): LifecycleAcceptance {
  return {
    accepted: false,
    reason,
    verdict: extra.verdict ?? null,
    verifier_version: extra.verifier_version ?? null,
    verifier_source_sha256: extra.verifier_source_sha256 ?? null,
    independent_verifier_version: extra.independent_verifier_version ?? null,
    independent_verifier_source_sha256: extra.independent_verifier_source_sha256 ?? null,
    evidence_sha256: extra.evidence_sha256 ?? null,
    evidence_parsed: extra.evidence_parsed ?? false,
    production_authority: false,
  };
}

export function verdictsPermitAcceptance(primaryOk: boolean, independentOk: boolean): string | null {
  if (primaryOk !== independentOk) return 'BLOCKED: verifier implementations disagree.';
  if (!primaryOk) return 'BLOCKED: verifier rejected the sealed lifecycle.';
  return null;
}

/** Parsed objects can be diagnosed. They cannot be accepted. */
export function acceptRecursiveLifecycle(raw: unknown): LifecycleAcceptance {
  if (raw == null) return refused('BLOCKED: a recursive lifecycle has no raw bundle for the independent verifier.');
  const verdict = verifyLifecycleBundle(raw);
  const second = verifyLifecycleIndependently(raw);
  if (verdict.ok !== second.ok) return refused('BLOCKED: verifier implementations disagree.', { verdict, evidence_parsed: false });
  if (!verdict.ok || verdict.production_ready !== false) return refused(verdict.findings[0] ?? 'BLOCKED: independent verifier rejected the lifecycle bundle.', { verdict });
  return refused('BLOCKED: evidence seal must be checked before parsing.', { verdict, verifier_version: VERIFIER_VERSION });
}

/**
 * Checks the evidence seal, then the pinned verifier version, and only then parses.
 * A different verifier version cannot reinterpret an existing acceptance record.
 */
export function acceptSealedLifecycle(evidenceVersion: string, options?: { claimedVerifierVersion?: string }): LifecycleAcceptance {
  if (productionIntegrationPermitted() !== false) return refused('BLOCKED: production switch is not false.');
  let evidence;
  let verifier;
  let independent;
  try {
    evidence = loadSealedEvidence(evidenceVersion);
    verifier = loadSealedEvidence(VERIFIER_VERSION);
    independent = loadSealedEvidence(INDEPENDENT_VERIFIER_VERSION);
  } catch (error) {
    return refused(error instanceof Error ? error.message : 'BLOCKED: sealed evidence could not be loaded.');
  }
  if (!verifier.bytes.equals(readFileSync(VERIFIER_SOURCE))) return refused('BLOCKED: verifier source does not match its seal.');
  if (!independent.bytes.equals(readFileSync(INDEPENDENT_VERIFIER_SOURCE))) return refused('BLOCKED: independent verifier source does not match its seal.');
  const claimed = options?.claimedVerifierVersion ?? VERIFIER_VERSION;
  const recordVersion = `acceptance-${evidenceVersion}`;
  let prior: AcceptanceRecord | null = null;
  try {
    prior = JSON.parse(loadSealedEvidence(recordVersion).bytes.toString('utf8')) as AcceptanceRecord;
  } catch {
    prior = null;
  }
  if (claimed !== VERIFIER_VERSION || (prior && (prior.verifier_version !== claimed || prior.verifier_source_sha256 !== verifier.seal.sha256 || prior.evidence_sha256 !== evidence.seal.sha256))) {
    return refused(`BLOCKED: verifier ${claimed} cannot reinterpret evidence accepted under ${prior?.verifier_version ?? VERIFIER_VERSION}.`, {
      verifier_version: prior?.verifier_version ?? VERIFIER_VERSION,
      verifier_source_sha256: prior?.verifier_source_sha256 ?? verifier.seal.sha256,
      evidence_sha256: evidence.seal.sha256,
      evidence_parsed: false,
    });
  }
  const parsed = JSON.parse(evidence.bytes.toString('utf8')) as unknown;
  const verdict = verifyLifecycleBundle(parsed);
  const second = verifyLifecycleIndependently(parsed);
  const disagreement = verdictsPermitAcceptance(verdict.ok, second.ok);
  if (disagreement) {
    return refused(disagreement, { verdict, evidence_sha256: evidence.seal.sha256, evidence_parsed: true, verifier_version: VERIFIER_VERSION, verifier_source_sha256: verifier.seal.sha256 });
  }
  if (!verdict.ok || verdict.production_ready !== false || verdict.autonomous_operating_system !== false) {
    return refused(verdict.findings[0] ?? 'BLOCKED: verifier rejected the sealed lifecycle.', { verdict, evidence_sha256: evidence.seal.sha256, evidence_parsed: true, verifier_version: VERIFIER_VERSION, verifier_source_sha256: verifier.seal.sha256 });
  }
  const record: AcceptanceRecord = {
    schema: 'SOLVEX_LIFECYCLE_ACCEPTANCE_V1',
    evidence_version: evidenceVersion,
    evidence_sha256: evidence.seal.sha256,
    verifier_version: VERIFIER_VERSION,
    verifier_source_sha256: verifier.seal.sha256,
    independent_verifier_version: INDEPENDENT_VERIFIER_VERSION,
    independent_verifier_source_sha256: independent.seal.sha256,
    production_authority: false,
  };
  if (!prior) sealEvidence(recordVersion, Buffer.from(JSON.stringify(record, null, 2)));
  return {
    accepted: true,
    reason: `Accepted under ${VERIFIER_VERSION}. Production authority was not granted.`,
    verdict,
    verifier_version: VERIFIER_VERSION,
    verifier_source_sha256: verifier.seal.sha256,
    independent_verifier_version: INDEPENDENT_VERIFIER_VERSION,
    independent_verifier_source_sha256: independent.seal.sha256,
    evidence_sha256: evidence.seal.sha256,
    evidence_parsed: true,
    production_authority: false,
  };
}
