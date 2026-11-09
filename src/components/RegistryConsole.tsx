import React, { useEffect, useState } from 'react';

type RegistryRow = Record<string, string | number | boolean | null>;
type RegistryResponse = {
  connected: boolean;
  host: string | null;
  reason?: string;
  payments_enabled: boolean;
  authentication_enabled: boolean;
  paypal: { environment: string; credentials_present: boolean; capture: string };
  counts?: Record<string, number>;
  paradoxes?: RegistryRow[];
  nodes?: RegistryRow[];
  offers?: RegistryRow[];
};

export function RegistryConsole() {
  const [registry, setRegistry] = useState<RegistryResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/registry')
      .then(async (response) => {
        const body = await response.json() as RegistryResponse;
        setRegistry(body);
        if (!response.ok && !body.connected) setError(body.reason || 'Registry did not connect.');
      })
      .catch(() => setError('The registry request failed.'));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">SolveX registry</p>
        <h1 className="mt-2 text-3xl font-semibold">Daisy can read the live registry. It still cannot spend or sign in.</h1>
        <p className="mt-3 max-w-3xl text-slate-400">This screen is a read of the SolveX Neon database. No session is created, and payment capture stays blocked.</p>

        {!registry && !error && <p className="mt-8 text-slate-400">Connecting to Neon…</p>}
        {error && <p className="mt-8 text-amber-300">{error}</p>}

        {registry && (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {Object.entries(registry.counts || {}).map(([name, count]) => (
                <div key={name} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <div className="text-2xl font-semibold">{count}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">{name.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Database {registry.connected ? 'connected' : 'not connected'}
              {registry.host ? ` at ${registry.host}` : ''}. PayPal {registry.paypal.environment} credentials {registry.paypal.credentials_present ? 'are present' : 'are not in this process'}. Capture is {registry.paypal.capture}.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <RecordList title="Paradoxes" rows={registry.paradoxes} fields={['code', 'name', 'verification_status']} />
              <RecordList title="Nodes" rows={registry.nodes} fields={['node_code', 'node_name', 'status']} />
              <RecordList title="Offers" rows={registry.offers} fields={['title', 'verification_status', 'price_cents']} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function RecordList({ title, rows, fields }: { title: string; rows?: RegistryRow[]; fields: string[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(rows || []).map((row, index) => (
          <li key={index} className="border-t border-slate-800 pt-2 text-slate-300">
            {fields.map((field) => String(row[field] ?? '')).filter(Boolean).join(' · ')}
          </li>
        ))}
      </ul>
    </section>
  );
}
