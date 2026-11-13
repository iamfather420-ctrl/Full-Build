import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';

type VercelRequest = IncomingMessage & { method?: string };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
};

function reply(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>SolveX PayPal Sandbox Verification</title>
<style>
body{font:16px system-ui,sans-serif;max-width:620px;margin:48px auto;padding:0 18px;background:#10131b;color:#f4f5f7}
main{border:1px solid #343b4b;border-radius:14px;padding:24px}
button{background:#d6ad55;color:#111;border:0;border-radius:8px;padding:12px 18px;font-weight:700;font-size:16px}
button:disabled{opacity:.55}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1b2130;padding:14px;border-radius:8px}
small{color:#b8c0ce}
</style>
</head>
<body><main>
<h1>SolveX PayPal Sandbox Check</h1>
<p>This runs one PayPal sandbox OAuth credential check only.</p>
<ul><li>Payments remain disabled.</li><li>No live credentials or APIs are used.</li><li>No orders, captures, refunds, or transactions.</li><li>The access token is discarded and never displayed.</li></ul>
<p><small>This page is intended for the SSO-protected Vercel Preview deployment.</small></p>
<button id="run" type="button">Run sandbox verification</button>
<pre id="result" aria-live="polite">Not run yet.</pre>
</main>
<script>
const button=document.getElementById('run');
const output=document.getElementById('result');
button.addEventListener('click',async()=>{
  button.disabled=true; output.textContent='Running sandbox OAuth check…';
  try{
    const response=await fetch('/api/paypal/sandbox-verify-run',{method:'POST',headers:{'Accept':'application/json'}});
    const data=await response.json();
    output.textContent=JSON.stringify(data,null,2);
  }catch(e){output.textContent='Request failed. Check the Vercel deployment logs.';}
  finally{button.disabled=false;}
});
</script>
</body></html>`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(page);
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // Vercel Preview SSO protection is the user-facing authorization boundary.
  // Refuse to run anywhere except the named preview branch.
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'feature/external-dependency-railway-v2') {
    return reply(res, 403, { ok: false, error: 'PROTECTED_PREVIEW_BRANCH_REQUIRED' });
  }

  if (!process.env.PAYPAL_VERIFY_HMAC_SECRET || process.env.PAYPAL_VERIFY_HMAC_SECRET.length < 32) {
    return reply(res, 503, { ok: false, error: 'VERIFICATION_GATE_NOT_CONFIGURED' });
  }
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
    // The access token is intentionally discarded; never log, return, or persist it.
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
  const evidenceSha256 = createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return reply(res, oauthAuthenticated ? 200 : 502, {
    ok: oauthAuthenticated,
    report,
    evidence_sha256: evidenceSha256,
  });
}
