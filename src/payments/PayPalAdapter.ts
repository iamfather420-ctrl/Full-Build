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
 * Fail-closed payment boundary. The production PayPal integration is deliberately
 * unavailable: this adapter performs no network calls, credential persistence,
 * order creation, capture, or synthetic receipt generation.
 */
export class PayPalAdapter {
  private static instance: PayPalAdapter | null = null;
  private constructor() {}

  public static getInstance(): PayPalAdapter {
    if (!PayPalAdapter.instance) PayPalAdapter.instance = new PayPalAdapter();
    return PayPalAdapter.instance;
  }

  public publicStatus(): 'EXTERNAL_PROVIDER_REQUIRED' { return 'EXTERNAL_PROVIDER_REQUIRED'; }

  public hasActiveCredentials(): boolean {
    return false;
  }

  public getMaskedCredentialsInfo(): PayPalMaskedCredentialsInfo {
    return { environment: 'sandbox', masked_client_id: 'NOT_CONFIGURED', has_credentials: false };
  }

  public async testLiveCredentials(_clientId: string, _clientSecret: string, _environment: PayPalEnvironment): Promise<PayPalCredentialTestResult> {
    return { valid: false, authenticated: false, reason: 'BLOCKED: PayPal credential testing is disabled and no network request was made.' };
  }

  public clearSessionCredentials(): void {
    // Intentionally no session credential storage exists in this disabled adapter.
  }

  public getEffectiveCredentials(): PayPalCredentials {
    return { clientId: '', clientSecret: '', environment: 'sandbox' };
  }

  public setSessionCredentials(_clientId: string, _clientSecret: string, _environment: PayPalEnvironment): void {
    // Credentials are not accepted while the production payment gate is closed.
  }

  public async captureOrderPayment(_orderId: string, _amountCents: number, _idempotencyKey: string): Promise<PayPalCaptureResult> {
    return {
      status: 'EXTERNAL_PROVIDER_REQUIRED',
      reason: 'BLOCKED: PayPal payments are disabled pending production authorization and readiness verification.'
    };
  }
}
