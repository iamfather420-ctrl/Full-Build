import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCode, RefreshCw, ShieldCheck } from 'lucide-react';

interface MarketplaceViewProps { onNavigateToPayPal: () => void; onNavigateToEvidence: (proofId: string) => void; }
interface Offer { offer_id: string; solution_id: string; proof_bundle_id: string; title: string; description: string; price_cents: number; verification_status: string; }

/** Public catalogue only. Checkout is intentionally unavailable without a server-authenticated session. */
export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onNavigateToPayPal, onNavigateToEvidence }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadOffers = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/offers');
      if (!response.ok) throw new Error('Marketplace catalogue is unavailable');
      setOffers(await response.json());
    } catch (reason: any) { setError(reason.message || 'Unable to load catalogue'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadOffers(); }, []);

  return <div className="space-y-6">
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4"><div><h2 className="text-xl font-bold text-white">SOLVEX Verified B2B Marketplace</h2><p className="mt-1 text-sm text-slate-400">Only an evidence-bound solution that passes independent verification may appear here. Candidate and claim-only work remains non-purchasable.</p></div><button onClick={loadOffers} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex gap-2 items-center"><RefreshCw className="w-3 h-3"/>Refresh</button></div>
    </section>
    <section className="p-4 rounded-xl border border-amber-800 bg-amber-950/20 text-amber-200 text-xs flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0"/><p><strong>Commercial gate:</strong> order creation, checkout, capture, payment evidence, and fulfillment are server-side actions. The public browser view cannot set a paid, funded, provisioned, replayed, or deployed state.</p></section>
    {loading ? <div className="text-sm text-slate-400">Loading verified listings…</div> : error ? <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-sm flex gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div> : offers.length === 0 ? <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800"><FileCode className="w-7 h-7 text-slate-500 mx-auto mb-3"/><h3 className="text-white font-semibold">No commercially verified offerings</h3><p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">This is expected until a solution has executable evidence, an independently verified proof bundle bound to its implementation hash, and a successful publication-gate evaluation.</p></div> : <div className="grid gap-4">{offers.map(offer => <article key={offer.offer_id} className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-800/70"><div className="flex justify-between gap-4"><div><div className="text-xs font-mono text-cyan-300">{offer.solution_id} · {offer.proof_bundle_id}</div><h3 className="mt-1 text-white font-semibold">{offer.title}</h3><p className="mt-2 text-sm text-slate-400">{offer.description}</p></div><div className="text-right"><div className="text-emerald-300 font-bold">${(offer.price_cents / 100).toFixed(2)}</div><span className="text-xs text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>{offer.verification_status}</span></div></div><div className="mt-4 flex gap-3"><button onClick={() => onNavigateToEvidence(offer.proof_bundle_id)} className="text-xs text-cyan-300">Inspect evidence</button><button onClick={onNavigateToPayPal} className="text-xs text-slate-400">Payment configuration</button></div></article>)}</div>}
  </div>;
};
