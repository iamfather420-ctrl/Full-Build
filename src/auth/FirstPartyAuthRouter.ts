import { Router, type Request, type Response, type NextFunction } from 'express';
import { FirstPartyAuth, FirstPartyAuthError } from './FirstPartyAuth';

const COOKIE_NAME = '__Host-daisy_session';
const MAX_BODY_STRING = 1024;

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

function stringField(body: unknown, key: string, max = MAX_BODY_STRING): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length <= max ? value : null;
}

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function requireTrustedOrigin(origin: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    noStore(res);
    if (req.get('origin') !== origin) {
      res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' });
      return;
    }
    next();
  };
}

function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}; HttpOnly; Secure; SameSite=Lax`);
}

function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
}

function errorResponse(error: unknown, res: Response): void {
  if (error instanceof FirstPartyAuthError) {
    if (error.retryAfterSeconds !== undefined) res.setHeader('Retry-After', String(error.retryAfterSeconds));
    const status = error.code === 'RATE_LIMITED' ? 429
      : error.code === 'INVALID_INPUT' ? 400
      : error.code === 'AUTH_NOT_CONFIGURED' ? 503
      : error.code === 'EMAIL_NOT_VERIFIED' ? 403
      : error.code === 'ACCOUNT_DISABLED' ? 403 : 400;
    res.status(status).json({ error: error.code, message: error.message });
    return;
  }
  // Do not leak database errors, token hashes, SQL, or stack traces.
  res.status(503).json({ error: 'AUTH_TEMPORARILY_UNAVAILABLE' });
}

/**
 * Routes are deliberately opt-in. Mount only after durable repository, email adapter,
 * origin, database RLS, and disposable-branch integration tests are verified.
 * The parent app must use express.json({ limit: '16kb', strict: true }), HTTPS,
 * no-store headers, a correctly configured trusted proxy, and security headers.
 */
export function createFirstPartyAuthRouter(auth: FirstPartyAuth, publicOrigin: string): Router {
  const origin = new URL(publicOrigin).origin;
  const router = Router();
  const trustedOrigin = requireTrustedOrigin(origin);

  router.post('/register', trustedOrigin, async (req, res) => {
    try {
      const email = stringField(req.body, 'email', 254);
      const password = stringField(req.body, 'password');
      if (email === null || password === null) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }
      await auth.register(email, password);
      res.status(202).json({ accepted: true, message: 'If the address can be registered, verification instructions will be sent.' });
    } catch (error) { errorResponse(error, res); }
  });

  router.post('/verify-email', trustedOrigin, async (req, res) => {
    try {
      const token = stringField(req.body, 'token', 128);
      if (!token) { res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' }); return; }
      const account = await auth.verifyEmail(token);
      res.status(200).json({ verified: true, account });
    } catch (error) { errorResponse(error, res); }
  });

  router.post('/login', trustedOrigin, async (req, res) => {
    try {
      const email = stringField(req.body, 'email', 254);
      const password = stringField(req.body, 'password');
      if (email === null || password === null) {
        res.status(400).json({ error: 'INVALID_INPUT' });
        return;
      }
      // req.ip is trustworthy only after the parent app configures trusted proxies correctly.
      const sourceIdentifier = 'source:' + (req.ip || req.socket.remoteAddress || 'unknown');
      const result = await auth.login(email, password, sourceIdentifier);
      noStore(res);
      setSessionCookie(res, result.session.cookieValue, result.session.expiresAt);
      res.status(200).json({ account: result.account, expiresAt: result.session.expiresAt.toISOString() });
    } catch (error) { errorResponse(error, res); }
  });

  router.get('/me', async (req, res) => {
    noStore(res);
    try {
      const token = cookieValue(req, COOKIE_NAME);
      if (!token) { res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      const account = await auth.authenticateSession(token);
      if (!account) { clearSessionCookie(res); res.status(401).json({ error: 'UNAUTHENTICATED' }); return; }
      res.status(200).json({ account });
    } catch (error) { errorResponse(error, res); }
  });

  router.post('/logout', trustedOrigin, async (req, res) => {
    try {
      const token = cookieValue(req, COOKIE_NAME);
      if (token) await auth.logout(token);
      clearSessionCookie(res);
      res.status(204).end();
    } catch (error) { errorResponse(error, res); }
  });

  router.post('/password-reset/request', trustedOrigin, async (req, res) => {
    try {
      const email = stringField(req.body, 'email', 254);
      if (email === null) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }
      await auth.requestPasswordReset(email);
      res.status(202).json({ accepted: true, message: 'If the account is eligible, password-reset instructions will be sent.' });
    } catch (error) { errorResponse(error, res); }
  });

  router.post('/password-reset/confirm', trustedOrigin, async (req, res) => {
    try {
      const token = stringField(req.body, 'token', 128);
      const password = stringField(req.body, 'password');
      if (!token || password === null) { res.status(400).json({ error: 'INVALID_INPUT' }); return; }
      await auth.resetPassword(token, password);
      clearSessionCookie(res);
      res.status(204).end();
    } catch (error) { errorResponse(error, res); }
  });

  return router;
}
