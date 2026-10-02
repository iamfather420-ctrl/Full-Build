import { SystemStatusService } from './SystemStatus';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { AuthService, UserContext } from '../auth/AuthService';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { ReversibilityEngine } from '../database/ReversibilityEngine';
import { computeSha256 } from '../database/DatabaseSchema';
import { B2BReferenceCaseService } from '../b2b/B2BReferenceCaseService';

export interface ApiResponse<T = any> { status: number; data?: T; error?: string; timestamp: number; }

export class SovereignApiRouter {
  private static instance: SovereignApiRouter | null = null;
  private readonly sqlite = SqliteStore.getInstance();
  private readonly durableStore = DurableStore.getInstance();
  private readonly authService = AuthService.getInstance();

  public static getInstance(): SovereignApiRouter { if (!SovereignApiRouter.instance) SovereignApiRouter.instance = new SovereignApiRouter(); return SovereignApiRouter.instance; }

  private extractAuthUser(headers: Record<string, string | string[] | undefined>): UserContext | null {
    const value = headers.authorization || headers.Authorization;
    if (typeof value !== 'string' || !/^Bearer\s+/i.test(value)) return null;
    const verified = this.authService.verifyToken(value.replace(/^Bearer\s+/i, '').trim());
    return verified.valid ? verified.user || null : null;
  }

  private requireUser(user: UserContext | null, action: string, tenantId?: string): ApiResponse | null {
    if (!user) return { status: 401, error: 'Authentication is required', timestamp: Date.now() };
    const authorization = this.authService.authorize(user, action, tenantId || user.tenant_id);
    return authorization.authorized ? null : { status: 403, error: authorization.reason || 'Forbidden', timestamp: Date.now() };
  }

