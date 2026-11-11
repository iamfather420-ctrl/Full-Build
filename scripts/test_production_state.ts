import assert from 'node:assert/strict';
import { ProductionStateService } from '../src/production/ProductionState';

const keys = ['SOLVEX_ENV', 'OIDC_ISSUER', 'OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'DATABASE_URL', 'NEON_DATABASE_URL', 'PAYMENTS_ENABLED'] as const;
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function restore() {
  for (const key of keys) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  process.env.SOLVEX_ENV = 'production';
  process.env.OIDC_ISSUER = 'https://legacy-issuer.example';
  delete process.env.OIDC_ISSUER_URL;
  process.env.OIDC_CLIENT_ID = 'test-client';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
  delete process.env.NEON_DATABASE_URL;
  process.env.PAYMENTS_ENABLED = 'false';

  const legacyOnly = ProductionStateService.getState();
  assert.equal(legacyOnly.authentication_configured, false, 'Legacy OIDC_ISSUER must not satisfy the API OIDC configuration check.');
  assert.equal(legacyOnly.authentication_enabled, false);
  assert.ok(legacyOnly.blockers.some((item) => item.includes('OIDC_ISSUER_URL')));

  process.env.OIDC_ISSUER_URL = 'https://issuer.example';
  const aligned = ProductionStateService.getState();
  assert.equal(aligned.authentication_configured, true, 'The issuer/client names consumed by the API must be recognized.');
  assert.equal(aligned.authentication_enabled, true);
  assert.equal(aligned.blockers.length, 0, 'With production, matching OIDC config, database URL and disabled payments, configuration readiness should be clear.');

  console.log('PASS: production readiness uses the API OIDC variable names and rejects the obsolete issuer alias.');
} finally {
  restore();
}
