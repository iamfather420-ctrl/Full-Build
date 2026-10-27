/**
 * PaymentGateway — intentionally non-operational.
 * Mirrors the fail-closed posture of src/components/PayPalHub.tsx and native payment routes.
 * Does not call providers, invent checkout URLs, or mark transactions paid.
 */
import React from 'react';
import { AlertTriangle, Lock, Coins } from 'lucide-react';
import type { PaymentProvider } from '../types';

interface PaymentGatewayProps {
  providers: PaymentProvider[];
  onToggleProvider: (id: string) => void;
  onAddTransaction: (provider: string, amount: number, item: string) => void;
}

export default function PaymentGateway({
  providers,
  onToggleProvider,
}: PaymentGatewayProps) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6" id="payment_gateway_module">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
          <Lock className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="font-display font-medium text-lg text-white">Unified Payment Gateway</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            All payment processing is disabled. No credentials are read, no provider sessions are opened, and no orders can be marked paid from the browser.
          </p>
        </div>
      </div>

      <div role="status" className="rounded border border-amber-800/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong className="font-mono text-xs uppercase">BLOCKED</strong> — PayPal and every other payment rail remain off until the production payment architecture, server-side verification, webhook authenticity, and reconciliation gates pass. Toggle actions only re-assert the blocked state.
        </p>
      </div>

      <ul className="space-y-3">
        {providers.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 rounded border border-neutral-900 bg-neutral-900/40 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Coins className="h-4 w-4 text-neutral-500" />
              <div>
                <div className="text-sm font-medium text-white">{p.name}</div>
                <div className="text-[10px] font-mono uppercase text-neutral-500">
                  {p.type} · {p.status}
                </div>
              </div>
            </div>
            <button
              type="button"
              id={`btn_toggle_provider_${p.id}`}
              onClick={() => onToggleProvider(p.id)}
              className="text-[10px] font-mono px-3 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:border-neutral-500"
            >
              Keep disabled
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
