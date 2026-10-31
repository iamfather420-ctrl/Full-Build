import { computeSha256 } from '../database/DatabaseSchema';
import { assertPublicEd25519 } from '../auth/installHumanRoot';

export interface HumanRootEvidence {
  schema: string;
  candidate: { name: string; id: string; version: number; sha256: string };
  public_key_fingerprint: string;
  approval_id: string;
  statement_sha256: string;
  verified_before_use: boolean;
  expires_at: number;
  revoked: boolean;
  deployed: boolean;
  production_integration: string;
  private_key_deleted: boolean;
}

export interface EvidenceValidation {
  ok: boolean;
  evidence_sha256: string;
  fingerprint_matches: boolean;
  source_matches: boolean;
  statement_matches: boolean;
  candidate_id_matches: boolean;
  deployed: false;
  live_signature: 'NOT_RETAINED';
  live_authorization: false;
  findings: string[];
}

/** Recomputes the preserved record. A matching fingerprint is not a live signature. */
export function validateHumanRootEvidence(input: {
  evidence: HumanRootEvidence;
  evidenceBytes: string;
  publicKeyPem: string;
  source: string;
  statement: string;
  now: number;
}): EvidenceValidation {
  const findings: string[] = [];
  const evidence_sha256 = computeSha256(input.evidenceBytes);
  let fingerprint_matches = false;
  try {
    const pem = assertPublicEd25519(input.publicKeyPem);
    fingerprint_matches = computeSha256(pem) === input.evidence.public_key_fingerprint;
  } catch (error) {
    findings.push(error instanceof Error ? error.message : 'BLOCKED: public key rejected.');
  }
  if (!fingerprint_matches) findings.push('BLOCKED: installed public key fingerprint does not match the evidence.');
  const sourceHash = computeSha256(input.source);
  const source_matches = sourceHash === input.evidence.candidate.sha256;
  if (!source_matches) findings.push('BLOCKED: candidate source hash does not match the evidence.');
  const expectedId = `cap_${computeSha256(input.evidence.candidate.name).slice(0, 12)}`;
  const candidate_id_matches = input.evidence.candidate.id === expectedId && input.evidence.candidate.version === 1;
  if (!candidate_id_matches) findings.push('BLOCKED: candidate id or version does not match.');
  const statement_matches = computeSha256(input.statement) === input.evidence.statement_sha256;
  if (!statement_matches) findings.push('BLOCKED: approval statement hash does not match.');
  if (input.evidence.deployed !== false) findings.push('BLOCKED: evidence claims a deployment.');
  if (input.evidence.production_integration !== 'REMAIN_CLOSED') findings.push('BLOCKED: evidence does not keep production integration closed.');
  if (input.evidence.private_key_deleted !== true) findings.push('BLOCKED: evidence does not confirm the private key was deleted.');
  if (input.evidence.schema !== 'SOLVEX_HUMAN_OWNER_APPROVAL_EVIDENCE_V1') findings.push('BLOCKED: evidence schema is not recognized.');
  if (!input.evidence.approval_id) findings.push('BLOCKED: approval id is missing.');
  if (input.now >= input.evidence.expires_at) findings.push('Historical credential is past its expiry. It is not a live authorization.');
  findings.push('Signed session and approval tokens were not retained. The private key was destroyed. This record cannot be re-authorized.');
  return {
    ok: fingerprint_matches && source_matches && statement_matches && candidate_id_matches && input.evidence.deployed === false,
    evidence_sha256,
    fingerprint_matches,
    source_matches,
    statement_matches,
    candidate_id_matches,
    deployed: false,
    live_signature: 'NOT_RETAINED',
    live_authorization: false,
    findings,
  };
}
