import { DurableStore } from '../database/DurableStore';
import { NodeRegistry } from '../nodes/NodeRegistry';

/**
 * Read-only system surface. Mutating methods stay 405.
 * Readiness is always BLOCKED until independent evidence exists — this router
 * never claims production readiness from local chain health alone.
 */
export class SovereignApiRouter {
  private static singleton: SovereignApiRouter | null = null;
  private constructor() {}

  static getInstance(): SovereignApiRouter {
    if (!this.singleton) this.singleton = new SovereignApiRouter();
    return this.singleton;
  }

  async handleRequest(path: string, method: string): Promise<{ status: number; data: Record<string, unknown> }> {
    if (method !== 'GET') return { status: 405, data: { error: 'METHOD_NOT_ALLOWED' } };
    if (path !== '/api/system/health' && path !== '/api/system/status') {
      return { status: 404, data: { error: 'NOT_FOUND' } };
    }

    const store = DurableStore.getInstance();
    const chain = store.verifyChain();
    const nodeCount = NodeRegistry.getInstance().getAllNodes().length;
    const localOk = chain.valid && nodeCount > 0;

    const blockers = {
      first_party_auth_enabled: false,
      first_party_inference_ready: false,
      typed_neon_persistence_enabled: false,
      payments_enabled: false,
      fresh_gate_evidence_on_head: false,
      canonical_deployment_reconciled: false,
      native_ui_archive_modules_recovered: false,
    };

    const data = {
      status: localOk ? 'healthy_local' : 'degraded',
      registered_nodes: nodeCount,
      chain_valid: chain.valid,
      audit_records: store.getState().audit_chain.length,
      authentication_enabled: false,
      payments_enabled: false,
      external_model_provider_default: false,
      readiness: 'BLOCKED',
      production_ready: false,
      blockers,
      reason:
        'Local health does not equal production readiness. Auth, typed Neon persistence, first-party inference, fresh 120/46-gate evidence, deployment reconciliation, and archive UI recovery remain incomplete. Payments stay disabled.',
    };

    // Health: 200 only means process responds with honest local signals; readiness stays BLOCKED.
    return { status: localOk ? 200 : 503, data };
  }
}
