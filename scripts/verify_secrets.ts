import fs from 'node:fs';
import path from 'node:path';
import { computeSha256 } from '../src/database/DatabaseSchema';
import { readSolvexEnvironment, validateEnvironmentConfiguration, evidenceEnvironment } from '../src/services/EnvironmentConfig';

type SecretStatus = 'CONFIGURED' | 'MISSING' | 'INVALID_FORMAT' | 'NOT_REQUIRED_IN_THIS_ENVIRONMENT';
interface SecretCheck { name: string; status: SecretStatus; required: boolean; environment: string; reason: string; }

const env = readSolvexEnvironment();
const validation = validateEnvironmentConfiguration();
const isProduction = env === 'production';
const isSandbox = env === 'sandbox';
const isExternal = isProduction || isSandbox;
const value = (name: string) => process.env[name]?.trim() || '';
const check = (name: string, required: boolean, valid: (v: string) => boolean, reason: string): SecretCheck => {
  if (!required) return { name, status: 'NOT_REQUIRED_IN_THIS_ENVIRONMENT', required, environment: String(env), reason };
  const v = value(name);
  if (!v) return { name, status: 'MISSING', required, environment: String(env), reason };
  return { name, status: valid(v) ? 'CONFIGURED' : 'INVALID_FORMAT', required, environment: String(env), reason };
};
const requiredExternal = isProduction || isSandbox;
const checks: SecretCheck[] = [
  check('PAYPAL_ENVIRONMENT', requiredExternal, v => v === 'sandbox' || v === 'live', 'Explicit provider environment declaration'),
  check('PAYPAL_LIVE_CLIENT_ID', isProduction, v => v.length >= 8, 'Production PayPal client identifier'),
  check('PAYPAL_LIVE_CLIENT_SECRET', isProduction, v => v.length >= 16, 'Production PayPal client secret'),
  check('PAYPAL_SANDBOX_CLIENT_ID', isSandbox, v => v.length >= 8, 'Sandbox PayPal client identifier'),
  check('PAYPAL_SANDBOX_CLIENT_SECRET', isSandbox, v => v.length >= 16, 'Sandbox PayPal client secret'),
  check('PAYPAL_WEBHOOK_ID', isProduction, v => v.length >= 8, 'Provider webhook identity'),
  check('PAYPAL_WEBHOOK_SECRET', isProduction, v => v.length >= 16, 'Provider webhook verification secret'),
  check('SOLVEX_SESSION_SECRET', isProduction, v => v.length >= 32, 'Production session secret'),
  check('SOLVEX_ENCRYPTION_KEY', isProduction, v => v.length >= 32, 'Production encryption key'),
  check('DATABASE_URL', isProduction, v => /^postgres(?:ql)?:\/\//.test(v), 'Managed production database URL'),
  check('DATABASE_DIRECT_URL', isProduction, v => /^postgres(?:ql)?:\/\//.test(v), 'Managed migration/direct database URL'),
  check('PRODUCTION_IDP_ISSUER', isProduction, v => /^https:\/\//.test(v), 'Production identity provider issuer'),
  check('PRODUCTION_IDP_CLIENT_ID', isProduction, v => v.length >= 8, 'Production identity provider client ID'),
  check('PRODUCTION_IDP_CLIENT_SECRET', isProduction, v => v.length >= 16, 'Production identity provider client secret'),
  check('AUDIT_SIGNING_KEY', isProduction, v => v.length >= 32, 'Managed audit signing key'),
  check('AUDIT_ENCRYPTION_KEY', isProduction, v => v.length >= 32, 'Managed audit encryption key'),
  check('PYUSD_PROVIDER', false, v => v.length >= 2, 'Optional provider declaration; does not prove PYUSD'),
  check('PYUSD_NETWORK', false, v => v.length >= 2, 'Optional network declaration; does not prove PYUSD'),
  check('PYUSD_ASSET_IDENTIFIER', false, v => v.length >= 2, 'Optional asset declaration; does not prove PYUSD'),
  check('SOLVEX_BASE_URL', isProduction, v => /^https:\/\//.test(v), 'Production public base URL')
];
const blockers = [...validation.blockers, ...checks.filter(c => c.status === 'MISSING' || c.status === 'INVALID_FORMAT').map(c => `${c.name}:${c.status}`)];
const report = {
  timestamp: new Date().toISOString(), environment: evidenceEnvironment(), environment_declaration: env,
  source_revision: 'SOURCE_SNAPSHOT_UNVERSIONED', checks, blockers, passed: blockers.length === 0,
  secret_values_included: false, secret_values_logged: false,
  credential_configuration_identifier: computeSha256(checks.map(c => `${c.name}:${c.status}`).join('|')).slice(0, 16)
};
fs.mkdirSync(path.resolve('artifacts'), { recursive: true });
fs.writeFileSync(path.resolve('artifacts/SOLVEX-SECRET-PREFLIGHT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ environment: report.environment, checks: checks.map(({ name, status, required }) => ({ name, status, required })), blockers, passed: report.passed, secret_values_included: false }, null, 2));
if (!report.passed && isProduction) process.exitCode = 1;
