import { SqliteStore } from '../database/SqliteStore';
import { DaisyBoundedExecutor, BoundedActionHandler } from './DaisyBoundedExecutor';
import {
  DaisyConsensusRuntime,
  DockerIsolatedEvaluatorRunner,
  loadTrustedRuntimeConfig
} from './DaisyConsensusRuntime';
import { SqliteDaisyNonceStore } from './SqliteDaisyNonceStore';

/**
 * Production composition root. Every dependency is created from trusted local
 * configuration; absence of signed policy, protected keys, Docker, or disk-backed
 * SQLite prevents construction or causes execution to return BLOCKED.
 */
export function createDaisyConsensusRuntime(
  trustedActionHandlers: Readonly<Record<string, BoundedActionHandler>>,
  dockerBinary = 'docker'
): DaisyConsensusRuntime {
  const config = loadTrustedRuntimeConfig();
  const durableStore = SqliteStore.getInstance();
  const nonceStore = new SqliteDaisyNonceStore(durableStore);
  const executor = new DaisyBoundedExecutor(trustedActionHandlers);
  const evaluatorRunner = new DockerIsolatedEvaluatorRunner(dockerBinary);
  return new DaisyConsensusRuntime(config, nonceStore, executor, evaluatorRunner);
}
