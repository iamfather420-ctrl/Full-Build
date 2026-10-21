import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SovereignApiRouter } from './src/api/ApiRouter';
import { NeonStore } from './src/database/NeonPersistence';
import { AuthService } from './src/auth/AuthService';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const rateWindows = new Map<string, { startedAt: number; count: number }>();
const pendingOidcAuth = new Map<string, { nonce: string; verifier: string; createdAt: number }>();
type OidcDiscovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
let cachedDiscovery: { issuer: string; expiresAt: number; value: OidcDiscovery } | null = null;

function setSecurityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

function applyRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    rateWindows.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > MAX_REQUESTS) {
      res.setHeader('Retry-After', String(Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)));
      res.status(429).json({ error: 'Rate limit exceeded. Retry shortly.' });
      return;
    }
  }
  // Bound memory under changing/forged source addresses.
  if (rateWindows.size > 10_000) {
    for (const [ip, window] of rateWindows) if (now - window.startedAt >= WINDOW_MS) rateWindows.delete(ip);
  }
  next();
}

function cookieValue(header: unknown, name: string): string | null {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
  }
  return null;
}

function secureCookie(name: string, value: string, maxAge: number, path = '/') {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function stateMatches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function getOidcDiscovery(): Promise<OidcDiscovery | null> {
  const issuer = process.env.AUTH_ISSUER || '';
  if (!issuer) return null;
  if (cachedDiscovery && cachedDiscovery.issuer === issuer && cachedDiscovery.expiresAt > Date.now()) return cachedDiscovery.value;
  try {
    const issuerUrl = new URL(issuer);
    if (process.env.NODE_ENV === 'production' && issuerUrl.protocol !== 'https:') return null;
    const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const value = await response.json() as OidcDiscovery;
    if (value.issuer !== issuer || typeof value.authorization_endpoint !== 'string' || typeof value.token_endpoint !== 'string' || typeof value.jwks_uri !== 'string') return null;
    const authUrl = new URL(value.authorization_endpoint);
    const tokenUrl = new URL(value.token_endpoint);
    const discoveryJwks = new URL(value.jwks_uri);
    const configuredJwks = new URL(process.env.AUTH_JWKS_URL || '');
    if (discoveryJwks.href !== configuredJwks.href) return null;
    if (process.env.NODE_ENV === 'production' && (authUrl.protocol !== 'https:' || tokenUrl.protocol !== 'https:' || discoveryJwks.protocol !== 'https:')) return null;
    cachedDiscovery = { issuer, expiresAt: Date.now() + 5 * 60_000, value };
    return value;
  } catch { return null; }
}

function sameOriginMutation(req: express.Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin !== 'string' || typeof host !== 'string' || !host) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.host.toLowerCase() !== host.toLowerCase()) return false;
    return process.env.NODE_ENV === 'production' ? parsed.protocol === 'https:' : ['http:', 'https:'].includes(parsed.protocol);
  } catch { return false; }
}

