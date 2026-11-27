import {
  ConsensusCertificate,
  policyDigest,
  proposalDigest,
  sha256Canonical,
  verifyUnanimousConsensus
} from './IndependentUnanimousConsensus';
import { loadTrustedConsensusPolicy } from './DaisyConsensusConfig';

export interface DaisyActivationEvidenceBinding {
  source_commit_sha: string;
  verification_root_sha256: string;
  run_evidence_sha256: string;
}

export interface DaisyConsensusCertificateVerification {
  valid: boolean;
  reason: string;
}

const SHA256 = /^[a-f0-9]{64}$/;

export function verifyDaisyConsensusCertificate(
  record: DaisyActivationEvidenceBinding,
  certificate: ConsensusCertificate | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
  now: number = Date.now()
): DaisyConsensusCertificateVerification {
  try {
    if (!certificate) return { valid: false, reason: 'CONSENSUS_CERTIFICATE_MISSING' };
    if (certificate.protocol !== 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1') {
      return { valid: false, reason: 'CONSENSUS_PROTOCOL_INVALID' };
    }

    const { certificate_sha256, ...body } = certificate;
    if (!SHA256.test(certificate_sha256) || sha256Canonical(body) !== certificate_sha256) {
      return { valid: false, reason: 'CONSENSUS_CERTIFICATE_HASH_INVALID' };
    }

    const config = loadTrustedConsensusPolicy(env);
    const proposal = certificate.proposal;
    if (proposal.action !== 'AUTHORIZE_DAISY_PRODUCTION' ||
        proposal.target !== 'SOLVEX_DAISY_PRODUCTION' ||
        proposal.evidence_sha256 !== record.run_evidence_sha256 ||
        proposal.payload_sha256 !== sha256Canonical({
          source_commit_sha: record.source_commit_sha,
          verification_root_sha256: record.verification_root_sha256
        }) ||
        !SHA256.test(proposal.rollback_plan_sha256 || '') ||
        !config.policy.require_rollback_plan) {
      return { valid: false, reason: 'CONSENSUS_PROPOSAL_NOT_BOUND_TO_ACTIVATION_EVIDENCE' };
    }

    const expectedPolicySha = policyDigest(config.policy);
    const expectedProposalSha = proposalDigest(proposal);
    const expectedInputBundleSha = sha256Canonical({
      proposal: expectedProposalSha,
      policy: expectedPolicySha,
      evidence: proposal.evidence_sha256
    });
    if (certificate.policy_sha256 !== expectedPolicySha ||
        certificate.input_bundle_sha256 !== expectedInputBundleSha) {
      return { valid: false, reason: 'CONSENSUS_POLICY_OR_INPUT_BINDING_MISMATCH' };
    }

    const generatedAt = Date.parse(certificate.generated_at);
    const latestVoteAt = Math.max(...certificate.votes.map(vote => Date.parse(vote.signed_at)));
    if (!Number.isFinite(generatedAt) || generatedAt > now ||
        generatedAt < latestVoteAt || now - generatedAt > 10 * 60 * 1000) {
      return { valid: false, reason: 'CONSENSUS_CERTIFICATE_TIME_WINDOW_INVALID' };
    }

    const verified = verifyUnanimousConsensus({
      proposal,
      policy: config.policy,
      evaluators: config.evaluators,
      votes: certificate.votes,
      expectedInputBundleSha256: expectedInputBundleSha,
      now
    });
    if (verified.status !== 'APPROVED' || verified.proposal_sha256 !== expectedProposalSha ||
        verified.policy_sha256 !== expectedPolicySha) {
      return { valid: false, reason: 'CONSENSUS_NOT_UNANIMOUS:' + verified.blockers.join(',') };
    }

    return { valid: true, reason: 'THREE_DISTINCT_MODELS_UNANIMOUSLY_APPROVED' };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : 'CONSENSUS_CERTIFICATE_VERIFICATION_FAILED'
    };
  }
}
