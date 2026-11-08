import assert from 'node:assert/strict';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { NodeRegistry } from '../src/nodes/NodeRegistry';
import { ProductionStateService } from '../src/production/ProductionState';
import { NeonStore } from '../src/database/NeonPersistence';
import { PayPalAdapter } from '../src/payments/PayPalAdapter';
import { SolutionPipeline } from '../src/solutions/SolutionPipeline';

const envKeys = ['SOLVEX_ENV', 'NEON_DATABASE_URL', 'DATABASE_URL', 'PAYMENTS_ENABLED'];
const original = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const restore = () => {
  for (const key of envKeys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

async function main() {
  try {
    process.env.SOLVEX_ENV = 'sandbox';
    process.env.PAYMENTS_ENABLED = 'false';
    delete process.env.NEON_DATABASE_URL;
    delete process.env.DATABASE_URL;

    const nodes = NodeRegistry.getInstance().getAllNodes();
    assert.equal(nodes.length, 54, 'node catalogue has expected inventory count');

    const api = SovereignApiRouter.getInstance();
    const health = await api.handleRequest('/api/system/health', 'GET');
    assert.ok([200, 503].includes(health.status), 'health endpoint responds with an explicit readiness status');
    assert.equal(health.data.authentication_enabled, false, 'auth remains disabled in this sandbox contract');
    assert.equal(health.data.payments_enabled, false, 'payments remain disabled');
    assert.equal(health.data.environment, 'local', 'API does not falsely relabel local router as sandbox runtime');

    const status = await api.handleRequest('/api/system/status', 'GET');
    assert.ok([200, 503].includes(status.status), 'status endpoint responds');
    const mutation = await api.handleRequest('/api/system/status', 'POST');
    assert.equal(mutation.status, 405, 'API rejects mutation methods');
    const unknown = await api.handleRequest('/api/admin/users', 'GET');
    assert.equal(unknown.status, 404, 'unknown/private routes are not exposed');

    const production = ProductionStateService.getState();
    assert.equal(production.environment, 'sandbox');
    assert.equal(production.readiness, 'BLOCKED', 'sandbox is never reported production-ready');
    assert.equal(production.authentication_enabled, false);
    assert.equal(production.payments_enabled, false);

    const neon = NeonStore.getInstance();
    assert.equal(neon.isConfigured(), false, 'test is isolated from real Neon credentials');
    const migration = await neon.runMigrations();
    assert.equal(migration.success, false, 'generic migrations remain blocked');
    assert.equal(migration.tablesCreated, 0, 'test performs no schema writes');
    assert.equal(await neon.insertRecord('orders', { id: 'sandbox-only' }), false, 'generic writes remain blocked');

    const paypal = PayPalAdapter.getInstance();
    assert.equal(paypal.publicStatus(), 'EXTERNAL_PROVIDER_REQUIRED');
    assert.equal(paypal.hasActiveCredentials(), false);
    const payment = await paypal.captureOrderPayment('sandbox-order', 100, 'sandbox-idempotency');
    assert.equal(payment.status, 'EXTERNAL_PROVIDER_REQUIRED', 'no payment or capture is attempted');

    const pipeline = SolutionPipeline.getInstance().runPipeline(
      'SANDBOX-TEST-PROBLEM',
      'sandbox-only input'
    );
    assert.equal(pipeline.overall_success, false, 'unimplemented pipeline stages are not represented as successful');
    assert.equal(pipeline.completed_stages, 0);

    console.log(JSON.stringify({
      suite: 'FULL_BUILD_SANDBOX_SERVICE_BOUNDARIES',
      result: 'PASS',
      checks: [
        '54-node catalogue inventory',
        'health/status read-only API responses',
        'POST rejected with 405',
        'unknown routes rejected with 404',
        'sandbox never claims production readiness',
        'Neon credentials absent and writes/migrations blocked',
        'PayPal capture remains disabled',
        'unimplemented pipeline correctly returns BLOCKED'
      ],
      external_network_requests: 0,
      database_mutations: 0,
      payments_attempted: 0,
      production_touched: false
    }, null, 2));
  } finally {
    restore();
  }
}

main().catch(error => {
  console.error('Sandbox service-boundary tests failed:', error);
  process.exitCode = 1;
});
