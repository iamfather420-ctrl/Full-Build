import { computeSha256 } from '../database/DatabaseSchema';
import { SqliteStore } from '../database/SqliteStore';
import { DurableStore } from '../database/DurableStore';

export interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
}

export type PayPalGatewayState = 'NOT_CONFIGURED' | 'CONFIGURED' | 'APPROVAL_REQUIRED' | 'ORDER_CAPTURED' | 'RESPONSE_VALIDATED' | 'EXTERNAL_PROVIDER_REQUIRED' | 'PAYPAL_API_ERROR' | 'PYUSD_VERIFICATION_REQUIRED';

export interface PaymentResult {
  success: boolean;
  status: 'APPROVAL_REQUIRED' | 'COMPLETED' | 'EXTERNAL_PROVIDER_REQUIRED' | 'AUTHENTICATION_FAILED' | 'PAYPAL_API_ERROR' | 'IDEMPOTENCY_CONFLICT' | 'PYUSD_VERIFICATION_REQUIRED' | 'REJECTED';
  gateway_state: PayPalGatewayState;
  claim_scope: 'LOCAL' | 'SANDBOX' | 'PRODUCTION';
  payment?: Record<string, any>;
  approval_url?: string;
  error?: string;
}

/**
 * Server-only PayPal Orders v2 integration. Browser payloads never set amount,
 * currency, tenant, or credentials. A payment activates an order only after the
 * provider order and capture are re-read and match the stored order snapshot.
 */
export class PayPalAdapter {
  private static instance: PayPalAdapter | null = null;

  private constructor() {
    if (typeof window !== 'undefined') throw new Error('PayPalAdapter is server-only');
  }

  public static getInstance(): PayPalAdapter {
    if (!PayPalAdapter.instance) PayPalAdapter.instance = new PayPalAdapter();
    return PayPalAdapter.instance;
  }

  public getEffectiveCredentials(): PayPalCredentials | null {
    const environment = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : process.env.PAYPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : null;
    if (!environment) return null;
    const clientId = environment === 'live' ? process.env.PAYPAL_LIVE_CLIENT_ID : process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const clientSecret = environment === 'live' ? (process.env.PAYPAL_LIVE_CLIENT_SECRET || process.env.PAYPAL_LIVE_SECRET) : (process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_SANDBOX_SECRET);
    // Generic variables are sandbox-only for backwards-compatible local development; live never falls back.
    const compatibleId = environment === 'sandbox' ? process.env.PAYPAL_CLIENT_ID : undefined;
    const compatibleSecret = environment === 'sandbox' ? process.env.PAYPAL_CLIENT_SECRET : undefined;
    if (!(clientId || compatibleId) || !(clientSecret || compatibleSecret)) return null;
    return { clientId: (clientId || compatibleId)!.trim(), clientSecret: (clientSecret || compatibleSecret)!.trim(), environment };
  }

  public hasActiveCredentials(): boolean { return Boolean(this.getEffectiveCredentials()); }

  public getMaskedCredentialsInfo(): { configured: boolean; environment: 'sandbox' | 'live' | 'none'; gateway_state: PayPalGatewayState; pyusd_only_policy: 'ENABLED' | 'REQUIRED' | 'UNCONFIGURED'; webhook_configured: boolean } {
    const credentials = this.getEffectiveCredentials();
    return {
      configured: Boolean(credentials),
      environment: credentials?.environment || 'none',
      gateway_state: credentials ? 'CONFIGURED' : 'EXTERNAL_PROVIDER_REQUIRED',
      pyusd_only_policy: process.env.PAYPAL_PYUSD_ONLY_ENABLED === 'true' ? 'ENABLED' : 'REQUIRED',
      webhook_configured: Boolean(process.env.PAYPAL_WEBHOOK_ID)
    };
  }

  private scope(credentials?: PayPalCredentials): 'LOCAL' | 'SANDBOX' | 'PRODUCTION' {
    return credentials ? (credentials.environment === 'live' ? 'PRODUCTION' : 'SANDBOX') : 'LOCAL';
  }

