import { PayPalAdapter } from '../payments/PayPalAdapter';

export interface ExternalAdapterInfo {
  adapter_id: string;
  name: string;
  category: string;
  status: 'AVAILABLE' | 'EXTERNAL_PROVIDER_REQUIRED' | 'DEGRADED';
  required_env_vars: string[];
  provided_env_vars: string[];
  live_connected: boolean;
  notes: string;
}

/** Runtime inventory reports only integrations that are permitted by the payment policy. */
export class ExternalAdapterRegistry {
  public static getInventory(): ExternalAdapterInfo[] {
    const paypal = PayPalAdapter.getInstance().getMaskedCredentialsInfo();
    const hasNeon = Boolean(process.env.NEON_DATABASE_URL);
    return [
      {
        adapter_id: 'DN-34', name: 'Neon Serverless PostgreSQL', category: 'DATABASE',
        status: hasNeon ? 'AVAILABLE' : 'EXTERNAL_PROVIDER_REQUIRED', required_env_vars: ['NEON_DATABASE_URL'],
        provided_env_vars: hasNeon ? ['NEON_DATABASE_URL'] : [], live_connected: false,
        notes: hasNeon ? 'Configuration detected; connection/migrations/RLS require separate deployment verification.' : 'Not configured. The local file-backed SQLite store is used only for local/sandbox execution.'
      },
      {
        adapter_id: 'DN-35', name: 'PayPal Commercial Gateway', category: 'PAYMENTS',
        status: paypal.configured ? 'AVAILABLE' : 'EXTERNAL_PROVIDER_REQUIRED',
        required_env_vars: ['PAYPAL_ENVIRONMENT', 'PAYPAL_<ENV>_CLIENT_ID', 'PAYPAL_<ENV>_SECRET', 'PAYPAL_WEBHOOK_ID'],
        provided_env_vars: paypal.configured ? ['PAYPAL_ENVIRONMENT'] : [], live_connected: false,
        notes: 'PayPal Orders v2 is server-only. SOLVEX requires provider-authenticated capture evidence, strict amount/reference matching, and webhook verification before order activation.'
      },
      {
        adapter_id: 'DN-36', name: 'Payment-Rail Policy Guard', category: 'POLICY_INTERLOCK', status: 'AVAILABLE', required_env_vars: [], provided_env_vars: [], live_connected: true,
        notes: 'SOLVEX does not implement any non-PayPal payment rail, exchange, or custody integration. PayPal is the only permitted commercial path.'
      }
    ];
  }
}
