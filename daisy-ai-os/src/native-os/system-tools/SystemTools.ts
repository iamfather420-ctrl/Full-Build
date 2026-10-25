/**
 * AI-OS NATIVE BRANCH — System tools
 *
 * No real host adapters are wired yet. Return an explicit blocked result rather
 * than success-shaped placeholder values that could be mistaken for telemetry.
 */
import { PermissionKernel } from '../permissions/PermissionKernel.ts';

export type ToolId = 'fs_list' | 'proc_status' | 'mem_summary' | 'audit_tail' | 'node_ping';

export class SystemTools {
  private permissions: PermissionKernel;

  constructor(permissions: PermissionKernel) {
    this.permissions = permissions;
  }

  invoke(subject: string, tool: ToolId, _args: Record<string, unknown> = {}): {
    ok: boolean;
    tool: ToolId;
    result: unknown;
    message: string;
  } {
    const grant = this.permissions.request(subject, `tool:${tool}`, 'execute');
    if (!grant.granted) {
      return { ok: false, tool, result: null, message: grant.reason };
    }

    // Defensive fallback: no tool may claim success until a real adapter is registered.
    return {
      ok: false,
      tool,
      result: null,
      message: 'BLOCKED: NOT_IMPLEMENTED: no real system adapter is configured',
    };
  }
}
