import fs from 'fs';
import path from 'path';
import { NeonStore } from '../src/database/NeonPersistence';
import { PayPalAdapter } from '../src/payments/PayPalAdapter';

async function main() {
  const artifactsDir = path.resolve('artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const env = (process.env.SOLVEX_ENV || '').toLowerCase();
  const paypalEnv = PayPalAdapter.getInstance().getActiveEnvironment();
  const neon = NeonStore.getInstance();

  const report: any = {
    test_suite: 'PRODUCTION_RUNTIME_WIRING_VERIFICATION',
    timestamp: new Date().toISOString(),
    environment: env,
    paypal_active_environment: paypalEnv,
    neon_configured: neon.isConfigured(),
    neon_connected: false,
    neon_migrations: null,
    neon_tables: null,
    paypal_live_authentication: null,
    secrets_disclosed: false
  };

  if (env !== 'production') throw new Error('Production runtime verification requires SOLVEX_ENV=production.');
  if (paypalEnv !== 'live') throw new Error('Production runtime verification requires PayPal active environment LIVE.');
  if (!neon.isConfigured()) throw new Error('NEON_DATABASE_URL is missing from the runtime environment.');

  report.neon_connected = await neon.connect();
  if (!report.neon_connected) throw new Error('Neon PostgreSQL connection failed closed.');

  report.neon_migrations = await neon.runMigrations();
  if (!report.neon_migrations.success) throw new Error('Neon schema initialization failed: ' + report.neon_migrations.error);

  report.neon_tables = await neon.verifyRequiredTables();
  if (report.neon_tables.verified !== report.neon_tables.required) {
    throw new Error('Neon required-table verification failed: ' + report.neon_tables.missing.join(', '));
  }

  const paypal = PayPalAdapter.getInstance();
  const auth = await paypal.testLiveCredentials();
  report.paypal_live_authentication = {
    valid: auth.valid,
    status_code: auth.status_code,
    environment: auth.environment,
    gateway_state: auth.gateway_state,
    client_id_preview: auth.client_id_preview,
    app_id: auth.app_id,
    expires_in: auth.expires_in
  };

  if (!auth.valid || auth.environment !== 'live') {
    throw new Error('PayPal Live OAuth authentication failed.');
  }

  fs.writeFileSync(path.join(artifactsDir, 'production-runtime-verification.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('[PRODUCTION RUNTIME VERIFICATION FAILED]', err?.message || err);
  process.exit(1);
});
