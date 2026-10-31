/**
 * AI-OS NATIVE BRANCH — System tools
 * Controlled tools available inside the Daisy process space.
 * Never returns fabricated paths, node counts, or synthetic audit trails.
 */
import { PermissionKernel, type SignedHumanAuthorization } from '../permissions/PermissionKernel.ts';
import type { ProcessLayer } from '../process/ProcessLayer.ts';

export type ToolId = 'fs_list' | 'proc_status' | 'mem_summary' | 'audit_tail' | 'node_ping';

export class SystemTools {
  private permissions: PermissionKernel;
  private processLayer: ProcessLayer | null;

  constructor(permissions: PermissionKernel, processLayer: ProcessLayer | null = null) {
    this.permissions = permissions;
    this.processLayer = processLayer;
  }

  invoke(
    subject: string,
    tool: ToolId,
    _args: Record<string, unknown> = {},
    authorization?: SignedHumanAuthorization,
  ): {
    ok: boolean;
    tool: ToolId;
    status: 'EXECUTED' | 'DENIED' | 'NOT_IMPLEMENTED';
    result: unknown;
    message: string;
  } {
    const grant = this.permissions.request(subject, `tool:${tool}`, 'execute', authorization);
    if (!grant.granted) {
      return { ok: false, tool, status: 'DENIED', result: null, message: grant.reason };
    }

    switch (tool) {
      case 'proc_status': {
        const list = this.processLayer ? this.processLayer.list() : [];
        return {
          ok: true,
          tool,
          status: 'EXECUTED',
          result: {
            pid: process.pid,
            uptime_seconds: Math.floor(process.uptime()),
            tracked_processes: list.length,
            processes: list,
          },
          message: 'Real Node/process-layer telemetry returned',
        };
      }
      case 'mem_summary': {
        const mem = process.memoryUsage();
        return {
          ok: true,
          tool,
          status: 'EXECUTED',
          result: {
            rss_bytes: mem.rss,
            heap_total_bytes: mem.heapTotal,
            heap_used_bytes: mem.heapUsed,
            external_bytes: mem.external,
          },
          message: 'Real process memory telemetry returned',
        };
      }
      case 'fs_list':
      case 'audit_tail':
      case 'node_ping':
        return {
          ok: false,
          tool,
          status: 'NOT_IMPLEMENTED',
          result: null,
          message: `NOT_IMPLEMENTED: ${tool} has no bound native kernel backing in this deployment and will not return synthetic data`,
        };
      default:
        return { ok: false, tool, status: 'NOT_IMPLEMENTED', result: null, message: 'unknown tool' };
    }
  }
}
