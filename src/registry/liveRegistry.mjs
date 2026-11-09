import { neon } from '@neondatabase/serverless';

const TABLES = ['paradoxes', 'node_registry', 'offers', 'solutions', 'proof_bundles', 'payments', 'orders'];

function databaseUrl() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgres(?:ql)?:/, 'http:')).hostname;
  } catch {
    return null;
  }
}

export async function readLiveRegistry() {
  const url = databaseUrl();
  const paypalPresent = Boolean(process.env.PAYPAL_SANDBOX_CLIENT_ID && process.env.PAYPAL_SANDBOX_CLIENT_SECRET);
  const base = {
    payments_enabled: false,
    authentication_enabled: false,
    paypal: {
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
      credentials_present: paypalPresent,
      capture: 'BLOCKED',
    },
  };
  if (!url) {
    return { ...base, connected: false, host: null, reason: 'NEON_DATABASE_URL or DATABASE_URL is not set in this process.' };
  }
  try {
    const sql = neon(url);
    const counts = {};
    for (const table of TABLES) {
      const rows = await sql.query(`SELECT count(*)::int AS n FROM public.${table}`);
      counts[table] = rows[0]?.n ?? 0;
    }
    const paradoxes = await sql`SELECT code, name, domain, verification_status FROM public.paradoxes ORDER BY code ASC LIMIT 8`;
    const nodes = await sql`SELECT node_code, node_name, subsystem, status FROM public.node_registry ORDER BY node_code ASC LIMIT 8`;
    const offers = await sql`SELECT title, verification_status, published, price_cents FROM public.offers ORDER BY title ASC LIMIT 8`;
    return {
      ...base,
      connected: true,
      host: hostOf(url),
      counts,
      paradoxes,
      nodes,
      offers,
    };
  } catch (error) {
    return {
      ...base,
      connected: false,
      host: hostOf(url),
      reason: error instanceof Error ? error.message : 'Neon query failed closed.',
    };
  }
}
