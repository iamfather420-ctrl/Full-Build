export interface PayPalSandboxCredentialCheck {
  configured: boolean;
  authenticated: boolean;
  environment: 'sandbox';
  reason: string;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Sandbox-only PayPal credential verifier.
 * The endpoint is hard-pinned to PayPal's sandbox host; no live endpoint is accepted.
 * It obtains and immediately discards an OAuth access token. It does not create,
 * authorize, capture, refund, or otherwise move money.
 */
export class PayPalSandboxClient {
  private readonly fetcher: FetchLike;

  constructor(fetcher: FetchLike = fetch) {
    this.fetcher = fetcher;
  }

  async verifyCredentials(): Promise<PayPalSandboxCredentialCheck> {
    if (process.env.PAYPAL_ENVIRONMENT !== 'sandbox') {
      return {
        configured: false,
        authenticated: false,
        environment: 'sandbox',
        reason: 'BLOCKED: PAYPAL_ENVIRONMENT must be exactly sandbox.'
      };
    }

    const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || '';
    const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      return {
        configured: false,
        authenticated: false,
        environment: 'sandbox',
        reason: 'PayPal sandbox credentials are not configured in this runtime.'
      };
    }

    try {
      const basic = Buffer.from(clientId + ':' + clientSecret, 'utf8').toString('base64');
      const response = await this.fetcher('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + basic,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        return {
          configured: true,
          authenticated: false,
          environment: 'sandbox',
          reason: 'PayPal sandbox rejected the credential check (HTTP ' + response.status + ').'
        };
      }
      const payload = await response.json() as { access_token?: unknown; token_type?: unknown };
      const valid = typeof payload.access_token === 'string' && payload.access_token.length > 0
        && typeof payload.token_type === 'string' && payload.token_type.toLowerCase() === 'bearer';
      return {
        configured: true,
        authenticated: valid,
        environment: 'sandbox',
        reason: valid
          ? 'PayPal sandbox OAuth credentials verified. No payment was created or captured.'
          : 'PayPal sandbox returned an incomplete OAuth response.'
      };
    } catch {
      return {
        configured: true,
        authenticated: false,
        environment: 'sandbox',
        reason: 'PayPal sandbox credential verification failed due to a network or response error.'
      };
    }
  }
}
