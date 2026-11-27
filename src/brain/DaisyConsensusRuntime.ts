import {
  createPublicKey,
  createHash,
  verify as verifySignature
} from 'node:crypto';
import { spawn } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';
import {
  ConsensusCertificate,
  ConsensusPolicy,
  ConsensusProposal,
  EvaluatorIdentity,
  SignedEvaluatorVote,
  canonicalJson,
  policyDigest,
  proposalDigest,
  sha256Canonical,
  verifyUnanimousConsensus
} from './IndependentUnanimousConsensus';
import {
  DaisyEvaluatorRuntime,
  SignedDaisyRuntimeConfig,
  isPinnedEvaluatorImage
} from './DaisyConsensusConfig';

export interface NonceStore {
  consumeOnce(nonce: string, proposalSha256: string, consumedAt: number): Promise<boolean>;
}

export interface ExecutorRecheck {
  policy: ConsensusPolicy;
  evaluators: readonly EvaluatorIdentity[];
  votes: readonly SignedEvaluatorVote[];
  expectedInputBundleSha256: string;
  expectedProposalSha256: string;
  expectedPolicySha256: string;
  certificate: ConsensusCertificate;
}

export interface ActionExecutor {
  execute(proposal: ConsensusProposal, idempotencyKey: string, recheck: ExecutorRecheck): Promise<void>;
}

export interface RuntimeResult {
  status: 'APPROVED_AND_EXECUTED' | 'BLOCKED';
  consensus?: ReturnType<typeof verifyUnanimousConsensus>;
  reason?: string;
  certificate?: ConsensusCertificate;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function fail(reason: string): never {
  throw new Error('DAISY_RUNTIME_BLOCKED:' + reason);
}

/**
 * One evaluator per fresh Docker container. The container has no network, no
 * capabilities, read-only rootfs, bounded resources, non-root UID and only its
 * own read-only signing-key mount. Input is sent once over stdin; no peer channel
 * or shared writable volume exists. Missing Docker or a failed control flag blocks.
 */
export class DockerIsolatedEvaluatorRunner {
  constructor(private readonly dockerBinary = 'docker', private readonly timeoutMs = 30_000) {}

  public run(evaluator: DaisyEvaluatorRuntime, sealedInput: string): Promise<SignedEvaluatorVote> {
    if (!isPinnedEvaluatorImage(evaluator.image)) return Promise.reject(new Error('UNPINNED_EVALUATOR_IMAGE'));
    const args = [
      'run', '--rm', '-i', '--pull=never',
      '--network=none', '--read-only', '--cap-drop=ALL',
      '--security-opt=no-new-privileges', '--pids-limit=64',
      '--memory=512m', '--cpus=1', `--user=${statSync(evaluator.signing_key_file).uid}:${statSync(evaluator.signing_key_file).gid}`,
      '--tmpfs=/tmp:rw,noexec,nosuid,size=16m',
      '--mount', `type=bind,src=${evaluator.signing_key_file},dst=/run/secrets/evaluator_ed25519.pem,readonly`,
      evaluator.image, 'node', '/app/evaluate.js'
    ];
    return new Promise((resolve, reject) => {
      const child = spawn(this.dockerBinary, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        finish(new Error('EVALUATOR_TIMEOUT'));
      }, this.timeoutMs);
      const finish = (error?: Error, vote?: SignedEvaluatorVote) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else if (vote) resolve(vote);
        else reject(new Error('EVALUATOR_NO_VOTE'));
      };
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 128_000) child.kill('SIGKILL'); });
      child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > 16_000) child.kill('SIGKILL'); });
      child.on('error', () => finish(new Error('ISOLATION_RUNTIME_UNAVAILABLE')));
      child.on('close', code => {
        if (code !== 0) return finish(new Error('ISOLATED_EVALUATOR_FAILED:' + (stderr.slice(-1000) || code)));
        try {
          const parsed = JSON.parse(stdout.trim()) as SignedEvaluatorVote;
          if (parsed.evaluator_id !== evaluator.evaluator_id) return finish(new Error('EVALUATOR_IDENTITY_MISMATCH'));
          if (parsed.model_id !== evaluator.model_id ||
              parsed.model_weights_sha256 !== evaluator.model_weights_sha256 ||
              parsed.runtime_code_sha256 !== evaluator.runtime_code_sha256 ||
              parsed.image_digest !== evaluator.image_digest) {
            return finish(new Error('EVALUATOR_MODEL_LINEAGE_MISMATCH'));
          }
          finish(undefined, parsed);
        } catch {
          finish(new Error('EVALUATOR_OUTPUT_INVALID'));
        }
      });
      child.stdin.on('error', () => finish(new Error('SEALED_INPUT_DELIVERY_FAILED')));
      child.stdin.end(sealedInput, 'utf8');
    });
  }
}

