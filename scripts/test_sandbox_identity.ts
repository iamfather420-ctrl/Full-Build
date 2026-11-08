import assert from 'node:assert/strict';
import { SandboxTestIdentity } from '../src/auth/SandboxTestIdentity';
import { AuthService } from '../src/auth/AuthService';
import { SessionGuard } from '../src/auth/SessionGuard';
import { NodeRegistry } from '../src/nodes/NodeRegistry';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { PayPalAdapter } from '../src/payments/PayPalAdapter';
import { SolutionPipeline } from '../src/solutions/SolutionPipeline';
import { SqliteStore } from '../src/database/SqliteStore';
import { OrderLifecycleManager } from '../src/marketplace/OrderLifecycle';
import { DurableStore } from '../src/database/DurableStore';
import { PayPalSandboxClient } from '../src/payments/PayPalSandboxClient';
import { NeonSandboxReadOnlyAudit } from '../src/database/NeonSandboxReadOnlyAudit';

const original = {
  env: process.env.SOLVEX_ENV,
  enabled: process.env.FULL_BUILD_TEST_AUTH,
  secret: process.env.FULL_BUILD_TEST_AUTH_SECRET,
  nodeEnv: process.env.NODE_ENV,
  paypalEnvironment: process.env.PAYPAL_ENVIRONMENT,
  paypalClientId: process.env.PAYPAL_SANDBOX_CLIENT_ID,
  paypalClientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET,
  neonSandboxUrl: process.env.NEON_SANDBOX_DATABASE_URL,
  databaseUrl: process.env.DATABASE_URL
};
const restore = () => {
  for (const [key, value] of Object.entries({
    SOLVEX_ENV: original.env,
    FULL_BUILD_TEST_AUTH: original.enabled,
    FULL_BUILD_TEST_AUTH_SECRET: original.secret,
    NODE_ENV: original.nodeEnv,
    PAYPAL_ENVIRONMENT: original.paypalEnvironment,
    PAYPAL_SANDBOX_CLIENT_ID: original.paypalClientId,
    PAYPAL_SANDBOX_CLIENT_SECRET: original.paypalClientSecret,
    NEON_SANDBOX_DATABASE_URL: original.neonSandboxUrl,
    DATABASE_URL: original.databaseUrl
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

try {
  process.env.SOLVEX_ENV = 'sandbox';
  process.env.FULL_BUILD_TEST_AUTH = 'true';
  process.env.FULL_BUILD_TEST_AUTH_SECRET = 'test-only-secret-with-at-least-32-characters';
  process.env.NODE_ENV = 'test';

  const token = SandboxTestIdentity.issue({
    userId: 'sandbox-user-1',
    tenantId: 'sandbox-tenant-a',
    email: 'test@example.invalid',
    role: 'CUSTOMER',
    ttlSeconds: 120
  });
  assert.equal(SandboxTestIdentity.verify(token).valid, true, 'valid sandbox token is accepted');

  const auth = AuthService.getInstance();
  const issued = auth.createSignedToken('sandbox-user-1', 'sandbox-tenant-a', 'test@example.invalid', 'CUSTOMER');
  const verified = auth.verifyToken(issued);
  assert.equal(verified.valid, true, 'AuthService verifies the sandbox token');
  assert.ok(verified.user, 'AuthService returns a verified user context');
  assert.equal(auth.authorize(verified.user, 'CREATE_ORDER', 'sandbox-tenant-a').authorized, true);
  assert.equal(auth.authorize(verified.user, 'MANAGE_TENANTS', 'sandbox-tenant-a').authorized, false);
  assert.equal(SessionGuard.requireVerifiedSession(verified.user, 'CREATE_ORDER', 'sandbox-tenant-a').authorized, true);
  assert.equal(SessionGuard.requireVerifiedSession(verified.user, 'CREATE_ORDER', 'sandbox-tenant-b').authorized, false);
  assert.equal(auth.authorize({ ...verified.user }, 'CREATE_ORDER', 'sandbox-tenant-a').authorized, false,
    'unverified object copies cannot impersonate a verified identity');

  const lifecycleOwnerToken = auth.createSignedToken(
    'sandbox-owner-1', 'sandbox-tenant-a', 'owner@example.invalid', 'OWNER'
  );
  const lifecycleOwner = auth.verifyToken(lifecycleOwnerToken);
  assert.equal(lifecycleOwner.valid, true);
  assert.ok(lifecycleOwner.user);
  sqlite.insertTenantRecord('orders', 'sandbox-tenant-a', {
    id: 'sandbox-order-lifecycle-1',
    status: 'OFFER',
    amount_cents: 100,
    currency: 'USD'
  });
  const lifecycle = OrderLifecycleManager.getInstance();
  const created = lifecycle.transitionOrder(
    'sandbox-order-lifecycle-1', 'ORDER_CREATED', lifecycleOwner.user, { test: 'sandbox-offer-accepted' }
  );
  assert.equal(created.success, true, 'authorized owner can transition OFFER to ORDER_CREATED');
  const persistedCreated = sqlite.findTenantRecordById<any>('orders', 'sandbox-tenant-a', 'sandbox-order-lifecycle-1');
  assert.equal(persistedCreated?.status, 'ORDER_CREATED', 'order state persists in selected local store');

  const illegalJump = lifecycle.transitionOrder(
    'sandbox-order-lifecycle-1', 'DEPLOYED', lifecycleOwner.user, { test: 'illegal-transition' }
  );
  assert.equal(illegalJump.success, false, 'illegal lifecycle jumps are rejected');
  const crossTenantOrder = sqlite.findTenantRecordById<any>('orders', 'sandbox-tenant-a', 'sandbox-order-lifecycle-1');
  assert.equal(crossTenantOrder?.status, 'ORDER_CREATED', 'illegal transition does not mutate order state');

  const crossTenantOrderId = 'sandbox-order-other-tenant';
  sqlite.insertTenantRecord('orders', 'sandbox-tenant-b', { id: crossTenantOrderId, status: 'OFFER' });
  const crossTenantTransition = lifecycle.transitionOrder(
    crossTenantOrderId, 'ORDER_CREATED', lifecycleOwner.user, { test: 'cross-tenant' }
  );
  assert.equal(crossTenantTransition.success, false, 'owner cannot transition another tenant order');
  assert.match(crossTenantTransition.error || '', /tenant mismatch|tenant/i);

  const chain = DurableStore.getInstance().verifyChain();
  assert.equal(chain.valid, true, 'order lifecycle audit chain remains internally consistent');
  assert.ok(chain.total_records >= 1, 'successful order transition appends an audit record');

  assert.equal(NodeRegistry.getInstance().getAllNodes().length, 54, '54 nodes are registered');
  assert.equal(NodeRegistry.getInstance().getNode('DN-54')?.status, 'ACTIVE');
  const pipeline = SolutionPipeline.getInstance().runPipeline('SANDBOX-TEST', 'test');
  assert.equal(pipeline.overall_success, false, 'unimplemented pipeline must not report success');
  assert.match(pipeline.rejection_reason || '', /not implemented/i);
  const paymentStatus = await PayPalAdapter.getInstance().captureOrderPayment('sandbox-order', 100, 'sandbox-idem-key');
  assert.equal(paymentStatus.status, 'EXTERNAL_PROVIDER_REQUIRED', 'payments remain fail-closed without provider implementation');

  let paypalFetchCalls = 0;
  process.env.PAYPAL_ENVIRONMENT = 'live';
  process.env.PAYPAL_SANDBOX_CLIENT_ID = 'sandbox-client-id';
  process.env.PAYPAL_SANDBOX_CLIENT_SECRET = 'sandbox-client-secret';
  const paypalSandbox = new PayPalSandboxClient(async () => {
    paypalFetchCalls++;
    return new Response(JSON.stringify({ access_token: 'sandbox-token', token_type: 'Bearer' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  });
  const blockedLiveMode = await paypalSandbox.verifyCredentials();
  assert.equal(blockedLiveMode.authenticated, false, 'sandbox verifier refuses live environment mode');
  assert.equal(paypalFetchCalls, 0, 'live mode rejection makes no outbound request');

  process.env.PAYPAL_ENVIRONMENT = 'sandbox';
  const paypalSuccess = new PayPalSandboxClient(async (url, init) => {
    paypalFetchCalls++;
    assert.equal(String(url), 'https://api-m.sandbox.paypal.com/v1/oauth2/token');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, 'grant_type=client_credentials');
    assert.match(String((init?.headers as Record<string, string>).Authorization), /^Basic /);
    return new Response(JSON.stringify({ access_token: 'sandbox-token', token_type: 'Bearer' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  });
  const paypalVerified = await paypalSuccess.verifyCredentials();
  assert.equal(paypalVerified.authenticated, true, 'sandbox OAuth credential check accepts a valid response');
  assert.equal(paypalVerified.environment, 'sandbox');
  assert.equal(paypalFetchCalls, 1, 'only the sandbox OAuth endpoint is called');

  process.env.NEON_SANDBOX_DATABASE_URL = '';
  process.env.DATABASE_URL = 'postgresql://must-not-fallback.invalid/database';
  assert.equal(await NeonSandboxReadOnlyAudit.fromSandboxEnvironment(), null,
    'Neon sandbox audit never falls back to a generic DATABASE_URL');

  const requiredTables = [
    'users', 'tenants', 'roles', 'permissions', 'tenant_memberships',
    'problems', 'paradoxes', 'invariants', 'solutions', 'offers',
    'proof_bundles', 'proof_evidence', 'tests', 'verification_runs',
    'orders', 'payments', 'deployments', 'checkpoints', 'rollback_records',
    'telemetry', 'audit_records', 'chain_records', 'licenses',
    'adapter_status', 'node_registry', 'execution_runs', 'failures'
  ];
  const neonStatements: string[] = [];
  const neonAudit = new NeonSandboxReadOnlyAudit(async (sql) => {
    neonStatements.push(sql);
    if (sql.includes('SELECT 1 AS connected')) return [{ connected: 1 }];
    if (sql.includes('information_schema.tables')) return requiredTables.map(table_name => ({ table_name }));
    if (sql.includes('pg_class')) return requiredTables.map(table_name => ({
      table_name, rls_enabled: true, rls_forced: true, policy_count: 1, role_bypass_rls: false
    }));
    throw new Error('Unexpected SQL statement in read-only audit');
  });
  const neonResult = await neonAudit.audit();
  assert.equal(neonResult.connected, true);
  assert.equal(neonResult.present_tables, 27);
  assert.equal(neonResult.tenant_isolation_verified, true);
  assert.equal(neonResult.read_only, true);
  assert.ok(neonStatements.every(sql => /^\\s*SELECT\\b/i.test(sql)),
    'Neon audit issues SELECT statements only');

  const unsafeNeonAudit = new NeonSandboxReadOnlyAudit(async (sql) => {
    if (sql.includes('SELECT 1 AS connected')) return [{ connected: 1 }];
    if (sql.includes('information_schema.tables')) return requiredTables.map(table_name => ({ table_name }));
    if (sql.includes('pg_class')) return requiredTables.map((table_name, index) => ({
      table_name, rls_enabled: index !== 0, rls_forced: index !== 0,
      policy_count: index === 0 ? 0 : 1, role_bypass_rls: false
    }));
    return [];
  });
  const unsafeNeonResult = await unsafeNeonAudit.audit();
  assert.equal(unsafeNeonResult.tenant_isolation_verified, false,
    'Neon audit does not pass when even one table lacks forced RLS and a policy');
  const health = await SovereignApiRouter.getInstance().handleRequest('/api/system/health', 'GET');
  assert.equal(health.status, 503, 'local readiness is blocked until required production gates exist');
  assert.equal((await SovereignApiRouter.getInstance().handleRequest('/api/system/health', 'POST')).status, 405);
  assert.equal((await SovereignApiRouter.getInstance().handleRequest('/api/not-found', 'GET')).status, 404);
  const sqlite = SqliteStore.getInstance();
  console.log('LOCAL SQLITE BACKEND: ' + (sqlite.isDiskBacked() ? 'disk-backed' : 'in-memory; durable persistence not verified'));

  const [payloadPart, signaturePart] = token.split('.');
  const tamperedSignature = (signaturePart.startsWith('a') ? 'b' : 'a') + signaturePart.slice(1);
  const tampered = payloadPart + '.' + tamperedSignature;
  assert.equal(SandboxTestIdentity.verify(tampered).valid, false, 'tampered token is rejected');

  const sameTenant = SandboxTestIdentity.authorize(token, 'CREATE_ORDER', 'sandbox-tenant-a');
  assert.equal(sameTenant.authenticated, true);
  assert.equal(sameTenant.authorized, true);

  const crossTenant = SandboxTestIdentity.authorize(token, 'CREATE_ORDER', 'sandbox-tenant-b');
  assert.equal(crossTenant.authenticated, true);
  assert.equal(crossTenant.authorized, false, 'cross-tenant access is rejected');

  const privilegeEscalation = SandboxTestIdentity.authorize(token, 'MANAGE_TENANTS', 'sandbox-tenant-a');
  assert.equal(privilegeEscalation.authorized, false, 'customer cannot escalate to admin');

  process.env.NODE_ENV = 'production';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'sandbox identity is disabled in production');
  assert.equal(auth.authorize(verified.user, 'CREATE_ORDER', 'sandbox-tenant-a').authorized, false,
    'previously verified sandbox users are rejected immediately in production');
  assert.equal(SessionGuard.requireVerifiedSession(verified.user, 'CREATE_ORDER', 'sandbox-tenant-a').authenticated, false,
    'previously verified sandbox sessions are no longer authenticated in production');
  assert.throws(() => SandboxTestIdentity.issue({
    userId: 'x', tenantId: 'y', email: 'x@example.invalid', role: 'OWNER'
  }), /disabled outside explicit non-production sandbox mode/);

  process.env.NODE_ENV = 'test';
  process.env.SOLVEX_ENV = 'production';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'production environment rejects sandbox token');

  process.env.SOLVEX_ENV = 'sandbox';
  process.env.FULL_BUILD_TEST_AUTH = 'false';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'feature flag off rejects sandbox token');

  console.log('PASS: sandbox auth, session guard, role and tenant boundaries, 54-node registry, order lifecycle transitions, audit chain, API routing, PayPal sandbox-only OAuth verifier, read-only Neon schema/RLS audit, fail-closed live payments.');
  console.log('PERSISTENCE STATUS: ' + (SqliteStore.getInstance().isDiskBacked() ? 'disk-backed SQLite available' : 'NOT VERIFIED: in-memory SQLite fallback active'));
} finally {
  restore();
}
