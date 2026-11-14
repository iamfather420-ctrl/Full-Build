export type PayPalEnvironment = 'sandbox' | 'live';

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
}

export interface PayPalMaskedCredentialsInfo {
  environment: PayPalEnvironment;
  masked_client_id: string;
  has_credentials: boolean;
}

export interface PayPalCredentialTestResult {
  valid: boolean;
  authenticated: boolean;
  reason: string;
}

export interface PayPalCaptureResult {
  status: 'EXTERNAL_PROVIDER_REQUIRED' | 'BLOCKED';
  reason: string;
}

/**
 * Credential verification is read-only: it obtains a short-lived PayPal OAuth
 * access token but never creates an order, captures a payment, or enables
 * payment processing. Sandbox is the only accepted environment in this build.
 */
export class PayPalAdapter {
  private static instance: PayPalAdapter | null = null;
  private constructor() {}

  public static getInstance(): PayPalAdapter {
    if (!PayPalAdapter.instance) PayPalAdapter.instance = new PayPalAdapter();
    return PayPalAdapter.instance;
  }

  private readSandboxCredentials(): PayPalCredentials {
    return {
      clientId: (process.env.PAYPAL_SANDBOX_CLIENT_ID ?? '').trim(),
      clientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET ?? '',
      environment: 'sandbox'
    };
  }

  public publicStatus(): 'EXTERNAL_PROVIDER_REQUIRED' { return 'EXTERNAL_PROVIDER_REQUIRED'; }

  public hasActiveCredentials(): boolean {
    const credentials = this.readSandboxCredentials();
    const selected = (process.env.PAYPAL_ENVIRONMENT ?? 'sandbox').trim().toLowerCase();
    return selected === 'sandbox' && credentials.clientId.length > 0 && credentials.clientSecret.length > 0;
  }

  public getMaskedCredentialsInfo(): PayPalMaskedCredentialsInfo {
    const credentials = this.readSandboxCredentials();
    const selected = (process.env.PAYPAL_ENVIRONMENT ?? 'sandbox').trim().toLowerCase();
    const configured = selected === 'sandbox' && Boolean(credentials.clientId && credentials.clientSecret);
    const id = credentials.clientId;
    return {
      environment: 'sandbox',
      masked_client_id: configured ? (id.length <= 8 ? '********' : id.slice(0, 4) + '…' + id.slice(-4)) : 'NOT_CONFIGURED',
      has_credentials: configured
    };
  }

  public async testLiveCredentials(clientId: string, clientSecret: string, environment: PayPalEnvironment): Promise<PayPalCredentialTestResult> {
    if (environment !== 'sandbox') {
      return { valid: false, authenticated: false, reason: 'BLOCKED: live PayPal credential verification is not enabled in this release.' };
    }
    if (!clientId?.trim() || !clientSecret) {
      return { valid: false, authenticated: false, reason: 'BLOCKED: sandbox client ID or secret is missing.' };
    }

    try {
      const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(clientId.trim() + ':' + clientSecret, 'utf8').toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(12_000)
      });
      if (!response.ok) {
        // Do not include provider response bodies; they can contain sensitive diagnostics.
        return { valid: false, authenticated: false, reason: 'PayPal sandbox rejected the configured credentials (HTTP ' + response.status + ').' };
      }
      const payload = await response.json() as { access_token?: unknown; token_type?: unknown; expires_in?: unknown };
      const authenticated = typeof payload.access_token === 'string' &&
        payload.access_token.length > 0 &&
        typeof payload.expires_in === 'number' &&
        payload.expires_in > 0;
      return authenticated
        ? { valid: true, authenticated: true, reason: 'PayPal sandbox OAuth authentication succeeded; no payment operation was performed.' }
        : { valid: false, authenticated: false, reason: 'PayPal sandbox returned an incomplete OAuth token response.' };
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError'
        ? 'PayPal sandbox credential verification timed out.'
        : 'PayPal sandbox credential verification could not reach the provider.';
      return { valid: false, authenticated: false, reason };
    }
  }

  public clearSessionCredentials(): void {
    // No browser/session credential storage is used; credentials remain server-side.
  }

  public getEffectiveCredentials(): PayPalCredentials {
    return this.hasActiveCredentials()
      ? this.readSandboxCredentials()
      : { clientId: '', clientSecret: '', environment: 'sandbox' };
  }

  public setSessionCredentials(_clientId: string, _clientSecret: string, _environment: PayPalEnvironment): void {
    // Runtime credentials are sourced only from the server-side secret store.
  }

  public async captureOrderPayment(_orderId: string, _amountCents: number, _idempotencyKey: string): Promise<PayPalCaptureResult> {
    return {
      status: 'EXTERNAL_PROVIDER_REQUIRED',
      reason: 'BLOCKED: credential verification does not authorize payment processing; captures remain disabled by release policy.'
    };
  }
}