export class DaisyConsensusRuntime {
  constructor(
    private readonly config: SignedDaisyRuntimeConfig,
    private readonly nonceStore: NonceStore,
    private readonly executor: ActionExecutor,
    private readonly evaluatorRunner: Pick<DockerIsolatedEvaluatorRunner, 'run'>,
    private readonly now: () => number = Date.now,
    policyRootPublicKey: string | undefined = process.env.DAISY_POLICY_ROOT_PUBLIC_KEY
  ) {
    if (!policyRootPublicKey) fail('POLICY_ROOT_PUBLIC_KEY_UNAVAILABLE');
    const { signature_base64, ...unsignedConfig } = config;
    let valid = false;
    try {
      const signature = Buffer.from(signature_base64, 'base64');
      valid = signature.length === 64 && signature.toString('base64') === signature_base64 &&
        verifySignature(null, Buffer.from(canonicalJson(unsignedConfig)), createPublicKey(policyRootPublicKey), signature);
    } catch { valid = false; }
    if (!valid) fail('RUNTIME_CONFIG_SIGNATURE_INVALID');
    const evaluatorIds = config.evaluators.map(item => item.evaluator_id);
    if (evaluatorIds.length !== 3 || new Set(evaluatorIds).size !== 3 ||
        config.policy.evaluator_ids.length !== 3 ||
        config.policy.evaluator_ids.some(id => !evaluatorIds.includes(id))) {
      fail('RUNTIME_EVALUATOR_ROSTER_INVALID');
    }
    const publicKeyFingerprints = new Set<string>();
    const evaluatorImages = new Set<string>();
    const modelIds = new Set<string>();
    const modelWeights = new Set<string>();
    const runtimeCodes = new Set<string>();
    for (const evaluator of config.evaluators) {
      if (modelIds.has(evaluator.model_id) || modelWeights.has(evaluator.model_weights_sha256) ||
          runtimeCodes.has(evaluator.runtime_code_sha256)) fail('EVALUATOR_MODEL_LINEAGES_MUST_BE_DISTINCT');
      modelIds.add(evaluator.model_id);
      modelWeights.add(evaluator.model_weights_sha256);
      runtimeCodes.add(evaluator.runtime_code_sha256);
      if (!isPinnedEvaluatorImage(evaluator.image) || evaluator.image.slice(evaluator.image.lastIndexOf('sha256:') + 7) !== evaluator.image_digest) fail('EVALUATOR_IMAGE_NOT_IMMUTABLY_PINNED');
      if (evaluatorImages.has(evaluator.image)) fail('EVALUATOR_IMAGES_MUST_BE_DISTINCT');
      evaluatorImages.add(evaluator.image);
      try {
        const key = createPublicKey(evaluator.public_key_pem);
        const fingerprint = createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');
        if (publicKeyFingerprints.has(fingerprint)) fail('EVALUATOR_PUBLIC_KEYS_MUST_BE_DISTINCT');
        publicKeyFingerprints.add(fingerprint);
        const keyPath = realpathSync(evaluator.signing_key_file);
        const keyStat = statSync(keyPath);
        if (!keyStat.isFile() || keyStat.uid === 0 || (keyStat.mode & 0o077) !== 0 || keyPath.includes(',') || keyPath !== evaluator.signing_key_file) {
          fail('EVALUATOR_SIGNING_KEY_PERMISSIONS_INVALID');
        }
      } catch {
        fail('EVALUATOR_TRUST_MATERIAL_INVALID');
      }
    }
    deepFreeze(config);
  }

