import { DurableStore } from '../database/DurableStore';
import { NodeRegistry } from '../nodes/NodeRegistry';

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
    const health = chain.valid && nodeCount > 0;
    const data = {
      status: health ? 'healthy' : 'degraded',
      registered_nodes: nodeCount,
      chain_valid: chain.valid,
      audit_records: store.getState().audit_chain.length,
      authentication_enabled: false,
      payments_enabled: false,
      readiness: 'BLOCKED',
      reason: 'Production OIDC, signed tenant isolation, and required readiness gates have not been verified.'
    };
    return { status: health ? 200 : 503, data };
  }
}
