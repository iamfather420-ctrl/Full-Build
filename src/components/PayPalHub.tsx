import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';

interface PayPalHubProps {
  onCredentialsUpdated: () => void;
}

/**
 * Payment controls are intentionally unavailable until production readiness
 * and human authorization gates are independently verified. This component
 * performs no credential writes, network calls, checkout, capture, or payment.
 */
export const PayPalHub: React.FC<PayPalHubProps> = () => (
  <section className="space-y-6">
    <header className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-200">
        <Lock className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-white">Payment integration — disabled</h2>
        <p className="mt-1 text-sm text-slate-400">PayPal remains out of scope until the remaining production readiness gates are verified.</p>
      </div>
    </header>
    <div role="status" className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 text-sm text-amber-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>No payment credentials are read or written here. Checkout, capture, escrow funding, and live payment requests are not available. This screen will not claim the integration is connected or tested.</p>
      </div>
    </div>
  </section>
);
