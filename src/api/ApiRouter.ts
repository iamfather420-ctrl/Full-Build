import { SystemStatusService } from './SystemStatus';
import { DurableStore } from '../database/DurableStore';
import { SqliteStore } from '../database/SqliteStore';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { ParadoxRegistry } from '../paradoxes/ParadoxRegistry';
import { ProofEngine } from '../proofs/ProofEngine';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { ExternalAdapterRegistry } from '../adapters/ExternalAdapters';
import { CrystalClearBox } from '../audit/CrystalClearBox';
import { AuthService, UserContext, SovereignRole } from '../auth/AuthService';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { ReversibilityEngine } from '../database/ReversibilityEngine';
import { DaisyBrain } from '../brain/DaisyBrain';
import { computeSha256 } from '../database/DatabaseSchema';
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

  private extractAuthUser(headers: Record<string, string | string[] | undefined>): UserContext | null {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const verified = this.authService.verifyToken(token);
    return verified.valid && verified.user ? verified.user : null;
  }

  public async handleRequest(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    payload?: any,
    headers: Record<string, string | string[] | undefined> = {}
  ): Promise<ApiResponse> {
    const timestamp = Date.now();
    const user = this.extractAuthUser(headers);

    try {
      // 1. /api/auth
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, role = 'CUSTOMER', tenant_id = 'TENANT_ENTERPRISE_DEMO' } = payload || {};
        if (!email) return { status: 400, error: 'Email is required for authentication', timestamp };
        const token = this.authService.createSignedToken(`usr_${Date.now()}`, tenant_id, email, role as SovereignRole);
        return {
          status: 200,
          data: { token, user: this.authService.verifyToken(token).user },
          timestamp
        };
      }
      if (path === '/api/auth/me' && method === 'GET') {
        if (!user) return { status: 401, error: 'Unauthorized: Missing or invalid token', timestamp };
        return { status: 200, data: user, timestamp };
      }

      // 2. /api/tenants
      if (path === '/api/tenants' && method === 'GET') {
        const tenants = this.sqlite.getRawDb().all('SELECT id, name, tier, status, created_at FROM tenants');
        return { status: 200, data: tenants, timestamp };
      }
      if (path === '/api/tenants' && method === 'POST') {
        if (!user || user.role !== 'OWNER') {
          return { status: 403, error: 'Forbidden: Only OWNER can create tenants', timestamp };
        }
        const { id, name, tier = 'ENTERPRISE' } = payload || {};
        if (!id || !name) return { status: 400, error: 'Tenant id and name required', timestamp };
        const key = computeSha256(`KEY_${id}`);
        this.sqlite.insertRecord('tenants', { id, name, tier, isolated_storage_key: key, status: 'ACTIVE' });
        return { status: 201, data: { id, name, tier }, timestamp };
      }

      // 3. /api/problems
      if (path === '/api/problems' && method === 'GET') {
        const targetTenant = user ? user.tenant_id : 'TENANT_ENTERPRISE_DEMO';
        const problems = this.sqlite.findTenantRecords('problems', targetTenant);
        return { status: 200, data: problems, timestamp };
      }
      if (path === '/api/problems' && method === 'POST') {
        const targetTenant = user ? user.tenant_id : (payload?.tenant_id || 'TENANT_ENTERPRISE_DEMO');
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
        const targetTenant = user ? user.tenant_id : 'TENANT_SOVEREIGN_ROOT';
        const invariants = this.sqlite.findTenantRecords('invariants', targetTenant);
        return { status: 200, data: invariants, timestamp };
      }

      // 6. /api/solutions
      if (path === '/api/solutions' && method === 'GET') {
        const solutions = Object.values(this.durableStore.getState().solutions);
        return { status: 200, data: solutions, timestamp };
      }
      if (path === '/api/solutions/pipeline' && method === 'POST') {
        if (user) {
          const auth = this.authService.authorize(user, 'RUN_PIPELINE');
          if (!auth.authorized) return { status: 403, error: auth.reason, timestamp };
        }
        const { paradox_code = 'DH-P-001', code_solution } = payload || {};
        const pipeline = SolutionPipeline.getInstance();
        const res = pipeline.runPipeline(paradox_code, code_solution || 'export function defaultSolve() { return true; }');
        return { status: 200, data: res, timestamp };
      }

      // 7. /api/verification
      if (path === '/api/verification' && method === 'GET') {
        const runs = this.sqlite.getRawDb().all('SELECT * FROM verification_runs ORDER BY created_at DESC LIMIT 20');
        return { status: 200, data: runs, timestamp };
      }

      // 8. /api/proofs
      if (path === '/api/proofs' && method === 'GET') {
        const bundles = ProofEngine.getInstance().getAllBundles();
        return { status: 200, data: bundles, timestamp };
      }
      if (path.startsWith('/api/proofs/evidence/') && method === 'GET') {
        const proofId = path.replace('/api/proofs/evidence/', '');
        const bundle = ProofEngine.getInstance().getBundle(proofId);
        if (!bundle) return { status: 404, error: 'Proof bundle not found', timestamp };
        const evidence = CrystalClearBox.projectCustomerEvidence(bundle);
        return { status: 200, data: evidence, timestamp };
      }

      // 8b. Real Z3 Automated Theorem Prover
      if (path === '/api/proofs/z3/theorems' && method === 'GET') {
        const engine = Z3FormalProofEngine.getInstance();
        return { status: 200, data: engine.getCatalog(), timestamp };
      }
      if (path === '/api/proofs/z3/prove' && method === 'POST') {
        const { theorem_id, custom_name, custom_smt_script, expected_result } = payload || {};
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
        const offers = Object.values(this.durableStore.getState().offers);
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

      // 10. /api/orders
      if (path === '/api/orders' && method === 'GET') {
        const targetTenant = user ? user.tenant_id : 'TENANT_ENTERPRISE_DEMO';
        const orders = this.sqlite.findTenantRecords('orders', targetTenant);
        return { status: 200, data: orders, timestamp };
      }
      if (path === '/api/orders' && method === 'POST') {
        const targetTenant = user ? user.tenant_id : (payload?.tenant_id || 'TENANT_ENTERPRISE_DEMO');
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

      // 11. /api/payments
      if (path === '/api/payments/capture' && method === 'POST') {
        const { order_id, amount_cents, idempotency_key } = payload || {};
        if (!order_id || !amount_cents) return { status: 400, error: 'order_id and amount_cents required', timestamp };
        const paypal = PayPalAdapter.getInstance();
        const res = paypal.captureOrderPayment(order_id, amount_cents, idempotency_key || `idemp_${Date.now()}`);
        return { status: 200, data: res, timestamp };
      }
      if (path === '/api/payments/paypal/status' && method === 'GET') {
        const paypal = PayPalAdapter.getInstance();
        const info = paypal.getMaskedCredentialsInfo();
        return { status: 200, data: info, timestamp };
      }
      if (path === '/api/payments/paypal/test' && method === 'POST') {
        const { client_id, client_secret, environment } = payload || {};
        const paypal = PayPalAdapter.getInstance();
        const res = await paypal.testLiveCredentials(client_id, client_secret, environment);
        return { status: 200, data: res, timestamp };
      }
      if (path === '/api/payments/paypal/configure' && method === 'POST') {
        const { client_id, client_secret, environment = 'sandbox' } = payload || {};
        if (!client_id || !client_secret) return { status: 400, error: 'client_id and client_secret required', timestamp };
        const paypal = PayPalAdapter.getInstance();
        const configured = paypal.setSessionCredentials(client_id, client_secret, environment);
        if (!configured) return { status: 403, error: 'Production PayPal credentials are deployment-authoritative and cannot be overridden at runtime.', timestamp };
        return { status: 200, data: { success: true, message: 'PayPal credentials updated in active session.' }, timestamp };
      }

      // 12. /api/deployments
      if (path === '/api/deployments' && method === 'GET') {
        const targetTenant = user ? user.tenant_id : 'TENANT_ENTERPRISE_DEMO';
        const deployments = this.sqlite.findTenantRecords('deployments', targetTenant);
        return { status: 200, data: deployments, timestamp };
      }

      // 13. /api/telemetry
      if (path === '/api/telemetry' && method === 'GET') {
        const targetTenant = user ? user.tenant_id : 'TENANT_SOVEREIGN_ROOT';
        const telemetry = this.sqlite.findTenantRecords('telemetry', targetTenant, 50);
        return { status: 200, data: telemetry, timestamp };
      }

      // 14. /api/audit
      if (path === '/api/audit' && method === 'GET') {
        const targetTenant = user ? user.tenant_id : 'TENANT_SOVEREIGN_ROOT';
        const records = this.sqlite.findTenantRecords('audit_records', targetTenant, 50);
        return { status: 200, data: records, timestamp };
      }

      // 15. /api/audit/chain
      if (path === '/api/audit/chain' && method === 'GET') {
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
        const verification = this.durableStore.verifyChain();
        return { status: 200, data: verification, timestamp };
      }

      // 16. /api/rollback
      if (path === '/api/rollback' && method === 'POST') {
        if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
          return { status: 403, error: 'Forbidden: Insufficient privileges for rollback', timestamp };
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
        const nodes = NodeRegistry.getInstance().getAllNodes();
        return { status: 200, data: nodes, timestamp };
      }

      // 18. /api/adapters
      if (path === '/api/adapters' && method === 'GET') {
        const inventory = ExternalAdapterRegistry.getInventory();
        return { status: 200, data: inventory, timestamp };
      }

      // 19. /api/system/status
      if (path === '/api/system/status' && method === 'GET') {
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
    // Express removes the `/api` mount prefix from req.url. The internal
    // router uses canonical `/api/...` paths, so restore the prefix when the
    // middleware is mounted under `/api` while remaining compatible with a
    // direct invocation in tests.
    const pathname = url.pathname === '/api' || url.pathname.startsWith('/api/')
      ? url.pathname
      : `/api${url.pathname}`;
    const method = req.method as any;
    let bodyData = '';

    req.on('data', (chunk: any) => { bodyData += chunk; });
    req.on('end', async () => {
      let payload: any = undefined;
      if (bodyData) {
        try { payload = JSON.parse(bodyData); } catch (e) {}
      }
      const response = await this.handleRequest(pathname, method, payload, req.headers || {});
      res.writeHead(response.status, {
        'Content-Type': 'application/json',
        'X-Sovereign-Version': '1.0.0-PROD',
        'X-Sovereign-Audit-Hash': this.durableStore.getState().audit_chain.slice(-1)[0]?.record_hash || '0'.repeat(64)
      });
      res.end(JSON.stringify(response.data || { error: response.error, status: response.status }));
    });
  }
}
