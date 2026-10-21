import { createHash, randomBytes } from 'node:crypto';
import { SystemStatusService } from './SystemStatus';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { ParadoxRegistry } from '../paradoxes/ParadoxRegistry';
import { ProofEngine } from '../proofs/ProofEngine';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';
import { ExternalAdapterRegistry } from '../adapters/ExternalAdapters';
import { CrystalClearBox } from '../audit/CrystalClearBox';
import { AuthService, UserContext, SovereignRole } from '../auth/AuthService';
import { NeonStore } from '../database/NeonPersistence';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { ReversibilityEngine } from '../database/ReversibilityEngine';
import { DaisyBrain } from '../brain/DaisyBrain';
import { Z3FormalProofEngine } from '../proofs/Z3FormalProofEngine';

export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
  timestamp: number;
}

export class SovereignApiRouter {
  private static instance: SovereignApiRouter | null = null;
  private sqlite: SqliteStore;
  private durableStore: DurableStore;
  private authService: AuthService;

  private constructor() {
    this.sqlite = SqliteStore.getInstance();
    this.durableStore = DurableStore.getInstance();
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): SovereignApiRouter {
    if (!SovereignApiRouter.instance) {
      SovereignApiRouter.instance = new SovereignApiRouter();
    }
    return SovereignApiRouter.instance;
  }

  private async extractAuthUser(headers: Record<string, string | string[] | undefined>): Promise<UserContext | null> {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') return null;
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
    if (!match) return null;
    const token = match[1];
    const mode = (process.env.AUTH_MODE || (process.env.NODE_ENV === 'production' ? 'oidc' : 'local_hs256')).toLowerCase();
    // Local HMAC tokens are explicitly development/test-only. Production accepts
    // only tokens validated against the configured trusted OIDC issuer and JWKS.
    if (mode === 'local_hs256' && process.env.NODE_ENV !== 'production') {
      const verified = this.authService.verifyToken(token);
      return verified.valid && verified.user ? verified.user : null;
    }
    const verified = await this.authService.verifyOidcAccessToken(token);
    return verified.valid && verified.user ? verified.user : null;
  }