  private host(credentials: PayPalCredentials): string {
    return credentials.environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  private async oauth(credentials: PayPalCredentials): Promise<{ token?: string; error?: string }> {
    try {
      const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      const response = await fetch(`${this.host(credentials)}/v1/oauth2/token`, {
        method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials'
      });
      const body = await response.json();
      return response.ok && body.access_token ? { token: body.access_token } : { error: body.error_description || body.error || `OAuth HTTP ${response.status}` };
    } catch (error: any) {
      return { error: `PayPal OAuth network error: ${error.message}` };
    }
  }

  private formatAmount(cents: number): string {
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Order amount must be a positive integer minor-unit value');
    return (cents / 100).toFixed(2);
  }

  private findPaymentByIdempotency(tenantId: string, idempotencyKey: string): any | undefined {
    return SqliteStore.getInstance().findTenantRecords<any>('payments', tenantId, 1000).find(payment => payment.idempotency_key === idempotencyKey);
  }

  public async createCheckout(orderId: string, tenantId: string, idempotencyKey: string): Promise<PaymentResult> {
    const credentials = this.getEffectiveCredentials();
    if (!credentials) return { success: false, status: 'EXTERNAL_PROVIDER_REQUIRED', gateway_state: 'EXTERNAL_PROVIDER_REQUIRED', claim_scope: 'LOCAL', error: 'PayPal credentials are not configured in the server environment.' };
    if (credentials.environment === 'live' && !process.env.PAYPAL_WEBHOOK_ID) return { success: false, status: 'REJECTED', gateway_state: 'EXTERNAL_PROVIDER_REQUIRED', claim_scope: 'PRODUCTION', error: 'Live PayPal checkout is blocked until PAYPAL_WEBHOOK_ID is configured.' };
    if (!idempotencyKey || idempotencyKey.length < 12 || idempotencyKey.length > 128) return { success: false, status: 'REJECTED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: 'A 12-128 character idempotency key is required.' };

    const sqlite = SqliteStore.getInstance();
    const order = sqlite.findTenantRecordById<any>('orders', tenantId, orderId);
    if (!order) return { success: false, status: 'REJECTED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: 'Order not found in the authenticated tenant.' };
    if (order.status !== 'ORDER_CREATED') return { success: false, status: 'REJECTED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: `Order is not eligible for checkout (status=${order.status}).` };
    if (order.payment_asset_policy !== 'PYUSD_ONLY' || order.currency !== 'USD') return { success: false, status: 'REJECTED', gateway_state: 'PYUSD_VERIFICATION_REQUIRED', claim_scope: this.scope(credentials), error: 'Order payment policy is not configured for PYUSD settlement.' };

    const existing = this.findPaymentByIdempotency(tenantId, idempotencyKey);
    if (existing) {
      if (existing.order_id !== orderId) return { success: false, status: 'IDEMPOTENCY_CONFLICT', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: 'Idempotency key was already used for another order.' };
      return { success: existing.status === 'COMPLETED', status: existing.status === 'COMPLETED' ? 'COMPLETED' : 'APPROVAL_REQUIRED', gateway_state: existing.status === 'COMPLETED' ? 'RESPONSE_VALIDATED' : 'APPROVAL_REQUIRED', claim_scope: this.scope(credentials), payment: existing, approval_url: existing.approval_url };
    }

    const paymentId = `pay_${computeSha256(`${tenantId}:${orderId}:${idempotencyKey}`).slice(0, 20)}`;
    const pending = {
      id: paymentId, tenant_id: tenantId, order_id: orderId, amount_cents: order.price_cents, currency: 'USD', requested_asset: 'PYUSD',
      provider: `PAYPAL_ORDERS_V2_${credentials.environment.toUpperCase()}`, status: 'APPROVAL_REQUIRED', idempotency_key: idempotencyKey,
      receipt_hash: computeSha256(`${orderId}:${order.price_cents}:USD:PYUSD:${idempotencyKey}`), created_at: Date.now()
    };
    try {
      sqlite.insertRecord('payments', pending);
    } catch (error: any) {
      return { success: false, status: 'IDEMPOTENCY_CONFLICT', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: `Unable to reserve checkout idempotency: ${error.message}` };
    }

    const auth = await this.oauth(credentials);
    if (!auth.token) {
      sqlite.updateTenantRecord('payments', tenantId, paymentId, { status: 'AUTHENTICATION_FAILED', failure_reason: auth.error });
      return { success: false, status: 'AUTHENTICATION_FAILED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: auth.error };
    }

    try {
      const response = await fetch(`${this.host(credentials)}/v2/checkout/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': idempotencyKey },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ reference_id: orderId, custom_id: orderId, invoice_id: paymentId, amount: { currency_code: 'USD', value: this.formatAmount(order.price_cents) }, description: `SOLVEX verified solution order ${orderId}` }],
          application_context: process.env.PAYPAL_RETURN_URL ? { return_url: process.env.PAYPAL_RETURN_URL, cancel_url: process.env.PAYPAL_CANCEL_URL || process.env.PAYPAL_RETURN_URL, user_action: 'PAY_NOW' } : undefined
        })
      });
      const body = await response.json();
      const approvalUrl = body.links?.find((link: any) => link.rel === 'approve')?.href;
      if (!response.ok || !body.id || !approvalUrl) {
        sqlite.updateTenantRecord('payments', tenantId, paymentId, { status: 'CREATE_REJECTED', provider_response: body });
        return { success: false, status: 'PAYPAL_API_ERROR', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: `PayPal order creation did not return an approval link (HTTP ${response.status}).` };
      }
      const updated = { ...pending, paypal_order_id: body.id, approval_url: approvalUrl, provider_response: body };
      sqlite.updateTenantRecord('payments', tenantId, paymentId, updated);
      DurableStore.getInstance().appendAudit(tenantId, 'PAYPAL_CHECKOUT', 'PAYPAL_ORDER_CREATED', 'PAYMENT', paymentId, { order_id: orderId, paypal_order_id: body.id, amount_cents: order.price_cents, currency: 'USD', requested_asset: 'PYUSD' });
      return { success: false, status: 'APPROVAL_REQUIRED', gateway_state: 'APPROVAL_REQUIRED', claim_scope: this.scope(credentials), payment: updated, approval_url: approvalUrl };
    } catch (error: any) {
      sqlite.updateTenantRecord('payments', tenantId, paymentId, { status: 'CREATE_NETWORK_FAILED', failure_reason: error.message });
      return { success: false, status: 'PAYPAL_API_ERROR', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: `PayPal create-order network failure: ${error.message}` };
    }
  }

  private extractAsset(payload: any): string | undefined {
    const capture = payload?.purchase_units?.[0]?.payments?.captures?.[0];
    return capture?.crypto_amount?.currency_code || capture?.seller_receivable_breakdown?.crypto_amount?.currency_code || payload?.payment_source?.crypto?.currency_code;
  }

  private captureMatches(payment: any, providerOrder: any, captureBody: any): { ok: boolean; reason?: string; capture?: any } {
    const unit = providerOrder?.purchase_units?.[0];
    const capture = captureBody?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED' || captureBody?.status !== 'COMPLETED') return { ok: false, reason: 'PayPal capture is not completed' };
    if (unit?.reference_id !== payment.order_id || unit?.custom_id !== payment.order_id) return { ok: false, reason: 'PayPal order reference does not match SOLVEX order' };
    if (unit?.amount?.currency_code !== 'USD' || unit?.amount?.value !== this.formatAmount(payment.amount_cents)) return { ok: false, reason: 'PayPal order amount/currency does not match stored order' };
    if (capture.amount?.currency_code !== 'USD' || capture.amount?.value !== this.formatAmount(payment.amount_cents)) return { ok: false, reason: 'PayPal capture amount/currency does not match stored order' };
    return { ok: true, capture };
  }

  public async captureApprovedOrder(orderId: string, tenantId: string, paypalOrderId: string): Promise<PaymentResult> {
    const credentials = this.getEffectiveCredentials();
    if (!credentials) return { success: false, status: 'EXTERNAL_PROVIDER_REQUIRED', gateway_state: 'EXTERNAL_PROVIDER_REQUIRED', claim_scope: 'LOCAL', error: 'PayPal credentials are not configured in the server environment.' };
    const sqlite = SqliteStore.getInstance();
    const order = sqlite.findTenantRecordById<any>('orders', tenantId, orderId);
    const payment = sqlite.findTenantRecords<any>('payments', tenantId, 1000).find(item => item.order_id === orderId && item.paypal_order_id === paypalOrderId);
    if (!order || !payment || order.status !== 'ORDER_CREATED' || payment.status !== 'APPROVAL_REQUIRED') return { success: false, status: 'REJECTED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: 'No eligible pending checkout exists for this order.' };

    const auth = await this.oauth(credentials);
    if (!auth.token) return { success: false, status: 'AUTHENTICATION_FAILED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: auth.error };
    try {
      const providerOrderRes = await fetch(`${this.host(credentials)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      const providerOrder = await providerOrderRes.json();
      if (!providerOrderRes.ok || providerOrder.status !== 'APPROVED') return { success: false, status: 'REJECTED', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: 'PayPal order is not approved by the payer.' };
      const captureRes = await fetch(`${this.host(credentials)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `${payment.idempotency_key}:capture` } });
      const captureBody = await captureRes.json();
      const checked = this.captureMatches(payment, providerOrder, captureBody);
      if (!captureRes.ok || !checked.ok) {
        sqlite.updateTenantRecord('payments', tenantId, payment.id, { status: 'CAPTURE_REJECTED', provider_capture_response: captureBody, failure_reason: checked.reason });
        return { success: false, status: 'PAYPAL_API_ERROR', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: checked.reason || `PayPal capture HTTP ${captureRes.status}` };
      }
      const asset = this.extractAsset(captureBody);
      // PayPal's public Orders v2 docs confirm PYUSD acceptance but do not expose a portable
      // request field that locks the payer funding asset. Therefore absence of an explicit
      // PYUSD provider receipt is a hard stop, never an inferred success.
      if (process.env.PAYPAL_PYUSD_ONLY_ENABLED !== 'true' || asset !== 'PYUSD') {
        sqlite.updateTenantRecord('payments', tenantId, payment.id, { status: 'PYUSD_VERIFICATION_REQUIRED', provider_capture_response: captureBody, observed_asset: asset || null });
        return { success: false, status: 'PYUSD_VERIFICATION_REQUIRED', gateway_state: 'PYUSD_VERIFICATION_REQUIRED', claim_scope: this.scope(credentials), error: 'Capture completed at PayPal but cannot activate: explicit PYUSD evidence is absent or the PYUSD-only policy is not deployment-enabled.' };
      }
      const captureId = checked.capture.id;
      const evidenceHash = computeSha256(JSON.stringify({ order_id: orderId, paypal_order_id: paypalOrderId, paypal_capture_id: captureId, amount_cents: payment.amount_cents, currency: 'USD', asset, provider_status: captureBody.status }));
      sqlite.transaction(() => {
        sqlite.updateTenantRecord('payments', tenantId, payment.id, { status: 'COMPLETED', paypal_capture_id: captureId, verified_at: Date.now(), observed_asset: asset, evidence_hash: evidenceHash, provider_capture_response: captureBody });
        sqlite.updateTenantRecord('orders', tenantId, orderId, { status: 'ESCROW_FUNDED', payment_id: payment.id, payment_evidence_hash: evidenceHash });
        DurableStore.getInstance().appendAudit(tenantId, 'PAYPAL_VERIFIER', 'PAYMENT_VERIFIED_AND_ORDER_ACTIVATED', 'ORDER', orderId, { payment_id: payment.id, paypal_order_id: paypalOrderId, paypal_capture_id: captureId, amount_cents: payment.amount_cents, currency: 'USD', asset, evidence_hash: evidenceHash });
      });
      return { success: true, status: 'COMPLETED', gateway_state: 'RESPONSE_VALIDATED', claim_scope: this.scope(credentials), payment: { ...payment, status: 'COMPLETED', paypal_capture_id: captureId, observed_asset: asset, evidence_hash: evidenceHash } };
    } catch (error: any) {
      return { success: false, status: 'PAYPAL_API_ERROR', gateway_state: 'PAYPAL_API_ERROR', claim_scope: this.scope(credentials), error: `PayPal capture network failure: ${error.message}` };
    }
  }

  public async handleWebhook(headers: Record<string, string | string[] | undefined>, event: any): Promise<{ accepted: boolean; status: number; error?: string }> {
    const credentials = this.getEffectiveCredentials();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!credentials || !webhookId) return { accepted: false, status: 503, error: 'Webhook verification is not configured' };
    const eventId = event?.id;
    if (!eventId || !event?.event_type) return { accepted: false, status: 400, error: 'Malformed PayPal webhook event' };
    const sqlite = SqliteStore.getInstance();
    if (sqlite.findRecordById('execution_runs', `webhook_${eventId}`)) return { accepted: true, status: 200 };
    const auth = await this.oauth(credentials);
    if (!auth.token) return { accepted: false, status: 503, error: 'Unable to verify webhook with PayPal' };
    const verificationBody = {
      auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: webhookId, webhook_event: event
    };
    const response = await fetch(`${this.host(credentials)}/v1/notifications/verify-webhook-signature`, { method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(verificationBody) });
    const result = await response.json();
    if (!response.ok || result.verification_status !== 'SUCCESS') return { accepted: false, status: 400, error: 'PayPal webhook signature verification failed' };
    sqlite.insertRecord('execution_runs', { id: `webhook_${eventId}`, tenant_id: 'SYSTEM', event_type: event.event_type, event_id: eventId, status: 'PAYPAL_SIGNATURE_VERIFIED', payload_hash: computeSha256(JSON.stringify(event)) });
    // Completion handling intentionally reuses the capture path and its stored-order checks;
    // unknown events/captures are recorded but never activate a SOLVEX order.
    return { accepted: true, status: 200 };
  }
}
