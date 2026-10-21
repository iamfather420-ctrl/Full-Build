import { computeSha256 } from '../database/DatabaseSchema';
import { SqliteStore } from '../database/SqliteStore';
import { NeonStore } from '../database/NeonPersistence';

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
}

export type PayPalGatewayState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'AUTHENTICATED'
  | 'ORDER_CREATED'
  | 'ORDER_CAPTURED'
  | 'RESPONSE_VALIDATED'
  | 'TRANSACTION_IDENTITY_VERIFIED'
  | 'SANDBOX_VERIFIED'
  | 'PRODUCTION_VERIFIED'
  | 'EXTERNAL_PROVIDER_REQUIRED'
  | 'PAYPAL_API_ERROR'
  | 'PAYMENTS_DISABLED';

export interface PaymentCaptureResult {
  success: boolean;
  status: 'COMPLETED' | 'EXTERNAL_PROVIDER_REQUIRED' | 'AUTHENTICATION_FAILED' | 'PAYPAL_API_ERROR' | 'IDEMPOTENCY_CONFLICT' | 'PERSISTENCE_FAILURE' | 'PAYMENTS_DISABLED';
  claim_scope: 'SANDBOX' | 'PRODUCTION' | 'LOCAL';
  gateway_state: PayPalGatewayState;
  payment?: {
    order_id: string;
    amount_cents: number;
    currency: string;
    provider: string;
    status: string;
    idempotency_key: string;
    receipt_hash: string;
    paypal_order_id?: string;
    paypal_capture_id?: string;
    raw_provider_response?: any;
    created_at: number;
  };
  error?: string;
}

export interface PayPalVerificationTestResult {
  valid: boolean;
  status_code: number;
  environment: 'sandbox' | 'live';
  gateway_state: PayPalGatewayState;
  client_id_preview: string;
  app_id?: string;
  token_type?: string;
  expires_in?: number;
  message: string;
  timestamp: number;
}

export class PayPalAdapter {
  private static instance: PayPalAdapter | null = null;
  private sessionCredentials: PayPalCredentials | null = null;

  private constructor() {
    // Strictly server-authoritative in-memory credentials only.
    // Client secrets MUST NEVER be written to or read from browser localStorage, sessionStorage, or IndexedDB.
  }

  public static getInstance(): PayPalAdapter {
    if (!PayPalAdapter.instance) {
      PayPalAdapter.instance = new PayPalAdapter();
    }
    return PayPalAdapter.instance;
  }

  public getActiveEnvironment(): 'sandbox' | 'live' {
    return 'sandbox';
  }

  public getSandboxCredentials(): PayPalCredentials | null {
    return null;
  }

  public getLiveCredentials(): PayPalCredentials | null {
    return null;
  }

  public getEffectiveCredentials(): PayPalCredentials | null {
    return null;
  }

  public setSessionCredentials(_clientId: string, _clientSecret: string, _environment: 'sandbox' | 'live' = 'sandbox'): boolean {
    this.sessionCredentials = null;
    return false;
  }

  public clearSessionCredentials(): void {
    this.sessionCredentials = null;
  }

  public hasActiveCredentials(): boolean {
    const creds = this.getEffectiveCredentials();
    return Boolean(creds && creds.clientId && creds.clientSecret);
  }

  public getMaskedCredentialsInfo(): {
    configured: boolean;
    source: 'ENVIRONMENT' | 'SESSION' | 'NONE';
    environment: 'sandbox' | 'live';
    gateway_state: PayPalGatewayState;
    masked_client_id: string;
    masked_secret: string;
  } {
    const creds = this.getEffectiveCredentials();
    if (!creds) {
      return {
        configured: false,
        source: 'NONE',
        environment: 'sandbox',
        gateway_state: 'PAYMENTS_DISABLED',
        masked_client_id: 'Disabled by release policy',
        masked_secret: 'Not used in this release'
      };
    }
    const source = this.sessionCredentials ? 'SESSION' : 'ENVIRONMENT';
    const mask = (str: string) => str.length > 8 ? `${str.slice(0, 4)}...${str.slice(-4)}` : '••••••••';
    return {
      configured: true,
      source,
      environment: creds.environment,
      gateway_state: 'CONFIGURED',
      masked_client_id: mask(creds.clientId),
      masked_secret: mask(creds.clientSecret)
    };
  }

  public async acquireOAuthToken(_creds?: PayPalCredentials): Promise<{
    access_token?: string;
    token_type?: string;
    app_id?: string;
    expires_in?: number;
    status_code: number;
    error?: string;
  }> {
    return { status_code: 410, error: 'PAYMENTS_DISABLED: no provider authentication request was made.' };
  }

  public async testLiveCredentials(
    _overrideClientId?: string,
    _overrideSecret?: string,
    _overrideEnv?: 'sandbox' | 'live'
  ): Promise<PayPalVerificationTestResult> {
    return {
      valid: false,
      status_code: 410,
      environment: 'sandbox',
      gateway_state: 'PAYMENTS_DISABLED',
      client_id_preview: 'DISABLED',
      message: 'Payment processing is disabled in this release. No provider request was made.',
      timestamp: Date.now()
    };
  }

  /**
   * Release-level payment kill switch. This adapter cannot capture funds in this build.
   * The return occurs without reading credentials, contacting a provider, writing to a database,
   * or generating a receipt. Re-enabling payments requires a separately reviewed release.
   */
  public async captureOrderPayment(
    _orderId: string,
    _amountCents: number,
    _idempotencyKey: string
  ): Promise<PaymentCaptureResult> {
    return {
      success: false,
      status: 'PAYMENTS_DISABLED',
      claim_scope: 'LOCAL',
      gateway_state: 'NOT_CONFIGURED',
      error: 'Payment processing is disabled in this release. No payment was attempted and no receipt was created.'
    };
  }

}