  public async handleRequest(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload?: any,
    headers: Record<string, string | string[] | undefined> = {}
  ): Promise<ApiResponse> {
    const timestamp = Date.now();
    const user = await this.extractAuthUser(headers);

    try {
      // Public role-selecting login was an authentication bypass: callers could
      // mint arbitrary roles and tenant IDs. Login is provided only by the trusted
      // external OIDC authorization-code flow, never by this JSON endpoint.
      if (path === '/api/auth/login' && method === 'POST') {
        return { status: 410, error: 'Passwordless role-selecting login is retired. Use the configured trusted OIDC provider.', timestamp };
      }

      // Payment routes are unconditionally disabled, including anonymous attempts.
      if (path.startsWith('/api/payments') && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return { status: 410, error: 'Payment processing is disabled in this release. No payment request was processed.', timestamp };
      }

      // Only intentionally public, read-only catalog/health routes bypass identity.
      const publicRead = method === 'GET' && (
        path === '/api/offers' || path === '/api/paradoxes' || path === '/api/system/health'
      );
      if (!user && !publicRead && path !== '/api/auth/me') {
        return { status: 401, error: 'Authentication required. Configure trusted OIDC before production use.', timestamp };
      }
      if (path === '/api/auth/me' && method === 'GET') {
        if (!user) return { status: 401, error: 'Unauthorized: Missing or invalid token', timestamp };
        return { status: 200, data: user, timestamp };
      }

      // 2. /api/tenants
      if (path === '/api/tenants' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'MANAGE_TENANTS').authorized) {
          return { status: 403, error: 'Tenant inventory requires MANAGE_TENANTS permission', timestamp };
        }
        const tenants = this.sqlite.getRawDb().all('SELECT id, name, tier, status, created_at FROM tenants');
        return { status: 200, data: tenants, timestamp };
      }
      if (path === '/api/tenants' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'MANAGE_TENANTS').authorized) {
          return { status: 403, error: 'Forbidden: Only OWNER can create tenants', timestamp };
        }
        const { id, name, tier = 'ENTERPRISE' } = payload || {};
        if (!id || !name) return { status: 400, error: 'Tenant id and name required', timestamp };
        if (this.sqlite.getRawDb().get('SELECT id FROM tenants WHERE id = ?', [id])) return { status: 409, error: 'Tenant ID already exists; existing tenant was not modified.', timestamp };
        const key = randomBytes(32).toString('hex');
        this.sqlite.insertRecord('tenants', { id, name, tier, isolated_storage_key: key, status: 'ACTIVE' });
        return { status: 201, data: { id, name, tier }, timestamp };
      }

      // 3. /api/problems
      if (path === '/api/problems' && method === 'GET') {
        const targetTenant = user!.tenant_id;
        const problems = this.sqlite.findTenantRecords('problems', targetTenant);
        return { status: 200, data: problems, timestamp };
      }
      if (path === '/api/problems' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'INTAKE_PROBLEM').authorized) return { status: 403, error: 'INTAKE_PROBLEM permission required', timestamp };
        const targetTenant = user!.tenant_id;
        const { raw_problem, title, domain = 'COMPUTATIONAL' } = payload || {};
        if (!raw_problem) return { status: 400, error: 'raw_problem is required', timestamp };
        const problemId = `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const problemData = {
          id: problemId,
          tenant_id: targetTenant,
          raw_problem,
          normalized_title: title || raw_problem.substring(0, 40),
          domain,
          detected_constraints: ['BOUNDED_EXECUTION', 'FINITE_CONVERGENCE'],
          invariants: ['STATE_IMMUTABILITY'],
          status: 'INTAKE',
          version: '1.0.0-PROD'
        };
        this.sqlite.insertRecord('problems', problemData);
        this.durableStore.getState().problems[problemId] = problemData as any;
        this.durableStore.appendAudit(targetTenant, user?.user_id || 'ANONYMOUS', 'PROBLEM_INTAKE', 'PROBLEM', problemId, {
          title: problemData.normalized_title
        });
        this.durableStore.persist();
        return { status: 201, data: problemData, timestamp };
      }

      // 4. /api/paradoxes
      if (path === '/api/paradoxes' && method === 'GET') {
        const paradoxes = ParadoxRegistry.getInstance().getAllParadoxes();
        return { status: 200, data: paradoxes, timestamp };
      }

      // 5. /api/invariants
      if (path === '/api/invariants' && method === 'GET') {
        const targetTenant = user!.tenant_id;
        const invariants = this.sqlite.findTenantRecords('invariants', targetTenant);
        return { status: 200, data: invariants, timestamp };
      }

      // 6. /api/solutions
      if (path === '/api/solutions' && method === 'GET') {
        if (!user) return { status: 401, error: 'Authentication required', timestamp };
        const allSolutions = Object.values(this.durableStore.getState().solutions) as any[];
        const solutions = this.authService.authorize(user, 'SYS_ADMIN').authorized
          ? allSolutions
          : allSolutions.filter((solution) => solution?.tenant_id === user.tenant_id);
        return { status: 200, data: solutions, timestamp };
      }
      if (path === '/api/solutions/pipeline' && method === 'POST') {
        if (!user) return { status: 401, error: 'Authentication required', timestamp };
        const auth = this.authService.authorize(user, 'RUN_PIPELINE');
        if (!auth.authorized) return { status: 403, error: auth.reason, timestamp };
        const { paradox_code = 'DH-P-001', code_solution } = payload || {};
        if (typeof paradox_code !== 'string' || !paradox_code.trim() || paradox_code.length > 200) {
          return { status: 400, error: 'paradox_code must be a non-empty string of at most 200 characters', timestamp };
        }
        if (code_solution !== undefined && (typeof code_solution !== 'string' || code_solution.length > 65536)) {
          return { status: 400, error: 'code_solution must be a string no larger than 65536 characters', timestamp };
        }
        const referencedProblem = this.sqlite.getRawDb().get(
          'SELECT id, tenant_id FROM problems WHERE id = ?', [paradox_code]
        );
        if (referencedProblem && referencedProblem.tenant_id !== user.tenant_id && !this.authService.authorize(user, 'SYS_ADMIN').authorized) {
          return { status: 403, error: "Cannot run a pipeline against another tenant\'s problem", timestamp };
        }
        const pipeline = SolutionPipeline.getInstance();
        const res = pipeline.runPipeline(paradox_code, code_solution || 'export function defaultSolve() { return true; }');
        // Pipeline stages are deterministic simulations, not independent proof of production correctness.
        if (res.overall_success && res.solution_id) {
          const created = this.durableStore.getState().solutions[res.solution_id] as any;
          if (created) {
            created.tenant_id = user.tenant_id;
            created.verification_status = 'CANDIDATE';
            created.status = 'CANDIDATE';
            created.production_verified = false;
            created.execution_mode = 'deterministic_simulation';
            this.sqlite.insertRecord('solutions', created);
            this.durableStore.persist();
          }
        }
        return { status: res.overall_success ? 202 : 400, data: { ...res, execution_mode: 'deterministic_simulation', production_verified: false }, timestamp };
      }

      // 7. /api/verification
      if (path === '/api/verification' && method === 'GET') {
        if (!user) return { status: 401, error: 'Authentication required', timestamp };
        const runs = this.authService.authorize(user, 'SYS_ADMIN').authorized
          ? this.sqlite.getRawDb().all('SELECT * FROM verification_runs ORDER BY created_at DESC LIMIT 20')
          : this.sqlite.findTenantRecords('verification_runs', user.tenant_id, 20);
        return { status: 200, data: runs, timestamp };
      }

      // 8. /api/proofs
      if (path === '/api/proofs' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'VIEW_EVIDENCE').authorized) return { status: 403, error: 'VIEW_EVIDENCE permission required', timestamp };
        const allBundles = ProofEngine.getInstance().getAllBundles() as any[];
        const bundles = this.authService.authorize(user, 'SYS_ADMIN').authorized
          ? allBundles
          : allBundles.filter((bundle) => bundle?.tenant_id === user.tenant_id);
        return { status: 200, data: bundles, timestamp };
      }
      if (path.startsWith('/api/proofs/evidence/') && method === 'GET') {
        if (!user || (!this.authService.authorize(user, 'VIEW_EVIDENCE').authorized && !this.authService.authorize(user, 'VIEW_CUSTOMER_EVIDENCE').authorized)) return { status: 403, error: 'Evidence permission required', timestamp };
        const proofId = path.replace('/api/proofs/evidence/', '');
        const bundle = ProofEngine.getInstance().getBundle(proofId);
        if (!bundle) return { status: 404, error: 'Proof bundle not found', timestamp };
        if (!this.authService.authorize(user, 'SYS_ADMIN').authorized && (bundle as any).tenant_id !== user.tenant_id) {
          return { status: 403, error: 'Cross-tenant proof evidence access denied', timestamp };
        }
        const evidence = CrystalClearBox.projectCustomerEvidence(bundle);
        return { status: 200, data: evidence, timestamp };
      }

      // 8b. Real Z3 Automated Theorem Prover
      if (path === '/api/proofs/z3/theorems' && method === 'GET') {
        const engine = Z3FormalProofEngine.getInstance();
        return { status: 200, data: engine.getCatalog(), timestamp };
      }
      if (path === '/api/proofs/z3/prove' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'VERIFY_PROOFS').authorized) return { status: 403, error: 'VERIFY_PROOFS permission required', timestamp };
        const { theorem_id, custom_name, custom_smt_script, expected_result } = payload || {};
        if (custom_smt_script !== undefined && (typeof custom_smt_script !== 'string' || custom_smt_script.length > 32768)) return { status: 400, error: 'custom_smt_script must be a string no larger than 32768 characters', timestamp };
        if (expected_result !== undefined && !['sat', 'unsat'].includes(expected_result)) return { status: 400, error: 'expected_result must be sat or unsat', timestamp };
        const engine = Z3FormalProofEngine.getInstance();
        if (custom_smt_script) {
          const res = await engine.verifyCustomSmtScript(custom_name || 'CustomTheorem', custom_smt_script, expected_result || 'unsat');
          return { status: 200, data: res, timestamp };
        }
        if (theorem_id) {
          const res = await engine.proveCatalogTheorem(theorem_id);
          return { status: 200, data: res, timestamp };
        }
        return { status: 400, error: 'theorem_id or custom_smt_script required', timestamp };
      }

      // 9. /api/offers
      if (path === '/api/offers' && method === 'GET') {
        // Public catalogue exposes only explicitly published offers and never internal cost basis.
        const offers = Object.values(this.durableStore.getState().offers)
          .filter((offer: any) => offer && (offer.status === 'PUBLISHED' || offer.status === 'ACTIVE'))
          .map((offer: any) => ({
            id: offer.id || offer.offer_id || offer.code,
            title: offer.title, description: offer.description,
            price_display: offer.price_display ?? offer.display_price ?? null,
            status: offer.status, version: offer.version,
          }));
        return { status: 200, data: offers, timestamp };
      }
      if (path === '/api/offers/publish' && method === 'POST') {
        if (!user) return { status: 401, error: 'Authentication required to publish offer', timestamp };
        const auth = this.authService.authorize(user, 'PUBLISH_OFFER');
        if (!auth.authorized) return { status: 403, error: auth.reason, timestamp };
        const { solution_id, proof_bundle_id, title, description, cost_basis, complexity, risk_class } = payload || {};
        const market = MarketplaceEngine.getInstance();
        const res = market.publishOffer(solution_id, proof_bundle_id, title, description, cost_basis, complexity, risk_class);
        if (!res.success) return { status: 400, error: res.error, timestamp };
        return { status: 201, data: res.offer, timestamp };
      }

      // 10. /api/access-requests — evidence-gated, no-payment workflow persisted to the existing Neon orders table.
      if (path === '/api/access-requests' && method === 'GET') {
        if (!user || (!this.authService.authorize(user, 'VIEW_CUSTOMER_EVIDENCE').authorized && !this.authService.authorize(user, 'VIEW_EVIDENCE').authorized && !this.authService.authorize(user, 'SYS_ADMIN').authorized)) {
          return { status: 403, error: 'Access-request read permission required', timestamp };
        }
        const neon = NeonStore.getInstance();
        if (!neon.isConfigured() || !(await neon.connect())) return { status: 503, error: 'Persistent access-request storage is unavailable; no local-only fallback was written.', timestamp };
        const schema = await neon.verifyAccessRequestSchema();
        if (!schema.ready) return { status: 503, error: 'Access-request schema migration is not installed; no schema changes were attempted.', timestamp };
        const requests = await neon.listAccessRequests(user.tenant_id, 100);
        return { status: 200, data: requests, timestamp };
      }
      if (path === '/api/access-requests' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'CREATE_ORDER').authorized) return { status: 403, error: 'CREATE_ORDER permission required', timestamp };
        const { offer_id, request_text, idempotency_key } = payload || {};
        if (typeof offer_id !== 'string' || !offer_id.trim() || offer_id.length > 200) return { status: 400, error: 'offer_id is required and must be at most 200 characters', timestamp };
        if (typeof request_text !== 'string' || request_text.trim().length < 10 || request_text.length > 4000) return { status: 400, error: 'request_text must contain 10–4000 characters', timestamp };
        if (typeof idempotency_key !== 'string' || idempotency_key.length < 12 || idempotency_key.length > 128) return { status: 400, error: 'A 12–128 character idempotency_key is required', timestamp };
        const neon = NeonStore.getInstance();
        if (!neon.isConfigured() || !(await neon.connect())) return { status: 503, error: 'Persistent access-request storage is unavailable; request was not accepted.', timestamp };
        const schema = await neon.verifyAccessRequestSchema();
        if (!schema.ready) return { status: 503, error: 'Access-request schema migration is not installed; request was not accepted and no schema changes were attempted.', timestamp };
        const requestId = `ar_${createHash('sha256').update(`${user.tenant_id}:${idempotency_key}`).digest('hex').slice(0, 40)}`;
        const record = {
          id: requestId, tenant_id: user.tenant_id, offer_id: offer_id.trim(),
          request_text: request_text.trim(), requested_by: user.user_id, idempotency_key,
          status: 'ACCESS_REQUEST_PENDING', authorization_state: 'HUMAN_REVIEW_REQUIRED', payment_state: 'DISABLED' as const,
        };
        const saved = await neon.createAccessRequest(record);
        if (!saved) return { status: 503, error: 'Access request could not be persisted in Neon; no local-only fallback was written.', timestamp };
        if (saved.requested_by !== user.user_id) return { status: 409, error: 'The idempotency key is already associated with another request in this tenant.', timestamp };
        const message = saved.status === 'ACCESS_REQUEST_PENDING'
          ? 'Access request recorded for human review. No payment or deployment occurred.'
          : 'Existing idempotent access request returned; review its current status. No payment or deployment occurred.';
        return { status: 201, data: { ...saved, message }, timestamp };
      }

      // 11. /api/orders
      if (path === '/api/orders' && method === 'GET') {
        if (!user) return { status: 401, error: 'Authentication required to read orders', timestamp };
        const targetTenant = user.tenant_id;
        const orders = this.sqlite.findTenantRecords('orders', targetTenant);
        return { status: 200, data: orders, timestamp };
      }
      if (path === '/api/orders' && method === 'POST') {
        if (!user) return { status: 401, error: 'Authentication required to create an order', timestamp };
        if (!this.authService.authorize(user, 'CREATE_ORDER').authorized) return { status: 403, error: 'CREATE_ORDER permission required', timestamp };
        const targetTenant = user.tenant_id;
        const { offer_id } = payload || {};
        if (!offer_id) return { status: 400, error: 'offer_id is required', timestamp };
        const market = MarketplaceEngine.getInstance();
        const res = market.createOrder(targetTenant, offer_id);
        if (!res.success) return { status: 400, error: res.error, timestamp };
        return { status: 201, data: res.order, timestamp };
      }
      if (path.startsWith('/api/orders/transition') && method === 'POST') {
        if (!user) return { status: 401, error: 'Authentication required to transition order', timestamp };
        const { order_id, target_state, evidence_payload } = payload || {};
        if (!order_id || !target_state) return { status: 400, error: 'order_id and target_state required', timestamp };
        const lifecycle = OrderLifecycleManager.getInstance();
        const res = lifecycle.transitionOrder(order_id, target_state, user, evidence_payload);
        if (!res.success) return { status: 400, error: res.error, timestamp };
        return { status: 200, data: res.order, timestamp };
      }

      // 11. /api/payments — deliberately disabled until payment credentials and production controls are approved.
      // Catalog prices are presentation metadata only; this build never captures or configures payments.
      // 12. /api/deployments
      if (path === '/api/deployments' && method === 'GET') {
        if (!user || (!this.authService.authorize(user, 'VIEW_DEPLOYMENTS').authorized && !this.authService.authorize(user, 'SYS_ADMIN').authorized)) return { status: 403, error: 'VIEW_DEPLOYMENTS permission required', timestamp };
        const targetTenant = user!.tenant_id;
        const deployments = this.sqlite.findTenantRecords('deployments', targetTenant);
        return { status: 200, data: deployments, timestamp };
      }

      // 13. /api/telemetry
      if (path === '/api/telemetry' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'VIEW_TELEMETRY').authorized) return { status: 403, error: 'VIEW_TELEMETRY permission required', timestamp };
        const targetTenant = user!.tenant_id;
        const telemetry = this.sqlite.findTenantRecords('telemetry', targetTenant, 50);
        return { status: 200, data: telemetry, timestamp };
      }

      // 14. /api/audit
      if (path === '/api/audit' && method === 'GET') {
        if (!user || (!this.authService.authorize(user, 'AUDIT_CHAIN').authorized && !this.authService.authorize(user, 'VIEW_EVIDENCE').authorized)) return { status: 403, error: 'Audit permission required', timestamp };
        const targetTenant = user!.tenant_id;
        const records = this.sqlite.findTenantRecords('audit_records', targetTenant, 50);
        return { status: 200, data: records, timestamp };
      }

      // 15. /api/audit/chain
      if (path === '/api/audit/chain' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'SYS_ADMIN').authorized) return { status: 403, error: 'Global audit chain requires SYS_ADMIN permission', timestamp };
        const verification = this.durableStore.verifyChain();
        return {
          status: 200,
          data: {
            valid: verification.valid,
            total_records: verification.total_records,
            chain: this.durableStore.getState().audit_chain
          },
          timestamp
        };
      }
      if (path === '/api/audit/chain/verify' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'AUDIT_CHAIN').authorized) return { status: 403, error: 'AUDIT_CHAIN permission required', timestamp };
        const verification = this.durableStore.verifyChain();
        return { status: 200, data: verification, timestamp };
      }

      // 16. /api/rollback
      if (path === '/api/rollback' && method === 'POST') {
        if (!user || !this.authService.authorize(user, 'EXECUTE_ROLLBACK').authorized) {
          return { status: 403, error: 'EXECUTE_ROLLBACK permission required', timestamp };
        }
        const { checkpoint_id, reason = 'Operator triggered rollback' } = payload || {};
        if (!checkpoint_id) return { status: 400, error: 'checkpoint_id required', timestamp };
        const engine = ReversibilityEngine.getInstance();
        const res = engine.executeRollback(checkpoint_id, reason);
        if (!res.success) return { status: 400, error: res.error, timestamp };
        return { status: 200, data: res, timestamp };
      }

      // 17. /api/nodes
      if (path === '/api/nodes' && method === 'GET') {
        if (!user || (!this.authService.authorize(user, 'EXECUTE_NODES').authorized && !this.authService.authorize(user, 'SYS_ADMIN').authorized)) return { status: 403, error: 'System node inventory is restricted', timestamp };
        const nodes = NodeRegistry.getInstance().getAllNodes();
        return { status: 200, data: nodes, timestamp };
      }

      // 18. /api/adapters
      if (path === '/api/adapters' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'SYS_ADMIN').authorized) return { status: 403, error: 'Adapter inventory requires SYS_ADMIN permission', timestamp };
        const inventory = ExternalAdapterRegistry.getInventory();
        return { status: 200, data: inventory, timestamp };
      }

      // 19. /api/system/status
      if (path === '/api/system/status' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'SYS_ADMIN').authorized) return { status: 403, error: 'System status requires SYS_ADMIN permission', timestamp };
        const status = SystemStatusService.computeStatus();
        return { status: 200, data: status, timestamp };
      }

      // 20. /api/system/health
      if (path === '/api/system/health' && method === 'GET') {
        const chainOk = this.durableStore.verifyChain().valid;
        const sqliteOk = !!this.sqlite.getRawDb();
        const overall = chainOk && sqliteOk ? 'HEALTHY' : 'DEGRADED';
        return {
          status: 200,
          data: {
            status: overall,
            audit_chain_continuous: chainOk,
            sqlite_engine_connected: sqliteOk,
            fail_closed_active: true
          },
          timestamp
        };
      }

      // 21. /api/system/readiness
      if (path === '/api/system/readiness' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'SYS_ADMIN').authorized) return { status: 403, error: 'System readiness details require SYS_ADMIN permission', timestamp };
        const nodes = NodeRegistry.getInstance().getAllNodes();
        const executed = nodes.filter(n => n.execution_mode === 'CODE_EXECUTED').length;
        const ready = executed > 0;
        return {
          status: 200,
          data: {
            ready,
            nodes_active: executed,
            sandbox_status: 'DETERMINISTIC_SANDBOX_READY'
          },
          timestamp
        };
      }

      // 22. /api/brain/state
      if (path === '/api/brain/state' && method === 'GET') {
        if (!user || !this.authService.authorize(user, 'SYS_ADMIN').authorized) return { status: 403, error: 'Daisy brain state requires SYS_ADMIN permission', timestamp };
        const brain = DaisyBrain.getInstance();
        return { status: 200, data: brain.getLiveBrainState(), timestamp };
      }

      return { status: 404, error: `Endpoint ${method} ${path} not found in Sovereign API router`, timestamp };
    } catch (e: any) {
      return { status: 500, error: e.message || 'Internal Server Error', timestamp };
    }
  }

  // HTTP Connect/Vite/Express middleware handler
  public handleHttpRequest(req: any, res: any): void {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method as any;
    const finish = async (payload: any) => {
      const headers = { ...(req.headers || {}) };
      // Browser cookies are not accepted as API credentials in this build; the
      // trusted OIDC integration must explicitly map a validated session to Bearer.
      const response = await this.handleRequest(pathname, method, payload, headers);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Sovereign-Version': '1.0.0',
        'X-Sovereign-Audit-Hash': this.durableStore.getState().audit_chain.slice(-1)[0]?.record_hash || '0'.repeat(64)
      });
      res.end(JSON.stringify(response.data ?? { error: response.error, status: response.status }));
    };

    if (req.body !== undefined) {
      void finish(req.body).catch(() => {
        if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Internal server error.' })); }
      });
      return;
    }

    let bodyData = '';
    req.on('data', (chunk: any) => {
      bodyData += chunk;
      if (Buffer.byteLength(bodyData) > 256 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: 'Request body too large.' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      let payload: any = {};
      if (bodyData) {
        try { payload = JSON.parse(bodyData); }
        catch { res.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Malformed JSON.' })); return; }
      }
      void finish(payload).catch(() => {
        if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: 'Internal server error.' })); }
      });
    });
  }
}
