import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

export type ConsensusDecision = 'APPROVE' | 'DENY';
export type ConsensusStatus = 'APPROVED' | 'BLOCKED';

export interface ConsensusProposal {
  proposal_id: string;
  action: string;
  target: string;
  created_at: string;
  nonce: string;
  payload_sha256: string;
  evidence_sha256: string;
  rollback_plan_sha256?: string;
}

export interface ConsensusPolicy {
  policy_id: string;
  version: string;
  valid_from: string;
  expires_at: string;
  max_proposal_age_ms: number;
  max_vote_age_ms: number;
  allowed_actions: string[];
  allowed_targets: string[];
  require_rollback_plan: boolean;
  evaluator_ids: readonly [string, string, string];
}

export interface EvaluatorIdentity {
  evaluator_id: string;
  public_key_pem: string;
}

export interface SignedEvaluatorVote {
  evaluator_id: string;
  decision: ConsensusDecision;
  proposal_sha256: string;
  policy_sha256: string;
  evidence_sha256: string;
  nonce: string;
  input_bundle_sha256: string;
  independence_attestation: 'ISOLATED_INPUT_ONLY';
  signed_at: string;
  signature_base64: string;
}

export interface ConsensusResult {
  status: ConsensusStatus;
  required_approvals: 3;
  valid_approvals: number;
  valid_denials: number;
  proposal_sha256: string;
  policy_sha256: string;
  blockers: string[];
}

