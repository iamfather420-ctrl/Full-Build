import {
  ConsensusCertificate,
  ConsensusProposal,
  canonicalJson,
  sha256Canonical,
  policyDigest,
  proposalDigest,
  verifyUnanimousConsensus
} from './IndependentUnanimousConsensus';
import type { ActionExecutor, ExecutorRecheck } from './DaisyConsensusRuntime';

export type BoundedActionHandler = (
  proposal: Readonly<ConsensusProposal>,
  idempotencyKey: string,
  certificate: ConsensusCertificate
) => Promise<void>;

/**
 * Executor-side authorization boundary. The only executable operations are
 * handlers explicitly injected by trusted application composition. There is no
 * shell, URL, dynamic import, or model-controlled command dispatch.
 */
export class DaisyBoundedExecutor implements ActionExecutor {
  private readonly handlers: Readonly<Record<string, BoundedActionHandler>>;
  constructor(
    handlers: Readonly<Record<string, BoundedActionHandler>>,
    private readonly clock: () => number = Date.now
  ) {
    this.handlers = Object.freeze(Object.assign(Object.create(null), handlers));
  }

  public async execute(
    proposal: ConsensusProposal,
    idempotencyKey: string,
    recheck: ExecutorRecheck
  ): Promise<void> {
    const proposalSha = proposalDigest(proposal);
    const policySha = policyDigest(recheck.policy);
    if (proposalSha !== recheck.expectedProposalSha256 ||
        policySha !== recheck.expectedPolicySha256 ||
        idempotencyKey !== proposalSha) {
      throw new Error('EXECUTOR_BLOCKED:APPROVED_DIGEST_CHANGED');
    }
    const verification = verifyUnanimousConsensus({
      proposal,
      policy: recheck.policy,
      evaluators: recheck.evaluators,
      votes: recheck.votes,
      expectedInputBundleSha256: recheck.expectedInputBundleSha256,
      now: this.clock()
    });
    if (verification.status !== 'APPROVED' || verification.proposal_sha256 !== proposalSha ||
        verification.policy_sha256 !== policySha) {
      throw new Error('EXECUTOR_BLOCKED:UNANIMOUS_AUTHORIZATION_RECHECK_FAILED');
    }
    const { certificate_sha256, ...certificateBody } = recheck.certificate;
    if (certificate_sha256 !== sha256Canonical(certificateBody) ||
        canonicalJson(recheck.certificate.proposal) !== canonicalJson(proposal) ||
        recheck.certificate.policy_sha256 !== policySha ||
        recheck.certificate.input_bundle_sha256 !== recheck.expectedInputBundleSha256 ||
        canonicalJson(recheck.certificate.votes) !== canonicalJson(recheck.votes)) {
      throw new Error('EXECUTOR_BLOCKED:CONSENSUS_CERTIFICATE_INTEGRITY_FAILED');
    }
    if (!recheck.policy.allowed_actions.includes(proposal.action) ||
        !recheck.policy.allowed_targets.includes(proposal.target)) {
      throw new Error('EXECUTOR_BLOCKED:ACTION_OR_TARGET_NOT_PREAUTHORIZED');
    }
    if (!Object.prototype.hasOwnProperty.call(this.handlers, proposal.action)) {
      throw new Error('EXECUTOR_BLOCKED:NO_TRUSTED_HANDLER_FOR_ACTION');
    }
    const handler = this.handlers[proposal.action];
    if (typeof handler !== 'function') {
      throw new Error('EXECUTOR_BLOCKED:INVALID_TRUSTED_HANDLER');
    }
    await handler(Object.freeze({ ...proposal }), proposalSha, recheck.certificate);
  }
}
