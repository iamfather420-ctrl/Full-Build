
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

export class ExternalAdapterRegistry {
  public static getInventory(): ExternalAdapterInfo[] {
    const hasNeon = Boolean(typeof process !== 'undefined' && process.env?.NEON_DATABASE_URL);

    return [
      {
        adapter_id: 'DN-34',
        name: 'Neon Serverless PostgreSQL',
        category: 'DATABASE',
        status: hasNeon ? 'AVAILABLE' : 'EXTERNAL_PROVIDER_REQUIRED',
        required_env_vars: ['NEON_DATABASE_URL'],
        provided_env_vars: hasNeon ? ['NEON_DATABASE_URL'] : [],
        live_connected: hasNeon,
        notes: 'When credentials not configured, local SQLite with 27-table schema and DurableStore WAL operates as zero-compromise deterministic fallback.'
      },
      {
        adapter_id: 'DN-35',
        name: 'PayPal Enterprise Gateway',
        category: 'PAYMENTS',
        status: 'DEGRADED',
        required_env_vars: [],
        provided_env_vars: [],
        live_connected: false,
        notes: 'DISABLED IN THIS RELEASE. No capture, payment request, or receipt is permitted until a separately approved release.'
      },
      {
        adapter_id: 'DN-36',
        name: 'Fiat Settlement Policy Guard (Stripe Prohibited)',
        category: 'POLICY_INTERLOCK',
        status: 'AVAILABLE',
        required_env_vars: [],
        provided_env_vars: [],
        live_connected: true,
        notes: 'Payment and escrow flows are disabled in this release; no alternative payment provider is active.'
      },
      {
        adapter_id: 'DN-37',
        name: 'Coinbase Commerce',
        category: 'PAYMENTS',
        status: 'EXTERNAL_PROVIDER_REQUIRED',
        required_env_vars: ['COINBASE_API_KEY'],
        provided_env_vars: [],
        live_connected: false,
        notes: 'Crypto commerce webhook handler.'
      }
    ];
  }
}
