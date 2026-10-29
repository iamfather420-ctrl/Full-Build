import { Router, type Request, type Response } from 'express';
import type { FirstPartyAuthService } from './FirstPartyAuthService';

const COOKIE_NAME = '__Host-solvex_session';
const COOKIE_PATH = '/';
const MAX_BODY_STRING = 2048;

export interface FirstPartyAuthRouterOptions {
  service: FirstPartyAuthService;
  /** Exact trusted browser origins, e.g. https://uarefake.space. No wildcard support. */
  allowedOrigins: string[];
  /** Explicit opt-in is required so this router cannot be accidentally activated by defaults. */
  enabled: boolean;
}

function sendBlocked(res: Response, status = 503) {
  return res.status(status).json({ ok: false, error: 'AUTHENTICATION_UNAVAILABLE' });
}

function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192) return null;
  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== COOKIE_NAME) continue;
    const value = item.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{40,100}$/.test(value) ? value : null;
  }
  return null;
}

function requestHasTrustedOrigin(req: Request, allowedOrigins: Set<string>): boolean {
  const origin = req.get('origin');
  if (!origin || !allowedOrigins.has(origin)) return false;
  const fetchSite = req.get('sec-fetch-site');
  return fetchSite !== 'cross-site';
}

function stringField(value: unknown, max = MAX_BODY_STRING): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function setSessionCookie(res: Response, token: string, expiresAt: number) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

/**
 * Secure, opt-in HTTP boundary. It is deliberately not mounted by the application.
 * A caller must explicitly enable it and supply a non-empty exact origin allowlist only
 * after the durable Neon migration, owner/grant checks, and staging security tests pass.
 */
export function createFirstPartyAuthRouter(options: FirstPartyAuthRouterOptions): Router {
  const router = Router();
  const allowedOrigins = new Set(options.allowedOrigins);
  const configured = options.enabled === true &&
    allowedOrigins.size > 0 &&
    [...allowedOrigins].every((origin) => {
      try {
        const parsed = new URL(origin);
        return parsed.origin === origin && parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '';
      } catch { return false; }
    });

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Origin');
    if (!configured) return sendBlocked(res);
    return next();
  });

  router.post('/register', async (req, res) => {
    if (!requestHasTrustedOrigin(req, allowedOrigins)) return res.status(403).json({ ok: false, error: 'ORIGIN_REJECTED' });
    const email = stringField(req.body?.email, 254);
    const password = stringField(req.body?.password, 1024);
    const invitation = stringField(req.body?.invitationToken, 512);
    if (!email || !password || !invitation) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
    try {
      const result = await options.service.register(email, password, invitation);
      if (!result.ok || !result.sessionToken || !result.expiresAt) {
        const throttled = result.error === 'REGISTRATION_TEMPORARILY_UNAVAILABLE';
        return res.status(throttled ? 429 : 400).json({ ok: false, error: result.error || 'REGISTRATION_REJECTED' });
      }
      setSessionCookie(res, result.sessionToken, result.expiresAt);
      return res.status(201).json({ ok: true, expiresAt: result.expiresAt });
    } catch {
      clearSessionCookie(res);
      return sendBlocked(res);
    }
  });

  router.post('/login', async (req, res) => {
    if (!requestHasTrustedOrigin(req, allowedOrigins)) return res.status(403).json({ ok: false, error: 'ORIGIN_REJECTED' });
    const email = stringField(req.body?.email, 254);
    const password = stringField(req.body?.password, 1024);
    const tenantId = stringField(req.body?.tenantId, 200);
    if (!email || !password || !tenantId) return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
    try {
      const result = await options.service.login(email, password, tenantId);
      if (!result.ok || !result.sessionToken || !result.expiresAt) {
        const throttled = result.error === 'LOGIN_TEMPORARILY_UNAVAILABLE';
        return res.status(throttled ? 429 : 401).json({ ok: false, error: throttled ? result.error : 'INVALID_CREDENTIALS' });
      }
      setSessionCookie(res, result.sessionToken, result.expiresAt);
      return res.status(200).json({ ok: true, expiresAt: result.expiresAt });
    } catch {
      clearSessionCookie(res);
      return sendBlocked(res);
    }
  });

  router.get('/session', async (req, res) => {
    const token = readSessionCookie(req);
    if (!token) return res.status(401).json({ ok: false, error: 'SESSION_INVALID' });
    try {
      const result = await options.service.verifySession(token);
      if (!result.valid || !result.identity) {
        clearSessionCookie(res);
        return res.status(401).json({ ok: false, error: 'SESSION_INVALID' });
      }
      return res.status(200).json({
        ok: true,
        identity: {
          userId: result.identity.userId,
          email: result.identity.email,
          tenantId: result.identity.tenantId,
          role: result.identity.role,
        },
      });
    } catch {
      return sendBlocked(res);
    }
  });

  router.post('/logout', async (req, res) => {
    if (!requestHasTrustedOrigin(req, allowedOrigins)) return res.status(403).json({ ok: false, error: 'ORIGIN_REJECTED' });
    const token = readSessionCookie(req);
    try {
      if (token) await options.service.logout(token);
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    } catch {
      // Do not report logout success when server-side revocation failed.
      clearSessionCookie(res);
      return sendBlocked(res);
    }
  });

  return router;
}
