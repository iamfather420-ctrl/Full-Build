import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';

type VercelRequest = IncomingMessage & { method?: string; headers: IncomingMessage['headers'] };
type VercelResponse = ServerResponse & {
  send: (body: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function reply(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}

function safeEqual(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Preview deployments are protected by Vercel SSO. This same-origin console
  // lets an authenticated project member start the check without copying a key.
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SolveX PayPal Sandbox Verification</title>
<style>body{font:16px system-ui;max-width:620px;margin:12vh auto;padding:24px;color:#172033}button{padding:12px 18px;font-weight:650}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f4f8;padding:14px;border-radius:8px}small{color:#526078}</style>
<h1>PayPal sandbox verification</h1>
<p>This runs one sandbox OAuth authentication check only. Payments remain disabled. No orders, captures, refunds, or transactions are attempted.</p>
<button id="run">Run sandbox verification</button>
<p><small>Available only on the protected Vercel preview for the verification branch.</small></p>
<pre id="result" aria-live="polite">Not run.</pre>
<script>
const button=document.getElementById('run'), output=document.getElementById('result');
button.addEventListener('click',async()=>{button.disabled=true;output.textContent='Running sandbox OAuth check…';try{const r=await fetch(location.pathname,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}});const data=await r.json();output.textContent=JSON.stringify(data,null,2)}catch(e){output.textContent='Request failed. Check Vercel runtime logs.'}finally{button.disabled=false}});
</script></html>`);
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const gateSecret = process.env.PAYPAL_VERIFY_HMAC_SECRET;
  if (!gateSecret || gateSecret.length < 32) {
    return reply(res, 503, { ok: false, error: 'VERIFICATION_GATE_NOT_CONFIGURED' });
  }
  const suppliedKey = req.headers['x-solvex-verification-key'] as string | undefined;
  const hmacAuthorized = safeEqual(suppliedKey, gateSecret);
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  const origin = (req.headers.origin || '').toString();
  const sameOriginPreviewAuthorized =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === 'feature/external-dependency-railway-v2' &&
    !!host &&
    origin === `https://${host}`;
  if (!hmacAuthorized && !sameOriginPreviewAuthorized) {
    return reply(res, 401, { ok: false, error: 'UNAUTHORIZED' });
  }

  // Fail closed: no provider request is made unless both safety switches are exact.
  if (process.env.PAYPAL_ENVIRONMENT !== 'sandbox') {
    return reply(res, 409, { ok: false, error: 'SANDBOX_ENVIRONMENT_REQUIRED' });
  }
  if (process.env.PAYMENTS_ENABLED !== 'false') {
    return reply(res, 409, { ok: false, error: 'PAYMENTS_MUST_REMAIN_DISABLED' });
  }

  const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return reply(res, 503, { ok: false, error: 'SANDBOX_CREDENTIALS_NOT_CONFIGURED' });
  }

  const timestamp = new Date().toISOString();
  let httpStatus = 0;
  let oauthAuthenticated = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let response: Response;
    try {
      response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    httpStatus = response.status;
    const payload = await response.json().catch(() => ({})) as {
      access_token?: string; token_type?: string; expires_in?: number;
    };
    oauthAuthenticated = response.ok &&
      typeof payload.access_token === 'string' &&
      payload.access_token.length >= 20 &&
      payload.token_type?.toLowerCase() === 'bearer' &&
      typeof payload.expires_in === 'number' &&
      payload.expires_in > 0;
    // Token is intentionally discarded; never log, return, or persist it.
  } catch {
    oauthAuthenticated = false;
  }

  const report = {
    test_suite: 'PAYPAL_SANDBOX_OAUTH_AUTHENTICATION',
    timestamp,
    environment: 'sandbox',
    oauth_endpoint: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
    oauth_http_status: httpStatus || null,
    sandbox_credentials_present: true,
    sandbox_oauth_authenticated: oauthAuthenticated,
    payments_enabled: false,
    live_credentials_read: false,
    live_api_contacted: false,
    transaction_attempted: false,
    token_persisted: false,
    status: oauthAuthenticated ? 'PASS' : 'FAIL',
  };
  const canonical = JSON.stringify(report);
  const evidenceSha256 = createHash('sha256').update(canonical).digest('hex');

  return reply(res, oauthAuthenticated ? 200 : 502, {
    ok: oauthAuthenticated,
    report,
    evidence_sha256: evidenceSha256,
  });
}
