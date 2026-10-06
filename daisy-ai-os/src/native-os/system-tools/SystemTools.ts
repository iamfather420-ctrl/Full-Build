/**
 * AI-OS NATIVE BRANCH — System tools
 * Controlled tools available inside the Daisy process space.
 */
import { PermissionKernel } from '../permissions/PermissionKernel.ts';

export type ToolId = 'fs_list' | 'proc_status' | 'mem_summary' | 'audit_tail' | 'node_ping';

export class SystemTools {
  private permissions: PermissionKernel;
  constructor(permissions: PermissionKernel) {
    this.permissions = permissions;
  }

  invoke(subject: string, tool: ToolId, args: Record<string, unknown> = {}): {
    ok: boolean;
    tool: ToolId;
    result: unknown;
    message: string;
  } {
    const grant = this.permissions.request(subject, `tool:${tool}`, 'execute');
    if (!grant.granted) {
      return { ok: false, tool, result: null, message: grant.reason };
    }

    switch (tool) {
      case 'fs_list':
        return { ok: true, tool, result: { paths: ['/daisy', '/vault', '/ledger'] }, message: 'ok' };
      case 'proc_status':
        return { ok: true, tool, result: { active: true }, message: 'ok' };
      case 'mem_summary':
        return { ok: true, tool, result: { regions: 3 }, message: 'ok' };
      case 'audit_tail':
        return { ok: true, tool, result: { events: Number(args.n ?? 10) }, message: 'ok' };
      case 'node_ping':
        return { ok: true, tool, result: { nodes: 54, alive: true }, message: 'ok' };
      default:
        return { ok: false, tool, result: null, message: 'unknown tool' };
    }
  }
}
