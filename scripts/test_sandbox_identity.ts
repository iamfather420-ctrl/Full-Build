import assert from 'node:assert/strict';
import { SandboxTestIdentity } from '../src/auth/SandboxTestIdentity';
import { AuthService } from '../src/auth/AuthService';
import { SessionGuard } from '../src/auth/SessionGuard';
import { NodeRegistry } from '../src/nodes/NodeRegistry';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { PayPalAdapter } from '../src/payments/PayPalAdapter';
import { SolutionPipeline } from '../src/solutions/SolutionPipeline';
import { SqliteStore } from '../src/database/SqliteStore';

const original = {
  env: process.env.SOLVEX_ENV,
  enabled: process.env.FULL_BUILD_TEST_AUTH,
  secret: process.env.FULL_BUILD_TEST_AUTH_SECRET,
  nodeEnv: process.env.NODE_ENV
};
const restore = () => {
  for (const [key, value] of Object.entries({
    SOLVEX_ENV: original.env,
    FULL_BUILD_TEST_AUTH: original.enabled,
    FULL_BUILD_TEST_AUTH_SECRET: original.secret,
    NODE_ENV: original.nodeEnv
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

  assert.equal(NodeRegistry.getInstance().getAllNodes().length, 54, '54 nodes are registered');
  assert.equal(NodeRegistry.getInstance().getNode('DN-54')?.status, 'ACTIVE');
  const pipeline = SolutionPipeline.getInstance().runPipeline('SANDBOX-TEST', 'test');
  assert.equal(pipeline.overall_success, false, 'unimplemented pipeline must not report success');
  assert.match(pipeline.rejection_reason || '', /not implemented/i);
  const paymentStatus = await PayPalAdapter.getInstance().captureOrderPayment('sandbox-order', 100, 'sandbox-idem-key');
  assert.equal(paymentStatus.status, 'EXTERNAL_PROVIDER_REQUIRED', 'payments remain fail-closed without provider implementation');
  const health = await SovereignApiRouter.getInstance().handleRequest('/api/system/health', 'GET');
  assert.equal(health.status, 503, 'local readiness is blocked until required production gates exist');
  assert.equal((await SovereignApiRouter.getInstance().handleRequest('/api/system/health', 'POST')).status, 405);
  assert.equal((await SovereignApiRouter.getInstance().handleRequest('/api/not-found', 'GET')).status, 404);
  const sqlite = SqliteStore.getInstance();
  assert.equal(sqlite.isDiskBacked(), false,
    'this CI runtime has no native SQLite disk backend; report persistence as not verified');

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
  assert.throws(() => SandboxTestIdentity.issue({
    userId: 'x', tenantId: 'y', email: 'x@example.invalid', role: 'OWNER'
  }), /disabled outside explicit non-production sandbox mode/);

  process.env.NODE_ENV = 'test';
  process.env.SOLVEX_ENV = 'production';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'production environment rejects sandbox token');

  process.env.SOLVEX_ENV = 'sandbox';
  process.env.FULL_BUILD_TEST_AUTH = 'false';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'feature flag off rejects sandbox token');

  console.log('PASS: sandbox auth, session guard, role and tenant boundaries, 54-node registry, fail-closed pipeline/payments, API routing.');
  console.log('PERSISTENCE STATUS: ' + (SqliteStore.getInstance().isDiskBacked() ? 'disk-backed SQLite available' : 'NOT VERIFIED: in-memory SQLite fallback active'));
} finally {
  restore();
}
