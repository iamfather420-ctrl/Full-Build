import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { realpathSync, statSync } from 'node:fs';
import {
  ConsensusPolicy,
  EvaluatorIdentity,
  canonicalJson
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

function fail(reason: string): never {
  throw new Error('DAISY_RUNTIME_BLOCKED:' + reason);
}

export function isPinnedEvaluatorImage(value: string): boolean {
  return /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/i.test(value);
}

export function loadTrustedConsensusPolicy(env: NodeJS.ProcessEnv = process.env): SignedDaisyRuntimeConfig {
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

  const unique = (values: string[]) => values.every(Boolean) && new Set(values).size === 3;
  if (!unique(parsed.evaluators.map(item => item.model_id)) ||
      !unique(parsed.evaluators.map(item => item.model_weights_sha256)) ||
      !unique(parsed.evaluators.map(item => item.runtime_code_sha256)) ||
      !unique(parsed.evaluators.map(item => item.image_digest))) {
    fail('THREE_DISTINCT_MODEL_LINEAGES_REQUIRED');
  }

  const keyFingerprints = new Set<string>();
  for (const evaluator of parsed.evaluators) {
    if (!evaluator.model_id?.trim() ||
        !/^[a-f0-9]{64}$/.test(evaluator.model_weights_sha256) ||
        !/^[a-f0-9]{64}$/.test(evaluator.runtime_code_sha256) ||
        !/^[a-f0-9]{64}$/.test(evaluator.image_digest)) {
      fail('EVALUATOR_MODEL_LINEAGE_INVALID');
    }
    if (!isPinnedEvaluatorImage(evaluator.image) ||
        evaluator.image.slice(evaluator.image.lastIndexOf('sha256:') + 7) !== evaluator.image_digest) {
      fail('EVALUATOR_IMAGE_DIGEST_MISMATCH');
    }
    try {
      const key = createPublicKey(evaluator.public_key_pem);
      const fingerprint = createHash('sha256')
        .update(key.export({ type: 'spki', format: 'der' }))
        .digest('hex');
      if (keyFingerprints.has(fingerprint)) fail('EVALUATOR_PUBLIC_KEYS_MUST_BE_DISTINCT');
      keyFingerprints.add(fingerprint);
    } catch {
      fail('EVALUATOR_TRUST_MATERIAL_INVALID');
    }
  }

  return Object.freeze({ ...parsed, signature_base64: signature });
}

export function loadTrustedRuntimeConfig(env: NodeJS.ProcessEnv = process.env): SignedDaisyRuntimeConfig {
  const config = loadTrustedConsensusPolicy(env);
  for (const evaluator of config.evaluators) {
    if (!evaluator.signing_key_file) fail('EVALUATOR_SIGNING_KEY_FILE_MISSING');
    try {
      const keyPath = realpathSync(evaluator.signing_key_file);
      const keyStat = statSync(keyPath);
      if (!keyStat.isFile() || keyStat.uid === 0 || (keyStat.mode & 0o077) !== 0 ||
          keyPath.includes(',') || keyPath !== evaluator.signing_key_file) {
        fail('EVALUATOR_SIGNING_KEY_PERMISSIONS_INVALID');
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('DAISY_RUNTIME_BLOCKED:')) throw error;
      fail('EVALUATOR_SIGNING_KEY_FILE_UNAVAILABLE');
    }
  }
  return config;
}
