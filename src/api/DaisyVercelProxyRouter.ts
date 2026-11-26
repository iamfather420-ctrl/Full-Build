import { Router, type Request, type Response } from 'express';
import { isIP } from 'node:net';
import { z } from 'zod';

const router = Router();
const ChatBodySchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(8_000),
  }).strict()).max(20).default([]),
}).strict().superRefine((body, context) => {
  const total = body.prompt.length + body.history.reduce((sum, item) => sum + item.content.length, 0);
  if (total > 20_000) context.addIssue({ code: 'custom', message: 'Combined chat input exceeds 20,000 characters.' });
});

type TenantRequest = Request & {
  user?: { id?: string };
  tenantClaims?: Record<string, unknown>;
  tenantToken?: string;
  isAuthenticated?: () => boolean;
};

type ProxyEnvironment = Record<string, string | undefined>;

export function resolveDaisyRenderBaseUrl(env: ProxyEnvironment = process.env): URL | null {
  const raw = env.DAISY_RENDER_BASE_URL?.trim();
  const allowedHost = env.DAISY_RENDER_ALLOWED_HOST?.trim().toLowerCase();
  if (!raw || !allowedHost) return null;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const normalizedHostname = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash ||
        hostname !== allowedHost || isIP(normalizedHostname) !== 0 ||
        normalizedHostname === 'localhost' || normalizedHostname.endsWith('.local')) return null;
    return url;
  } catch {
    return null;
  }
}

export function hasSameOrigin(req: Request): boolean {
  const origin = req.get('origin');
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const proto = (req.get('x-forwarded-proto') || 'https').split(',')[0].trim().toLowerCase();
  if (!origin || !host || (proto !== 'https' && !(process.env.NODE_ENV !== 'production' && proto === 'http'))) return false;
  try {
    return new URL(origin).origin === `${proto}://${host}`;
  } catch {
    return false;
  }
}

function authenticatedTenant(req: Request): { tenantId: string; userId: string; token: string } | null {
  const request = req as TenantRequest;
  const claims = request.tenantClaims;
  const userId = request.user?.id;
  const tenantId = claims?.tenant_id;
  const token = request.tenantToken;
  if (!request.isAuthenticated?.() || !userId || claims?.user_id !== userId ||
      typeof tenantId !== 'string' || !tenantId.trim() ||
      typeof token !== 'string' || token.length < 32 || token.length > 8192) return null;
  return { tenantId, userId, token };
}

function sendBlocked(res: Response, status: number, code: string, message: string) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Cookie');
  return res.status(status).json({ success: false, status: 'BLOCKED', code, message });
}

async function readBoundedJson(response: globalThis.Response, maxBytes: number): Promise<Record<string, unknown> | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('UPSTREAM_RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

async function callRender(req: Request, res: Response, endpoint: 'status' | 'chat', body?: unknown) {
  const identity = authenticatedTenant(req);
  if (!identity) return sendBlocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  if (endpoint === 'chat' && !hasSameOrigin(req)) {
    return sendBlocked(res, 403, 'SAME_ORIGIN_REQUIRED', 'Cross-origin Daisy requests are not accepted.');
  }
  const proxySecret = process.env.DAISY_RENDER_PROXY_SECRET?.trim();
  if (!proxySecret || proxySecret.length < 32) return sendBlocked(res, 503, 'DAISY_RENDER_PROXY_SECRET_MISSING', 'The Daisy service-to-service credential is not configured.');
  const baseUrl = resolveDaisyRenderBaseUrl();
  if (!baseUrl) return sendBlocked(res, 503, 'DAISY_RENDER_PROXY_NOT_CONFIGURED', 'The first-party Daisy Render endpoint is not configured.');
  const target = new URL(`/api/daisy-internal/${endpoint}`, baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), endpoint === 'chat' ? 70_000 : 10_000);
  try {
    const upstream = await fetch(target, {
      method: endpoint === 'status' ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${identity.token}`,
        'x-daisy-proxy-key': proxySecret,
        ...(endpoint === 'chat' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(endpoint === 'chat' ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    const result = await readBoundedJson(upstream, endpoint === 'chat' ? 1_000_000 : 64_000);
    if (!result) return sendBlocked(res, 502, 'DAISY_RENDER_INVALID_RESPONSE', 'Daisy Render returned an invalid response.');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    if (endpoint === 'chat' && upstream.ok &&
        (result.success !== true || result.status !== 'OK' ||
         typeof result.text !== 'string' || !result.text.trim())) {
      return sendBlocked(res, 502, 'DAISY_RENDER_UNVERIFIED_OUTPUT', 'Daisy did not return verified non-empty first-party inference output.');
    }
    return res.status(upstream.status).json(result);
  } catch {
    return sendBlocked(res, 502, 'DAISY_RENDER_UNREACHABLE', 'The first-party Daisy Render service could not complete the request.');
  } finally {
    clearTimeout(timeout);
  }
}

router.get('/status', (req, res) => callRender(req, res, 'status'));

router.post('/chat', (req, res) => {
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) return sendBlocked(res, 400, 'INVALID_CHAT_REQUEST', 'The chat request is invalid or exceeds the allowed size.');
  return callRender(req, res, 'chat', parsed.data);
});

export default router;
