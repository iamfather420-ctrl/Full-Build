import {
  createPublicKey,
  createHash,
  verify as verifySignature
} from 'node:crypto';
import { spawn } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';
import {
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

export interface DaisyEvaluatorRuntime extends EvaluatorIdentity {
  image: string;
  signing_key_file: string;
}

export interface SignedDaisyRuntimeConfig {
  policy: ConsensusPolicy;
  evaluators: DaisyEvaluatorRuntime[];
  signature_base64: string;
}

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
}

export interface ActionExecutor {
  execute(proposal: ConsensusProposal, idempotencyKey: string, recheck: ExecutorRecheck): Promise<void>;
}

export interface RuntimeResult {
  status: 'APPROVED_AND_EXECUTED' | 'BLOCKED';
  consensus?: ReturnType<typeof verifyUnanimousConsensus>;
  reason?: string;
}

function fail(reason: string): never {
  throw new Error('DAISY_RUNTIME_BLOCKED:' + reason);
}

function isPinnedImage(value: string): boolean {
  return /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/i.test(value);
}

/**
 * Loads the evaluator roster and policy only from a root-signed environment value.
 * The root public key must be provisioned outside the application and unavailable
 * to evaluator containers. No default roster or development key is provided.
 */
export function loadTrustedRuntimeConfig(env: NodeJS.ProcessEnv = process.env): SignedDaisyRuntimeConfig {
  const encoded = env.DAISY_RUNTIME_CONFIG_JSON;
  const signature = env.DAISY_RUNTIME_CONFIG_SIGNATURE;
  const rootPem = env.DAISY_POLICY_ROOT_PUBLIC_KEY;
  if (!encoded || !signature || !rootPem) fail('TRUSTED_POLICY_CONFIG_MISSING');
  let parsed: Omit<SignedDaisyRuntimeConfig, 'signature_base64'>;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return fail('TRUSTED_POLICY_CONFIG_INVALID_JSON');
  }
  let valid = false;
  try {
    const sig = Buffer.from(signature, 'base64');
    valid = sig.length === 64 && sig.toString('base64') === signature &&
      verifySignature(null, Buffer.from(canonicalJson(parsed)), createPublicKey(rootPem), sig);
  } catch {
    valid = false;
  }
  if (!valid) fail('TRUSTED_POLICY_CONFIG_SIGNATURE_INVALID');
  const ids = parsed.evaluators.map(item => item.evaluator_id);
  if (ids.length !== 3 || new Set(ids).size !== 3 ||
      parsed.policy.evaluator_ids.length !== 3 ||
      parsed.policy.evaluator_ids.some(id => !ids.includes(id))) {
    fail('TRUSTED_EVALUATOR_ROSTER_INVALID');
  }
  for (const evaluator of parsed.evaluators) {
    if (!isPinnedImage(evaluator.image)) fail('EVALUATOR_IMAGE_MUST_BE_PINNED_BY_SHA256');
    if (!evaluator.signing_key_file) fail('EVALUATOR_SIGNING_KEY_FILE_MISSING');
    try {
      const key = createPublicKey(evaluator.public_key_pem);
      const fingerprint = createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');
      if (!/^[a-f0-9]{64}$/.test(fingerprint)) fail('EVALUATOR_PUBLIC_KEY_INVALID');
      const keyPath = realpathSync(evaluator.signing_key_file);
      if (!statSync(keyPath).isFile()) fail('EVALUATOR_SIGNING_KEY_NOT_A_FILE');
      evaluator.signing_key_file = keyPath;
    } catch {
      fail('EVALUATOR_KEY_MATERIAL_UNAVAILABLE');
    }
  }
  return { ...parsed, signature_base64: signature };
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
    if (!isPinnedImage(evaluator.image)) return Promise.reject(new Error('UNPINNED_EVALUATOR_IMAGE'));
    const args = [
      'run', '--rm', '-i',
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

      // Consume before execution: crash/failure after this point requires a new
      // proposal and fresh unanimous vote round. A nonce is never restored.
      const consumed = await this.nonceStore.consumeOnce(proposal.nonce, proposalSha, this.now());
      if (!consumed) fail('NONCE_ALREADY_CONSUMED_OR_DURABLE_STORE_UNAVAILABLE');

      // Executor rechecks exact proposal/policy/evidence binding immediately before
      // dispatch. The executor receives no general shell or arbitrary command API.
      if (proposalDigest(proposal) !== consensus.proposal_sha256 ||
          policyDigest(this.config.policy) !== consensus.policy_sha256 ||
          !this.config.policy.allowed_actions.includes(proposal.action) ||
          !this.config.policy.allowed_targets.includes(proposal.target)) {
        fail('EXECUTOR_SIDE_RECHECK_FAILED');
      }
      await this.executor.execute(proposal, proposalSha, {
        policy: this.config.policy, evaluators: this.config.evaluators, votes,
        expectedInputBundleSha256: inputBundleSha, expectedProposalSha256: consensus.proposal_sha256,
        expectedPolicySha256: consensus.policy_sha256
      });
      return { status: 'APPROVED_AND_EXECUTED', consensus };
    } catch (error) {
      return {
        status: 'BLOCKED',
        reason: error instanceof Error ? error.message : 'UNKNOWN_RUNTIME_FAILURE'
      };
    }
  }
}