/** Canonical JSON for deterministic hashes and signature payloads. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('NON_CANONICAL_NUMBER');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(item => canonicalJson(item)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return '{' + keys.map(key => {
      if (record[key] === undefined) throw new Error('UNDEFINED_CANONICAL_VALUE');
      return JSON.stringify(key) + ':' + canonicalJson(record[key]);
    }).join(',') + '}';
  }
  throw new Error('UNSUPPORTED_CANONICAL_VALUE');
}

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function proposalDigest(proposal: ConsensusProposal): string {
  return sha256Canonical(proposal);
}

export function policyDigest(policy: ConsensusPolicy): string {
  return sha256Canonical(policy);
}

/** The signature covers every vote field except signature_base64. */
export function voteSigningPayload(vote: Omit<SignedEvaluatorVote, 'signature_base64'>): Buffer {
  return Buffer.from(canonicalJson({
    ...vote,
    protocol: 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1'
  }), 'utf8');
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function validIsoTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Verify a 3-of-3 authorization decision. This function never executes an action.
 * The policy and evaluator roster must come from trusted, read-only configuration.
 */
export function verifyUnanimousConsensus(args: {
  proposal: ConsensusProposal;
  policy: ConsensusPolicy;
  evaluators: readonly EvaluatorIdentity[];
  votes: readonly SignedEvaluatorVote[];
  expectedInputBundleSha256: string;
  now?: number;
}): ConsensusResult {
  const { proposal, policy, evaluators, votes } = args;
  const now = args.now ?? Date.now();
  const proposalSha = proposalDigest(proposal);
  const policySha = policyDigest(policy);
  const blockers: string[] = [];
  let validApprovals = 0;
  let validDenials = 0;

  if (!Number.isFinite(now)) blockers.push('INVALID_VERIFIER_CLOCK');
  if (!proposal.proposal_id?.trim() || !proposal.nonce?.trim()) blockers.push('MISSING_PROPOSAL_ID_OR_NONCE');
  if (!isSha256(proposal.payload_sha256) || !isSha256(proposal.evidence_sha256)) blockers.push('INVALID_PROPOSAL_OR_EVIDENCE_HASH');
  if (policy.evaluator_ids.length !== 3 || new Set(policy.evaluator_ids).size !== 3) blockers.push('POLICY_MUST_PIN_THREE_DISTINCT_EVALUATORS');
  if (evaluators.length !== 3 || new Set(evaluators.map(item => item.evaluator_id)).size !== 3) blockers.push('TRUSTED_ROSTER_MUST_CONTAIN_THREE_DISTINCT_EVALUATORS');
  if (votes.length !== 3 || new Set(votes.map(vote => vote.evaluator_id)).size !== 3) blockers.push('EXACTLY_THREE_DISTINCT_VOTES_REQUIRED');

  const rosterIds = new Set(evaluators.map(item => item.evaluator_id));
  if (policy.evaluator_ids.some(id => !rosterIds.has(id))) blockers.push('POLICY_EVALUATOR_NOT_IN_TRUSTED_ROSTER');
  if (evaluators.some(item => !item.evaluator_id?.trim() || !item.public_key_pem?.includes('PUBLIC KEY'))) blockers.push('INVALID_TRUSTED_EVALUATOR_IDENTITY');
  const keyFingerprints = evaluators.map(item => {
    try {
      return createHash('sha256').update(createPublicKey(item.public_key_pem).export({ type: 'spki', format: 'der' })).digest('hex');
    } catch {
      return null;
    }
  });
  if (keyFingerprints.some(value => value === null) || new Set(keyFingerprints).size !== 3) {
    blockers.push('THREE_DISTINCT_VALID_EVALUATOR_KEYS_REQUIRED');
  }

  const policyStart = validIsoTime(policy.valid_from);
  const policyEnd = validIsoTime(policy.expires_at);
  const proposalTime = validIsoTime(proposal.created_at);
  if (!Number.isFinite(policyStart) || !Number.isFinite(policyEnd) || now < policyStart || now > policyEnd || policyEnd <= policyStart) {
    blockers.push('POLICY_NOT_CURRENT');
  }
  if (!Number.isFinite(proposalTime) || proposalTime > now + 30_000 || now - proposalTime > policy.max_proposal_age_ms) {
    blockers.push('PROPOSAL_EXPIRED_OR_INVALID_TIMESTAMP');
  }
  if (!Number.isSafeInteger(policy.max_proposal_age_ms) || policy.max_proposal_age_ms <= 0 ||
      !Number.isSafeInteger(policy.max_vote_age_ms) || policy.max_vote_age_ms <= 0) {
    blockers.push('INVALID_POLICY_AGE_LIMITS');
  }
  if (!policy.allowed_actions.includes(proposal.action)) blockers.push('ACTION_OUTSIDE_PREAUTHORIZED_POLICY');
  if (!policy.allowed_targets.includes(proposal.target)) blockers.push('TARGET_OUTSIDE_PREAUTHORIZED_POLICY');
  if (policy.require_rollback_plan && !isSha256(proposal.rollback_plan_sha256)) blockers.push('ROLLBACK_PLAN_REQUIRED');
  if (!isSha256(args.expectedInputBundleSha256)) blockers.push('INVALID_EXPECTED_INPUT_BUNDLE_HASH');

  const identities = new Map(evaluators.map(item => [item.evaluator_id, item]));
  for (const evaluatorId of policy.evaluator_ids) {
    const vote = votes.find(item => item.evaluator_id === evaluatorId);
    if (!vote) {
      blockers.push('MISSING_VOTE:' + evaluatorId);
      continue;
    }
    const identity = identities.get(evaluatorId);
    if (!identity) {
      blockers.push('UNTRUSTED_EVALUATOR:' + evaluatorId);
      continue;
    }

    const signedAt = validIsoTime(vote.signed_at);
    if (!Number.isFinite(signedAt) || signedAt > now + 30_000 || now - signedAt > policy.max_vote_age_ms) {
      blockers.push('VOTE_EXPIRED_OR_INVALID_TIMESTAMP:' + evaluatorId);
      continue;
    }
    if (vote.proposal_sha256 !== proposalSha || vote.policy_sha256 !== policySha ||
        vote.evidence_sha256 !== proposal.evidence_sha256 || vote.nonce !== proposal.nonce) {
      blockers.push('VOTE_CONTEXT_MISMATCH:' + evaluatorId);
      continue;
    }
    if (vote.input_bundle_sha256 !== args.expectedInputBundleSha256 ||
        vote.independence_attestation !== 'ISOLATED_INPUT_ONLY') {
      blockers.push('INDEPENDENCE_CONTEXT_INVALID:' + evaluatorId);
      continue;
    }
    if (vote.decision !== 'APPROVE' && vote.decision !== 'DENY') {
      blockers.push('INVALID_VOTE_DECISION:' + evaluatorId);
      continue;
    }

    try {
      const signature = Buffer.from(vote.signature_base64, 'base64');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(vote.signature_base64) ||
          signature.length !== 64 || signature.toString('base64') !== vote.signature_base64) {
        blockers.push('INVALID_VOTE_SIGNATURE_ENCODING:' + evaluatorId);
        continue;
      }
      const { signature_base64: _signature, ...unsignedVote } = vote;
      const valid = verifySignature(
        null,
        voteSigningPayload(unsignedVote),
        createPublicKey(identity.public_key_pem),
        signature
      );
      if (!valid) {
        blockers.push('INVALID_VOTE_SIGNATURE:' + evaluatorId);
        continue;
      }
    } catch {
      blockers.push('VOTE_SIGNATURE_VERIFICATION_ERROR:' + evaluatorId);
      continue;
    }

    if (vote.decision === 'APPROVE') validApprovals += 1;
    else validDenials += 1;
  }

  const status: ConsensusStatus = blockers.length === 0 && validApprovals === 3 && validDenials === 0
    ? 'APPROVED'
    : 'BLOCKED';

  if (status === 'BLOCKED' && validDenials > 0) blockers.push('UNANIMOUS_APPROVAL_DENIED');
  if (status === 'BLOCKED' && validApprovals !== 3 && validDenials === 0 && blockers.length === 0) {
    blockers.push('THREE_OF_THREE_APPROVALS_NOT_PRESENT');
  }

  return {
    status,
    required_approvals: 3,
    valid_approvals: validApprovals,
    valid_denials: validDenials,
    proposal_sha256: proposalSha,
    policy_sha256: policySha,
    blockers
  };
}
