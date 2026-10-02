import { AuthService } from '../auth/AuthService';
import { SqliteStore } from '../database/SqliteStore';
import { DurableStore } from '../database/DurableStore';
import { SolutionPipeline } from '../solutions/SolutionPipeline';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { SovereignApiRouter } from '../api/ApiRouter';

export interface EnterpriseTestResult { test_number: number; name: string; category: string; passed: boolean; duration_ms: number; details: Record<string, any>; error?: string; }
export interface EnterpriseVerificationReport { allPassed: boolean; totalTests: number; passedTests: number; results: EnterpriseTestResult[]; }

/** Security-oriented regression suite. It validates gates, not marketing claims. */
export async function runEnterpriseVerification(): Promise<EnterpriseVerificationReport> {
  const results: EnterpriseTestResult[] = [];
  const test = async (name: string, category: string, fn: () => void | Promise<void>) => {
    const started = Date.now();
    try { await fn(); results.push({ test_number: results.length + 1, name, category, passed: true, duration_ms: Date.now() - started, details: { status: 'PASSED' } }); }
    catch (error: any) { results.push({ test_number: results.length + 1, name, category, passed: false, duration_ms: Date.now() - started, details: { status: 'FAILED' }, error: error.message || String(error) }); }
  };

  await test('Authentication fails closed without a configured key', 'SECURITY', () => {
    const previous = process.env.SOLVEX_AUTH_SECRET; delete process.env.SOLVEX_AUTH_SECRET;
    const result = AuthService.getInstance().verifyToken('malformed.token');
    if (result.valid) throw new Error('Unauthenticated token was accepted');
    if (previous) process.env.SOLVEX_AUTH_SECRET = previous;
  });
  process.env.SOLVEX_AUTH_SECRET = process.env.SOLVEX_AUTH_SECRET || 'test-only-auth-secret-with-at-least-thirty-two-characters';
  await test('HMAC tokens enforce tamper detection, expiry, and tenant scope', 'SECURITY', () => {
    const auth = AuthService.getInstance(); const token = auth.createSignedToken('user_a', 'TENANT_ALPHA', 'a@example.test', 'CUSTOMER', 60_000);
    const user = auth.verifyToken(token).user; if (!user) throw new Error('Valid test token rejected');
    if (auth.verifyToken(`${token}x`).valid) throw new Error('Tampered token accepted');
    if (auth.authorize(user, 'VIEW_OWN', 'TENANT_BETA').authorized) throw new Error('Cross-tenant authorization accepted');
    const expired = auth.createSignedToken('user_a', 'TENANT_ALPHA', 'a@example.test', 'CUSTOMER', 1);
    const start = Date.now(); while (Date.now() - start < 3) { /* deterministic expiry wait */ }
    if (auth.verifyToken(expired).valid) throw new Error('Expired token accepted');
  });
  await test('SQLite repository persists and tenant-scopes records', 'PERSISTENCE', () => {
    const db = SqliteStore.getInstance(); const id = `persist_${Date.now()}`;
    db.insertTenantRecord('problems', 'TENANT_ALPHA', { id, raw_problem: 'P', status: 'INTAKE' });
    if (!db.findTenantRecordById('problems', 'TENANT_ALPHA', id)) throw new Error('Durable record missing');
    if (db.findTenantRecordById('problems', 'TENANT_BETA', id)) throw new Error('Cross-tenant record leaked');
  });
  await test('Daisy static intake creates a PARTIAL candidate, never VERIFIED', 'DAISY', () => {
    const result = SolutionPipeline.getInstance().runPipeline('DH-P-001', 'export function solve(value: number) { return value + 1; }', 'TENANT_ALPHA');
    if (result.verification_status !== 'PARTIAL' || result.overall_success) throw new Error('Candidate was not held pending evidence');
    const stored = SqliteStore.getInstance().findTenantRecordById<any>('solutions', 'TENANT_ALPHA', result.solution_id!);
    if (!stored || stored.verification_status === 'VERIFIED') throw new Error('Candidate persistence gate failed');
  });
  await test('Marketplace rejects candidate and proof substitution publication', 'MARKETPLACE', () => {
    const result = MarketplaceEngine.getInstance().publishOffer('DH-C-NOT-VERIFIED', 'PB-UNRELATED', 'bad', 'bad', 1000, 1, 'LOW');
    if (result.success) throw new Error('Unverified or mismatched solution published');
  });
  await test('PayPal checkout fails closed without server credentials', 'PAYMENTS', async () => {
    const keys = [
      'PAYPAL_ENVIRONMENT', 'PAYPAL_ACTIVE_ENVIORMENT', 'PAYPAL_ACTIVE_ENVIRONMENT',
      'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_LIVE_SECRET', 'PAYPAL_LIVE_LIVE_NT_SECRET',
      'PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_SANDBOX_ID', 'PAYPAL_SANDBOX_KEY', 'PAYPAL_SANDBOX_SECRET',
      'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'
    ];
    const saved = new Map<string, string | undefined>();
    for (const key of keys) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
    try {
      const result = await PayPalAdapter.getInstance().createCheckout('missing_order', 'TENANT_ALPHA', 'idempotency-key-123');
      if (result.status !== 'EXTERNAL_PROVIDER_REQUIRED') throw new Error(`Unexpected gateway status ${result.status}`);
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  await test('Sensitive API routes reject unauthenticated callers', 'API', async () => {
    const api = SovereignApiRouter.getInstance();
    const [order, pipeline, capture] = await Promise.all([
      api.handleRequest('/api/orders', 'POST', { offer_id: 'missing' }),
      api.handleRequest('/api/solutions/pipeline', 'POST', { paradox_code: 'DH-P-001', code_solution: 'export function x(){}' }),
      api.handleRequest('/api/payments/checkout', 'POST', { order_id: 'missing', idempotency_key: 'idempotency-key-123' })
    ]);
    if ([order, pipeline, capture].some(response => response.status !== 401)) throw new Error('A sensitive route did not require authentication');
  });
  await test('Public login does not mint caller-selected roles or tenants', 'API', async () => {
    const response = await SovereignApiRouter.getInstance().handleRequest('/api/auth/login', 'POST', { role: 'OWNER', tenant_id: 'TENANT_OTHER' });
    if (response.status !== 410) throw new Error('Deprecated login endpoint remained active');
  });
  await test('Audit chain detects payload tampering', 'AUDIT', () => {
    const durable = DurableStore.getInstance(); const record = durable.appendAudit('TENANT_ALPHA', 'TEST', 'TEST', 'ENTITY', 'ID', { value: 1 });
    record.payload.value = 2; if (durable.verifyChain().valid) throw new Error('Tampered audit payload was accepted');
    record.payload.value = 1; if (!durable.verifyChain().valid) throw new Error('Audit state did not recover after test cleanup');
  });
  return { allPassed: results.every(result => result.passed), totalTests: results.length, passedTests: results.filter(result => result.passed).length, results };
}
