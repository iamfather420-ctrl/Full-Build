export type SolvexEnvironment = 'local' | 'sandbox' | 'production';

export interface EnvironmentValidation {
  valid: boolean;
  environment: SolvexEnvironment | 'UNRECOGNIZED' | 'MISSING';
  blockers: string[];
}

const ENVIRONMENTS = new Set<SolvexEnvironment>(['local', 'sandbox', 'production']);

export function readSolvexEnvironment(env: NodeJS.ProcessEnv = process.env): SolvexEnvironment | 'UNRECOGNIZED' | 'MISSING' {
  const raw = env.SOLVEX_ENVIRONMENT || env.SOLVEX_ENV;
  if (!raw || !raw.trim()) return 'MISSING';
  const normalized = raw.trim().toLowerCase() as SolvexEnvironment;
  return ENVIRONMENTS.has(normalized) ? normalized : 'UNRECOGNIZED';
}

export function validateEnvironmentConfiguration(env: NodeJS.ProcessEnv = process.env): EnvironmentValidation {
  const environment = readSolvexEnvironment(env);
  const blockers: string[] = [];
  if (environment === 'MISSING') blockers.push('SOLVEX_ENVIRONMENT or SOLVEX_ENV must explicitly declare local, sandbox, or production');
  if (environment === 'UNRECOGNIZED') blockers.push('Environment declaration is unrecognized');

  const paypalMode = env.PAYPAL_ENVIRONMENT?.trim().toLowerCase();
  const hasSandbox = Boolean(env.PAYPAL_SANDBOX_CLIENT_ID || env.PAYPAL_SANDBOX_CLIENT_SECRET);
  const hasLive = Boolean(env.PAYPAL_LIVE_CLIENT_ID || env.PAYPAL_LIVE_CLIENT_SECRET);
  const hasLegacy = Boolean(env.PAYPAL_CLIENT_ID || env.PAYPAL_CLIENT_SECRET);
  if (paypalMode && paypalMode !== 'sandbox' && paypalMode !== 'live') blockers.push('PAYPAL_ENVIRONMENT must be sandbox or live');
  if (hasSandbox && hasLive) blockers.push('Sandbox and production PayPal credential sets cannot be mixed');
  if (paypalMode === 'live' && hasLegacy) blockers.push('Production PayPal mode cannot use legacy sandbox credential names');
  if (environment === 'production' && paypalMode !== 'live') blockers.push('Production requires PAYPAL_ENVIRONMENT=live');
  if (environment === 'sandbox' && paypalMode === 'live') blockers.push('Sandbox environment cannot use live PayPal mode');
  const databaseUrl = env.SOLVEX_DATABASE_URL || env.NEON_DATABASE_URL || env.DATABASE_URL;
  if (environment === 'production' && databaseUrl && !/^postgres(?:ql)?:\/\//.test(databaseUrl)) blockers.push('Production DATABASE_URL must be a postgres connection string');
  if (environment === 'production' && env.SOLVEX_DB_PATH) blockers.push('Production cannot use SOLVEX_DB_PATH as its authoritative database');
  return { valid: blockers.length === 0, environment, blockers };
}

export function evidenceEnvironment(env: NodeJS.ProcessEnv = process.env): 'LOCAL' | 'SANDBOX' | 'PRODUCTION' | 'UNKNOWN' {
  const mode = readSolvexEnvironment(env);
  if (mode === 'local') return 'LOCAL';
  if (mode === 'sandbox') return 'SANDBOX';
  if (mode === 'production') return 'PRODUCTION';
  return 'UNKNOWN';
}
