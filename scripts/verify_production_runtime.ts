import fs from 'fs';
import path from 'path';
import { NeonStore } from '../src/database/NeonPersistence';

async function main() {
  const artifactsDir = path.resolve('artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const env = (process.env.SOLVEX_ENV || '').toLowerCase();
  const paymentsEnabled = (process.env.PAYMENTS_ENABLED || '').toLowerCase() === 'true';
  const neon = NeonStore.getInstance();
  const issues: string[] = [];

  const report: any = {
    test_suite: 'PRODUCTION_RUNTIME_WIRING_VERIFICATION',
    timestamp: new Date().toISOString(),
    environment: env,
    payments_enabled: paymentsEnabled,
    payment_provider_check: paymentsEnabled ? 'REQUIRED' : 'SKIPPED_PAYMENTS_DISABLED',
    neon_configured: neon.isConfigured(),
    neon_connected: false,
    neon_migrations_applied: false,
    neon_tables: null,
    rls_posture: null,
    paypal_live_authentication: null,
    secrets_disclosed: false,
    blockers: issues
  };

  if (env !== 'production') issues.push('SOLVEX_ENV must be production.');
  if (!neon.isConfigured()) issues.push('DATABASE_RUNTIME_URL (or NEON_DATABASE_URL) is missing from the runtime environment.');

  if (issues.length === 0) {
    report.neon_connected = await neon.connect();
    if (!report.neon_connected) {
      issues.push('Neon PostgreSQL connection failed closed.');
    } else {
      // This verifier is intentionally read-only. Never run schema migrations from a CI readiness check.
      report.neon_tables = await neon.verifyRequiredTables();
      if (report.neon_tables.verified !== report.neon_tables.required) {
        issues.push('Neon required-table verification failed: ' + report.neon_tables.missing.join(', '));
      }

      report.rls_posture = await neon.verifyRlsPosture();
      if (!report.rls_posture.success) {
        issues.push('Tenant-isolation RLS gate failed: RLS must be enabled and forced, each public table must have a policy, and the connected role must not bypass RLS.');
      }
    }
  }

  if (paymentsEnabled) {
    const { PayPalAdapter } = await import('../src/payments/PayPalAdapter');
    const paypal = PayPalAdapter.getInstance();
    const paypalEnv = paypal.getActiveEnvironment();
    report.paypal_active_environment = paypalEnv;
    if (paypalEnv !== 'live') {
      issues.push('Payments are enabled but PayPal active environment is not LIVE.');
    } else {
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
        issues.push('PayPal Live OAuth authentication failed while payments are enabled.');
      }
    }
  } else {
    report.paypal_active_environment = 'DISABLED_BY_CONFIGURATION';
    report.paypal_live_authentication = { skipped: true, reason: 'PAYMENTS_ENABLED is not true; payment collection must remain disabled.' };
  }

  report.blockers = [...issues];
  fs.writeFileSync(path.join(artifactsDir, 'production-runtime-verification.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (issues.length > 0) throw new Error(issues.join(' '));
}

main().catch((err) => {
  console.error('[PRODUCTION RUNTIME VERIFICATION FAILED]', err?.message || err);
  process.exit(1);
});
