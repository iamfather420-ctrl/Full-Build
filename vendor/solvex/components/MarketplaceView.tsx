import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, ShoppingCart } from 'lucide-react';
import { MarketplaceEngine } from '../marketplace/MarketplaceEngine';
import { UserContext } from '../auth/AuthService';

interface MarketplaceViewProps {
  currentUser: UserContext;
  onNavigateToPayPal: () => void;
  onNavigateToEvidence: (proofId: string) => void;
}

/** Public catalog. A listing must still have a verified solution and a verified proof bundle. */
export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ currentUser, onNavigateToEvidence }) => {
  const engine = MarketplaceEngine.getInstance();
  const { listed, held } = engine.listCatalog();
  const signedIn = currentUser.issued_at > 0;
  const offers = listed.filter((offer) => !signedIn || offer.tenant_id === currentUser.tenant_id);
  const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200"><ShoppingCart className="h-5 w-5" /></span>
        <div><h2 className="text-xl font-bold text-white">SOLVEX Marketplace</h2><p className="mt-1 text-sm text-slate-400">A listing needs a published offer, a verified solution, and a verified proof bundle. Checkout stays off.</p></div>
      </header>
      <div className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 text-sm text-amber-200"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Checkout, escrow funding, and live payments are disabled pending human authorization and production readiness verification.</p></div></div>
      {offers.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <h3 className="font-semibold text-slate-200">Nothing is listed</h3>
          {held.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No offer has passed the publication gate.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {held.map((item) => (
                <li key={item.title}><span className="text-slate-100">{item.title}.</span> {item.reason}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.offer_id || offer.id || offer.solution_id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{offer.title}</h3><span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Verified</span></div>
              <p className="mt-2 text-sm text-slate-400">{offer.description}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-4"><span className="text-lg font-bold text-white">{money(offer.price_cents)}</span><button type="button" onClick={() => onNavigateToEvidence(offer.proof_bundle_id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"><ShieldCheck className="h-4 w-4" /> View evidence</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