  public async evaluateAndExecute(proposal: ConsensusProposal, evidenceBundle: unknown): Promise<RuntimeResult> {
    try {
      const expectedEvidenceHash = sha256Canonical(evidenceBundle);
      if (expectedEvidenceHash !== proposal.evidence_sha256) fail('EVIDENCE_BUNDLE_DIGEST_MISMATCH');
      const proposalSha = proposalDigest(proposal);
      const policySha = policyDigest(this.config.policy);
      const sealedInput = canonicalJson({
        protocol: 'SOLVEX_DAISY_SEALED_EVALUATION_INPUT_V1',
        proposal,
        proposal_sha256: proposalSha,
        policy: this.config.policy,
        policy_sha256: policySha,
        evidence_bundle: evidenceBundle,
        evidence_sha256: expectedEvidenceHash
      });
      const inputBundleSha = sha256Canonical({
        proposal: proposalSha,
        policy: policySha,
        evidence: expectedEvidenceHash
      });

      // Evaluators are deliberately invoked sequentially, each in a fresh isolated
      // container, and no output is supplied to any subsequent evaluator.
      const votes: SignedEvaluatorVote[] = [];
      for (const evaluatorId of this.config.policy.evaluator_ids) {
        const evaluator = this.config.evaluators.find(item => item.evaluator_id === evaluatorId);
        if (!evaluator) fail('PINNED_EVALUATOR_UNAVAILABLE');
        votes.push(await this.evaluatorRunner.run(evaluator, sealedInput));
      }

      const consensus = verifyUnanimousConsensus({
        proposal,
        policy: this.config.policy,
        evaluators: this.config.evaluators,
        votes,
        expectedInputBundleSha256: inputBundleSha,
        now: this.now()
      });
      if (consensus.status !== 'APPROVED') return { status: 'BLOCKED', consensus, reason: consensus.blockers.join(',') };

      const certificateBody = {
        protocol: 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1' as const,
        proposal,
        policy_sha256: policySha,
        input_bundle_sha256: inputBundleSha,
        votes,
        generated_at: new Date(this.now()).toISOString()
      };
      const certificate: ConsensusCertificate = {
        ...certificateBody,
        certificate_sha256: sha256Canonical(certificateBody)
      };

      // Consume before execution: crash/failure after this point requires a new
      // proposal and fresh unanimous vote round. A nonce is never restored.
      const consumed = await this.nonceStore.consumeOnce(proposal.nonce, proposalSha, this.now());
      if (!consumed) fail('NONCE_ALREADY_CONSUMED_OR_DURABLE_STORE_UNAVAILABLE');

      // Executor rechecks exact proposal/policy/evidence binding immediately before
      // dispatch. The only production-policy handler records consent; it cannot deploy.
      if (proposalDigest(proposal) !== consensus.proposal_sha256 ||
          policyDigest(this.config.policy) !== consensus.policy_sha256 ||
          !this.config.policy.allowed_actions.includes(proposal.action) ||
          !this.config.policy.allowed_targets.includes(proposal.target)) {
        fail('EXECUTOR_SIDE_RECHECK_FAILED');
      }
      await this.executor.execute(proposal, proposalSha, {
        policy: this.config.policy, evaluators: this.config.evaluators, votes,
        expectedInputBundleSha256: inputBundleSha, expectedProposalSha256: consensus.proposal_sha256,
        expectedPolicySha256: consensus.policy_sha256, certificate
      });
      return { status: 'APPROVED_AND_EXECUTED', consensus, certificate };
    } catch (error) {
      return {
        status: 'BLOCKED',
        reason: error instanceof Error ? error.message : 'UNKNOWN_RUNTIME_FAILURE'
      };
    }
  }
}
