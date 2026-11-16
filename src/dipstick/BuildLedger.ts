import { createHash, randomUUID } from 'node:crypto';

export type TaskState = 'assigned' | 'completed' | 'failed';

export interface BuildTask {
  taskId: string;
  buildId: string;
  kind: string;
  artifactSha256: string | null;
  state: TaskState;
}

export interface BuildRecord {
  buildId: string;
  objectiveSha256: string;
  active: boolean;
  tasks: BuildTask[];
}

/**
 * Tracks one active model build. Parallel tasks are allowed inside that build.
 * A second build cannot open until the active one is closed.
 */
export class BuildLedger {
  private static active: BuildRecord | null = null;

  static current(): BuildRecord | null {
    return this.active;
  }

  static open(objective: string): BuildRecord {
    if (this.active?.active) throw new Error('Another model build is already active.');
    this.active = {
      buildId: randomUUID(),
      objectiveSha256: createHash('sha256').update(objective).digest('hex'),
      active: true,
      tasks: [],
    };
    return this.active;
  }

  static assign(buildId: string, taskId: string, kind: string): BuildTask {
    const build = this.require(buildId);
    if (build.tasks.some((task) => task.taskId === taskId)) throw new Error(`Task ${taskId} is already recorded.`);
    const task: BuildTask = { taskId, buildId, kind, artifactSha256: null, state: 'assigned' };
    build.tasks.push(task);
    return task;
  }

  static complete(buildId: string, taskId: string, artifactBytes: string): BuildTask {
    const task = this.task(buildId, taskId);
    if (task.state === 'completed') throw new Error(`Task ${taskId} is already complete.`);
    task.artifactSha256 = createHash('sha256').update(artifactBytes).digest('hex');
    task.state = 'completed';
    return task;
  }

  static fail(buildId: string, taskId: string): BuildTask {
    const task = this.task(buildId, taskId);
    if (task.state === 'completed') throw new Error(`Completed task ${taskId} cannot be failed.`);
    task.state = 'failed';
    return task;
  }

  static close(buildId: string): BuildRecord {
    const build = this.require(buildId);
    build.active = false;
    if (this.active?.buildId === buildId) this.active = null;
    return build;
  }

  static resetForTest(): void {
    this.active = null;
  }

  private static require(buildId: string): BuildRecord {
    if (!this.active || this.active.buildId !== buildId || !this.active.active) throw new Error('Build is not the active build.');
    return this.active;
  }

  private static task(buildId: string, taskId: string): BuildTask {
    const task = this.require(buildId).tasks.find((item) => item.taskId === taskId);
    if (!task) throw new Error(`Task ${taskId} is not part of this build.`);
    return task;
  }
}
