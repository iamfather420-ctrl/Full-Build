import { BuildLedger } from '../dipstick/BuildLedger.ts';

export interface WorkerRecord {
  id: string;
  kind: 'cpu' | 'gpu';
  available: boolean;
}

/** One active build, parallel tasks inside it. GPU execution stays blocked without a provider. */
export class SwarmForge {
  private readonly workers = new Map<string, WorkerRecord>();

  register(worker: WorkerRecord): void {
    if (this.workers.has(worker.id)) throw new Error(`Worker ${worker.id} is already registered.`);
    this.workers.set(worker.id, worker);
  }

  async runShard(buildId: string, taskId: string, workerId: string, artifact: string, execute: () => Promise<void> | void): Promise<'COMPLETED' | 'BLOCKED'> {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Worker ${workerId} is not registered.`);
    BuildLedger.assign(buildId, taskId, `swarm-${worker.kind}`);
    if (worker.kind === 'gpu' || !worker.available) {
      BuildLedger.fail(buildId, taskId);
      BuildLedger.record(buildId, 'worker-blocked', `${workerId} has no configured GPU provider.`);
      return 'BLOCKED';
    }
    await execute();
    BuildLedger.complete(buildId, taskId, artifact);
    BuildLedger.record(buildId, 'worker-completed', `${workerId} finished ${taskId}.`);
    return 'COMPLETED';
  }
}