  public async handleRequest(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', payload?: any, headers: Record<string, string | string[] | undefined> = {}): Promise<ApiResponse> {
    const timestamp = Date.now();
    const user = this.extractAuthUser(headers);
    try {
      // Public readiness endpoints disclose no tenant or credential data.
      if (path === '/api/system/health' && method === 'GET') {
        const chain = this.durableStore.verifyChain();
        return { status: 200, data: { status: chain.valid ? 'HEALTHY' : 'DEGRADED', durable_storage: true, audit_chain_continuous: chain.valid, authentication_configured: this.authService.isConfigured(), fail_closed_active: true }, timestamp };
      }
      if (path === '/api/system/status' && method === 'GET') return { status: 200, data: SystemStatusService.computeStatus(), timestamp };
      if (path === '/api/payments/paypal/status' && method === 'GET') return { status: 200, data: PayPalAdapter.getInstance().getMaskedCredentialsInfo(), timestamp };
      if (path === '/api/offers' && method === 'GET') return { status: 200, data: MarketplaceEngine.getInstance().listPublishedOffers(), timestamp };
      if (path.startsWith('/api/b2b/readiness/') && method === 'GET') {
        const candidateId = decodeURIComponent(path.slice('/api/b2b/readiness/'.length));
        return { status: 200, data: B2BReferenceCaseService.getInstance().getReadiness(candidateId), timestamp };
      }
      if (path === '/api/payments/paypal/webhook' && method === 'POST') {
        const result = await PayPalAdapter.getInstance().handleWebhook(headers, payload);
        return result.accepted ? { status: result.status, data: { accepted: true }, timestamp } : { status: result.status, error: result.error, timestamp };
      }
      if (path === '/api/auth/login' && method === 'POST') return { status: 410, error: 'Public role/tenant-selecting login is disabled. Use the configured identity provider.', timestamp };

      if (path === '/api/solutions/pipeline' && method === 'POST') {
        const blocked = this.requireUser(user, 'RUN_PIPELINE'); if (blocked) return blocked;
        const { paradox_code, code_solution } = payload || {};
        const result = SolutionPipeline.getInstance().runPipeline(paradox_code, code_solution, user!.tenant_id);
        return { status: 202, data: result, timestamp };
      }
      if (path === '/api/b2b/reference-cases' && method === 'POST') {
        const blocked = this.requireUser(user, 'VIEW_EVIDENCE'); if (blocked) return blocked;
        const reference = B2BReferenceCaseService.getInstance().createReferenceCase(payload, user!);
        return { status: 201, data: reference, timestamp };
      }
      if (path.startsWith('/api/b2b/reference-cases/') && path.endsWith('/evaluate') && method === 'POST') {
        const blocked = this.requireUser(user, 'VIEW_EVIDENCE'); if (blocked) return blocked;
        const referenceId = decodeURIComponent(path.slice('/api/b2b/reference-cases/'.length, -'/evaluate'.length));
        const evidence = B2BReferenceCaseService.getInstance().executeAuthorizedEvaluation(referenceId, payload?.inputs, payload?.expected_outputs, user!);
        return { status: 201, data: evidence, timestamp };
      }
      if (path.startsWith('/api/b2b/evaluations/') && path.endsWith('/accept') && method === 'POST') {
        const blocked = this.requireUser(user, 'VIEW_EVIDENCE'); if (blocked) return blocked;
        const evaluationId = decodeURIComponent(path.slice('/api/b2b/evaluations/'.length, -'/accept'.length));
        const evidence = B2BReferenceCaseService.getInstance().commitAcceptance(evaluationId, user!);
        return { status: 200, data: evidence, timestamp };
      }
      if (path === '/api/offers/publish' && method === 'POST') {
        const blocked = this.requireUser(user, 'PUBLISH_OFFER', 'TENANT_SOVEREIGN_ROOT'); if (blocked) return blocked;
        const { solution_id, proof_bundle_id, title, description, cost_basis, complexity, risk_class } = payload || {};
        const result = MarketplaceEngine.getInstance().publishOffer(solution_id, proof_bundle_id, title, description, cost_basis, complexity, risk_class);
        return result.success ? { status: 201, data: result.offer, timestamp } : { status: 400, error: result.error, timestamp };
      }
      if (path === '/api/orders' && method === 'GET') {
        const blocked = this.requireUser(user, 'VIEW_OWN'); if (blocked) return blocked;
        return { status: 200, data: this.sqlite.findTenantRecords('orders', user!.tenant_id), timestamp };
      }
      if (path === '/api/orders' && method === 'POST') {
        const blocked = this.requireUser(user, 'CREATE_ORDER'); if (blocked) return blocked;
        const result = MarketplaceEngine.getInstance().createOrder(user!.tenant_id, payload?.offer_id);
        return result.success ? { status: 201, data: result.order, timestamp } : { status: 400, error: result.error, timestamp };
      }
      if (path === '/api/orders/transition' && method === 'POST') {
        const blocked = this.requireUser(user, 'VERIFY_PAYMENT'); if (blocked) return blocked;
        const result = OrderLifecycleManager.getInstance().transitionOrder(payload?.order_id, payload?.target_state, user!, payload?.evidence_payload);
        return result.success ? { status: 200, data: result.order, timestamp } : { status: 400, error: result.error, timestamp };
      }
      if (path === '/api/payments/checkout' && method === 'POST') {
        const blocked = this.requireUser(user, 'CREATE_CHECKOUT'); if (blocked) return blocked;
        const result = await PayPalAdapter.getInstance().createCheckout(payload?.order_id, user!.tenant_id, payload?.idempotency_key);
        return { status: result.success ? 200 : result.status === 'APPROVAL_REQUIRED' ? 202 : 400, data: result, timestamp };
      }
      if (path === '/api/payments/capture' && method === 'POST') {
        const blocked = this.requireUser(user, 'CREATE_CHECKOUT'); if (blocked) return blocked;
        const result = await PayPalAdapter.getInstance().captureApprovedOrder(payload?.order_id, user!.tenant_id, payload?.paypal_order_id);
        return { status: result.success ? 200 : 400, data: result, timestamp };
      }
      if (path === '/api/audit' && method === 'GET') {
        const blocked = this.requireUser(user, 'VIEW_AUDIT'); if (blocked) return blocked;
        return { status: 200, data: this.sqlite.findTenantRecords('audit_records', user!.tenant_id, 100), timestamp };
      }
      if (path === '/api/audit/chain/verify' && method === 'POST') {
        const blocked = this.requireUser(user, 'VIEW_AUDIT'); if (blocked) return blocked;
        return { status: 200, data: this.durableStore.verifyChain(), timestamp };
      }
      if (path === '/api/rollback' && method === 'POST') {
        const blocked = this.requireUser(user, 'ROLLBACK'); if (blocked) return blocked;
        const result = ReversibilityEngine.getInstance().executeRollback(payload?.checkpoint_id, payload?.reason || 'Operator requested rollback');
        return result.success ? { status: 200, data: result, timestamp } : { status: 400, error: result.error, timestamp };
      }
      return { status: 404, error: `No route for ${method} ${path}`, timestamp };
    } catch (error: any) {
      return { status: 500, error: error?.message || 'Internal server error', timestamp };
    }
  }

  public handleHttpRequest(req: any, res: any): void {
    const url = new URL(req.originalUrl || req.url, `http://${req.headers?.host || 'localhost'}`);
    const body = Buffer.isBuffer(req.body) ? (() => { try { return JSON.parse(req.body.toString('utf8')); } catch { return undefined; } })() : req.body;
    this.handleRequest(url.pathname, req.method, body, req.headers || {}).then(response => {
      res.status(response.status).set({ 'Content-Type': 'application/json', 'X-Solvex-Version': '2.0.0', 'X-Solvex-Audit-Hash': computeSha256(`${response.status}:${response.timestamp}`) }).json(response.data ?? { error: response.error, status: response.status });
    }).catch(() => res.status(500).json({ error: 'Unhandled API response failure' }));
  }
}
