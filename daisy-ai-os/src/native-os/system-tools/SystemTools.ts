/**
 * AI-OS NATIVE BRANCH — System tools
 * Tool calls are gated by CICAP before native permissions are evaluated.
 */
import { PermissionKernel } from '../permissions/PermissionKernel.ts';
import { evaluateCreativeIntegrity, type CreativeIntegrityRequest } from '../../../../src/creative/CreativeIntegrityProtocol.ts';

export type ToolId = 'fs_list' | 'proc_status' | 'mem_summary' | 'audit_tail' | 'node_ping';

export interface ToolInvocationResult {
  ok: boolean;
  tool: ToolId;
  result: unknown;
  message: string;
  creative_integrity?: ReturnType<typeof evaluateCreativeIntegrity>;
}

export class SystemTools {
  private permissions: PermissionKernel;
  constructor(permissions: PermissionKernel) {
    this.permissions = permissions;
  }

  invoke(
    subject: string,
    tool: ToolId,
    args: Record<string, unknown> = {},
    integrity?: CreativeIntegrityRequest,
  ): ToolInvocationResult {
    if (!integrity) {
      return { ok: false, tool, result: null, message: 'CICAP_BLOCKED: a contextual integrity assessment is required.' };
    }
    const decision = evaluateCreativeIntegrity(integrity);
    if (decision.decision !== 'ALLOW') {
      return {
        ok: false,
        tool,
        result: null,
        message: `CICAP_${decision.decision}: ${decision.reasons.join(' ')}`,
        creative_integrity: decision,
      };
    }

    const grant = this.permissions.request(subject, `tool:${tool}`, 'execute');
    if (!grant.granted) {
      return { ok: false, tool, result: null, message: grant.reason, creative_integrity: decision };
    }

    switch (tool) {
      case 'fs_list':
        return { ok: true, tool, result: { paths: ['/daisy', '/vault', '/ledger'] }, message: 'ok', creative_integrity: decision };
      case 'proc_status':
        return { ok: true, tool, result: { active: true }, message: 'ok', creative_integrity: decision };
      case 'mem_summary':
        return { ok: true, tool, result: { regions: 3 }, message: 'ok', creative_integrity: decision };
      case 'audit_tail':
        return { ok: true, tool, result: { events: Number(args.n ?? 10) }, message: 'ok', creative_integrity: decision };
      case 'node_ping':
        return { ok: true, tool, result: { nodes: 54, alive: true }, message: 'ok', creative_integrity: decision };
      default:
        return { ok: false, tool, result: null, message: 'unknown tool', creative_integrity: decision };
    }
  }
}
