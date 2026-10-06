/**
 * AI-OS NATIVE BRANCH — Process layer
 */
import type { PlatformTarget, ProcessHandle } from '../types.ts';

export class ProcessLayer {
  private processes = new Map<string, ProcessHandle>();

  private seq = 0;
  spawn(name: string, platform: PlatformTarget): ProcessHandle {
    this.seq += 1;
    const handle: ProcessHandle = {
      pid: `pid_${Date.now().toString(36)}_${this.seq}`,
      name,
      status: 'running',
      started_at: new Date().toISOString(),
      platform,
    };
    this.processes.set(handle.pid, handle);
    return handle;
  }

  stop(pid: string): boolean {
    const p = this.processes.get(pid);
    if (!p) return false;
    p.status = 'stopped';
    return true;
  }

  list(): ProcessHandle[] {
    return [...this.processes.values()];
  }
}
