export type ProductionMode = 'local' | 'sandbox' | 'production';
export type ProductionReadiness = 'BLOCKED' | 'READY';
export type ProductionActivation = 'LOCAL' | 'BLOCKED' | 'ACTIVE';

export interface ProductionStateSnapshot {
  status: ProductionActivation;
  environment: ProductionMode;
  readiness: ProductionReadiness;
  authentication_enabled: boolean;
  authentication_configured: boolean;
  payments_enabled: boolean;
  neon_configured: boolean;
  blockers: string[];
}

export class ProductionStateService {
  private static normalizeEnvironment(value?: string): ProductionMode {
    const mode = (value || 'local').toLowerCase();
    if (mode === 'production') return 'production';
    if (mode === 'sandbox') return 'sandbox';
    return 'local';
  }

  public static getState(): ProductionStateSnapshot {
    const environment = this.normalizeEnvironment(process.env.SOLVEX_ENV);
    const paymentsEnabled = String(process.env.PAYMENTS_ENABLED || 'false').toLowerCase() === 'true';
    // Match the names consumed by artifacts/api-server/src/lib/auth.ts.
    // OIDC_ISSUER is not read by the running API and must not satisfy this check.
    const oidcIssuerConfigured = Boolean(process.env.OIDC_ISSUER_URL?.trim());
    const oidcClientConfigured = Boolean(process.env.OIDC_CLIENT_ID?.trim());
    const authConfigured = oidcIssuerConfigured && oidcClientConfigured;
    const neonConfigured = Boolean(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
    const blockers: string[] = [];

    if (environment !== 'production') {
      blockers.push('SOLVEX_ENV must be set to production before the runtime can claim production readiness.');
    }
    if (!oidcIssuerConfigured) {
      blockers.push('OIDC_ISSUER_URL is not configured; the API OIDC login flow cannot discover its issuer.');
    }
    if (!oidcClientConfigured) {
      blockers.push('OIDC_CLIENT_ID is not configured; the API OIDC login flow cannot authenticate clients.');
    }
    if (!neonConfigured) {
      blockers.push('NEON_DATABASE_URL or DATABASE_URL is not configured; cloud persistence is unavailable.');
    }
    if (paymentsEnabled) {
      blockers.push('Payments are intentionally disabled in this repo; PAYMENTS_ENABLED must remain false until the production gate is complete.');
    }

    const readiness: ProductionReadiness = blockers.length === 0 ? 'READY' : 'BLOCKED';
    const status: ProductionActivation = blockers.length === 0 ? 'ACTIVE' : 'BLOCKED';

    return {
      status,
      environment,
      readiness,
      // The API installs authMiddleware globally; login is configured only when
      // both values required by getOidcConfig() are present. This is config
      // readiness, not proof that a live OIDC round-trip has succeeded.
      authentication_enabled: authConfigured,
      authentication_configured: authConfigured,
      payments_enabled: false,
      neon_configured: neonConfigured,
      blockers
    };
  }
}
