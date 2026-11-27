import { DaisyBoundedExecutor } from './DaisyBoundedExecutor';
import { loadTrustedRuntimeConfig } from './DaisyConsensusConfig';
import { DaisyConsensusRuntime, DockerIsolatedEvaluatorRunner } from './DaisyConsensusRuntime';
import { NeonDaisyConsensusStore } from './NeonDaisyConsensusStore';

function fail(reason: string): never {
  throw new Error('DAISY_CONSENSUS_COMPOSITION_BLOCKED:' + reason);
}

/**
 * Production composition root. Its only action handler records the 3-of-3
 * certificate in the existing Neon database. It cannot deploy, publish,
 * mutate customer data, or execute arbitrary commands.
 */
export async function createDaisyConsensusRuntime(env: NodeJS.ProcessEnv = process.env) {
  const config = loadTrustedRuntimeConfig(env);
  if (config.policy.allowed_actions.length !== 1 ||
      config.policy.allowed_actions[0] !== 'AUTHORIZE_DAISY_PRODUCTION' ||
      config.policy.allowed_targets.length !== 1 ||
      config.policy.allowed_targets[0] !== 'SOLVEX_DAISY_PRODUCTION' ||
      config.policy.require_rollback_plan !== true) {
    fail('POLICY_MUST_ONLY_AUTHORIZE_DAISY_PRODUCTION_WITH_ROLLBACK_PLAN');
  }

  const store = await NeonDaisyConsensusStore.fromEnvironment(env);
  const executor = new DaisyBoundedExecutor({
    AUTHORIZE_DAISY_PRODUCTION: async (proposal, _idempotencyKey, certificate) => {
      if (proposal.action !== 'AUTHORIZE_DAISY_PRODUCTION' ||
          proposal.target !== 'SOLVEX_DAISY_PRODUCTION' ||
          !proposal.rollback_plan_sha256) {
        fail('PRODUCTION_CONSENT_PROPOSAL_SCOPE_INVALID');
      }
      const persisted = await store.persistCertificate(certificate);
      if (!persisted) fail('CONSENSUS_CERTIFICATE_NOT_DURABLY_RECORDED');
    }
  });
  const runtime = new DaisyConsensusRuntime(
    config,
    new DockerIsolatedEvaluatorRunner(),
    store,
    executor
  );
  return Object.freeze({ runtime, store });
}
