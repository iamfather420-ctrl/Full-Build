import { createHash } from 'node:crypto';

let lastVerificationAt = 0;

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  // This diagnostic is intentionally preview-only. It performs OAuth authentication
  // against PayPal Sandbox and never enables payments or attempts a transaction.
  if (process.env.VERCEL_ENV !== 'preview') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (Date.now() - lastVerificationAt < 30_000) {
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }
  lastVerificationAt = Date.now();

  const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID ?? '';
  const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET ?? '';
  const timestamp = new Date().toISOString();
  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'SANDBOX_CREDENTIALS_NOT_CONFIGURED' });
  }

  let oauthHttpStatus = 0;
  let authenticated = false;
  try {
    const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000)
    });
    oauthHttpStatus = response.status;
    const body = await response.json() as { access_token?: string; token_type?: string };
    authenticated = response.ok && typeof body.access_token === 'string' && body.access_token.length > 0;
    // Do not persist, return, or log the access token.
  } catch {
    authenticated = false;
  }

  const evidence: Record<string, any> = {
    artifact_type: 'EXTERNAL_PROVIDER_SANDBOX_AUTHENTICATION_EVIDENCE',
    artifact_version: '1.0',
    provider: 'PayPal',
    claim_scope: 'SANDBOX_ONLY',
    source: {
      system: 'SolveX Vercel protected preview verification console',
      test_suite: 'PAYPAL_SANDBOX_OAUTH_AUTHENTICATION',
      oauth_endpoint: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      timestamp
    },
    result: {
      ok: authenticated,
      status: authenticated ? 'PASS' : 'FAIL',
      oauth_http_status: oauthHttpStatus,
      environment: 'sandbox',
      sandbox_credentials_present: true,
      sandbox_oauth_authenticated: authenticated,
      payments_enabled: false,
      live_credentials_read: false,
      live_api_contacted: false,
      transaction_attempted: false,
      token_persisted: false
    },
    security_boundary: {
      secrets_included: false,
      access_token_included: false,
      live_environment_tested: false,
      orders_captures_refunds_or_transactions_attempted: false,
      payments_enabled: false
    }
  };
  evidence.evidence_sha256 = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(authenticated ? 200 : 502).json(evidence);
}
