import assert from 'node:assert/strict';
import { SandboxTestIdentity } from '../src/auth/SandboxTestIdentity';

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

  const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
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
  assert.throws(() => SandboxTestIdentity.issue({
    userId: 'x', tenantId: 'y', email: 'x@example.invalid', role: 'OWNER'
  }), /disabled outside explicit non-production sandbox mode/);

  process.env.NODE_ENV = 'test';
  process.env.SOLVEX_ENV = 'production';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'production environment rejects sandbox token');

  process.env.SOLVEX_ENV = 'sandbox';
  process.env.FULL_BUILD_TEST_AUTH = 'false';
  assert.equal(SandboxTestIdentity.verify(token).valid, false, 'feature flag off rejects sandbox token');

  console.log('PASS: sandbox test identity checks (valid token, tampering, tenant isolation, role authorization, production rejection, explicit opt-in).');
} finally {
  restore();
}