async function productionReadiness() {
  if (process.env.NODE_ENV !== 'production') return { ready: true, mode: 'development', checks: {} };
  const issuer = process.env.AUTH_ISSUER || '';
  const audience = process.env.AUTH_AUDIENCE || '';
  const jwksUrl = process.env.AUTH_JWKS_URL || '';
  const authMode = (process.env.AUTH_MODE || 'oidc').toLowerCase();
  const clientId = process.env.AUTH_CLIENT_ID || '';
  const clientSecret = process.env.AUTH_CLIENT_SECRET || '';
  const redirectUri = process.env.AUTH_REDIRECT_URI || '';
  const oidcConfigured = authMode === 'oidc' && Boolean(issuer && audience && jwksUrl && clientId && clientSecret && redirectUri);
  const oidcDiscoveryReady = await getOidcDiscovery() !== null;
  const oidcHttps = (() => {
    try { return new URL(issuer).protocol === 'https:' && new URL(jwksUrl).protocol === 'https:' && new URL(redirectUri).protocol === 'https:'; }
    catch { return false; }
  })();
  const neon = NeonStore.getInstance();
  const dbConfigured = neon.isConfigured();
  let dbConnected = false;
  let tablesPresent = 0;
  let tablesRequired = 27;
  let missingTables: string[] = [];
  let accessRequestSchemaReady = false;
  if (dbConfigured) {
    dbConnected = await neon.connect();
    if (dbConnected) {
      const tables = await neon.verifyRequiredTables();
      tablesPresent = tables.verified;
      tablesRequired = tables.required;
      missingTables = tables.missing;
      accessRequestSchemaReady = (await neon.verifyAccessRequestSchema()).ready;
    }
  }
  // The legacy API services still use the local SQLite/DurableStore adapters for
  // most domain writes. Until those repositories are migrated to Neon, production
  // readiness must remain false even if Neon is reachable.
  const primaryApiStorageWiredToNeon = false;
  const domainSchemaCompatibilityVerified = false; // Table presence is not proof that all domain columns/indexes/constraints match.
  const singleReplicaLoginState = process.env.OIDC_SINGLE_REPLICA_MODE === 'true';
  const ready = oidcConfigured && oidcHttps && oidcDiscoveryReady && singleReplicaLoginState && dbConfigured && dbConnected && tablesPresent === tablesRequired && accessRequestSchemaReady && domainSchemaCompatibilityVerified && primaryApiStorageWiredToNeon;
  return { ready, mode: 'production', checks: {
    auth_mode: authMode, oidc_configured: oidcConfigured, oidc_https: oidcHttps, oidc_discovery_ready: oidcDiscoveryReady,
    oidc_single_replica_state_mode: singleReplicaLoginState,
    neon_configured: dbConfigured, neon_connected: dbConnected,
    required_tables_present: tablesPresent, required_tables_total: tablesRequired,
    missing_required_tables: missingTables,
    access_request_schema_ready: accessRequestSchemaReady,
    primary_api_storage_wired_to_neon: primaryApiStorageWiredToNeon,
    domain_schema_compatibility_verified: domainSchemaCompatibilityVerified,
    schema_mutations_performed: false, paypal_enabled: false,
  } };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.use(setSecurityHeaders);
  app.use(applyRateLimit);
  app.use(express.json({ limit: '256kb', strict: true }));

  app.get('/auth/login', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const clientId = process.env.AUTH_CLIENT_ID || '';
    const redirectUri = process.env.AUTH_REDIRECT_URI || '';
    const discovery = await getOidcDiscovery();
    if (!clientId || !redirectUri || !discovery) return res.status(503).send('Trusted OIDC login is not configured.');
    try {
      const callback = new URL(redirectUri);
      if (callback.pathname !== '/auth/callback' || callback.host.toLowerCase() !== String(req.headers.host || '').toLowerCase() || (process.env.NODE_ENV === 'production' && callback.protocol !== 'https:')) return res.status(503).send('OIDC callback URL does not match this application origin.');
    } catch { return res.status(503).send('OIDC callback URL is invalid.'); }
    if (pendingOidcAuth.size > 5000) {
      for (const [key, value] of pendingOidcAuth) if (Date.now() - value.createdAt > 300_000) pendingOidcAuth.delete(key);
      if (pendingOidcAuth.size > 5000) return res.status(429).send('Login capacity reached; retry shortly.');
    }
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    pendingOidcAuth.set(state, { nonce, verifier, createdAt: Date.now() });
    const target = new URL(discovery.authorization_endpoint);
    target.searchParams.set('response_type', 'code');
    target.searchParams.set('client_id', clientId);
    target.searchParams.set('redirect_uri', redirectUri);
    target.searchParams.set('scope', 'openid profile email');
    target.searchParams.set('state', state);
    target.searchParams.set('nonce', nonce);
    target.searchParams.set('code_challenge', challenge);
    target.searchParams.set('code_challenge_method', 'S256');
    res.setHeader('Set-Cookie', secureCookie('solvex_oidc_state', state, 300, '/auth'));
    return res.redirect(302, target.toString());
  });

  app.get('/auth/callback', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const callback = new URL(process.env.AUTH_REDIRECT_URI || '');
      if (callback.pathname !== '/auth/callback' || callback.host.toLowerCase() !== String(req.headers.host || '').toLowerCase() || (process.env.NODE_ENV === 'production' && callback.protocol !== 'https:')) return res.status(400).send('OIDC callback origin mismatch.');
    } catch { return res.status(400).send('OIDC callback URL is invalid.'); }
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const cookieState = cookieValue(req.headers.cookie, 'solvex_oidc_state') || '';
    const pending = state ? pendingOidcAuth.get(state) : undefined;
    if (!state || !code || !cookieState || !stateMatches(state, cookieState) || !pending || Date.now() - pending.createdAt > 300_000) {
      res.setHeader('Set-Cookie', secureCookie('solvex_oidc_state', '', 0, '/auth'));
      return res.status(400).send('OIDC login state is invalid or expired. Restart sign-in.');
    }
    pendingOidcAuth.delete(state); // one-time state; never reuse a login transaction
    const discovery = await getOidcDiscovery();
    const clientId = process.env.AUTH_CLIENT_ID || '';
    const clientSecret = process.env.AUTH_CLIENT_SECRET || '';
    const redirectUri = process.env.AUTH_REDIRECT_URI || '';
    if (!discovery || !clientId || !clientSecret || !redirectUri) return res.status(503).send('Trusted OIDC token exchange is not configured.');
    try {
      const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri, code_verifier: pending.verifier });
      form.set('client_secret', clientSecret);
      const tokenResponse = await fetch(discovery.token_endpoint, {
        method: 'POST', signal: AbortSignal.timeout(6000),
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form,
      });
      if (!tokenResponse.ok) return res.status(401).send('OIDC token exchange failed. Restart sign-in.');
      const tokenSet = await tokenResponse.json() as { access_token?: string; id_token?: string; token_type?: string; expires_in?: number };
      if (typeof tokenSet.access_token !== 'string' || typeof tokenSet.id_token !== 'string' || tokenSet.token_type?.toLowerCase() !== 'bearer' || tokenSet.access_token.length > 3500) {
        return res.status(401).send('OIDC provider returned an invalid token response.');
      }
      const auth = AuthService.getInstance();
      const idToken = await auth.verifyOidcIdToken(tokenSet.id_token, pending.nonce);
      const accessToken = await auth.verifyOidcAccessToken(tokenSet.access_token);
      if (!idToken.valid || !idToken.subject || !accessToken.valid || !accessToken.user || accessToken.user.user_id !== idToken.subject) {
        return res.status(401).send('OIDC identity validation failed. Check issuer, audience, tenant, and role claims.');
      }
      const maxAge = Math.min(Number(tokenSet.expires_in || 0), Math.max(0, (accessToken.user.expires_at || 0) - Math.floor(Date.now() / 1000)));
      if (!Number.isFinite(maxAge) || maxAge < 60) return res.status(401).send('OIDC access token lifetime is invalid.');
      res.setHeader('Set-Cookie', [secureCookie('solvex_access_token', tokenSet.access_token, maxAge), secureCookie('solvex_oidc_state', '', 0, '/auth')]);
      return res.redirect(303, '/');
    } catch {
      return res.status(502).send('OIDC login failed closed. Restart sign-in.');
    }
  });

  app.post('/auth/logout', (req, res) => {
    if (cookieValue(req.headers.cookie, 'solvex_access_token') && !sameOriginMutation(req)) return res.status(403).json({ error: 'Same-origin request required.' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Set-Cookie', secureCookie('solvex_access_token', '', 0));
    res.status(204).end();
  });

  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
  app.get('/readyz', async (_req, res) => {
    try {
      const readiness = await productionReadiness();
      res.status(readiness.ready ? 200 : 503).json({ status: readiness.ready ? 'ready' : 'not_ready', ...readiness });
    } catch {
      res.status(503).json({ status: 'not_ready', error: 'Readiness checks failed closed.', schema_mutations_performed: false, paypal_enabled: false });
    }
  });

  const apiRouter = SovereignApiRouter.getInstance();
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    // HttpOnly OIDC access-token cookie is converted server-side; JS never receives it.
    // Cookie-authenticated mutations require a same-origin Origin header to prevent CSRF.
    const cookieToken = cookieValue(req.headers.cookie, 'solvex_access_token');
    if (cookieToken && !req.headers.authorization) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '') && !sameOriginMutation(req)) return res.status(403).json({ error: 'Same-origin request required for cookie-authenticated mutations.' });
      req.headers.authorization = `Bearer ${cookieToken}`;
    }
    // Prefer express.json's parsed body; do not attach stream listeners after parser consumption.
    (req as any).body = (req as any).body ?? {};
    apiRouter.handleHttpRequest(req, res);
  });

  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false, fallthrough: true }));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return;
    const status = err?.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error.' : status === 413 ? 'Request body too large.' : 'Malformed JSON.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SOLVEX + Daisy Haminja] Server listening on port ${PORT}; readiness is fail-closed in production.`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err?.message || err);
  process.exit(1);
});
