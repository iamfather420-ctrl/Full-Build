import { DurableStore } from '../database/DurableStore';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { ProductionStateService } from '../production/ProductionState';

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

    const production = ProductionStateService.getState();
    const store = DurableStore.getInstance();
    const chain = store.verifyChain();
    const nodeCount = NodeRegistry.getInstance().getAllNodes().length;
    const runtimeHealthy = chain.valid && nodeCount === 54;

    // Liveness reports whether this process and its local integrity controls work.
    // It deliberately does not imply that production dependencies are ready.
    if (path === '/api/system/health') {
      return {
        status: runtimeHealthy ? 200 : 503,
        data: {
          status: runtimeHealthy ? 'healthy' : 'unhealthy',
          registered_nodes: nodeCount,
          chain_valid: chain.valid,
          audit_records: store.getState().audit_chain.length,
          readiness: production.readiness,
          production_status: production.status,
          authentication_enabled: false, // authentication_enabled: false until the live authentication flow is independently verified; config is reported separately.
          authentication_configured: production.authentication_configured,
          payments_enabled: false,
          environment: production.environment,
          blockers: production.blockers,
          reason: runtimeHealthy
            ? 'Runtime liveness and local integrity checks passed; production readiness is reported separately.'
            : 'Runtime liveness or local integrity checks failed.'
        }
      };
    }

    // Readiness remains strict: no production claim while any release gate is blocked.
    const ready = runtimeHealthy && production.readiness === 'READY';
    return {
      status: ready ? 200 : 503,
      data: {
        status: ready ? 'ready' : 'blocked',
        registered_nodes: nodeCount,
        chain_valid: chain.valid,
        audit_records: store.getState().audit_chain.length,
        authentication_enabled: production.authentication_enabled,
        payments_enabled: false,
        readiness: production.readiness,
        environment: production.environment,
        blockers: production.blockers,
        reason: ready
          ? 'Runtime and production readiness gates are satisfied.'
          : 'Production OIDC, signed tenant isolation, and required readiness gates have not been verified.'
      }
    };
  }
}
