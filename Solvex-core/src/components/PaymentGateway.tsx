/**
 * Recovered PaymentGateway presentation, integrated with fail-closed behavior.
 * Original checkout simulation is preserved for review under recovered-ui-source/.
 * This active component never calls a provider or creates a transaction.
 */
import React from 'react';
import { Coins, Shield, Lock, AlertTriangle, ArrowRight, CreditCard } from 'lucide-react';
import type { PaymentProvider } from '../types';

interface PaymentGatewayProps {
  providers: PaymentProvider[];
  onToggleProvider: (id: string) => void;
  onAddTransaction: (provider: string, amount: number, item: string) => void;
}

export default function PaymentGateway({ providers, onToggleProvider }: PaymentGatewayProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="payment_gateway_module">
      <section className="xl:col-span-1 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <h2 className="font-display font-medium text-lg text-white">Unified API Handshakes</h2>
          </div>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">BLOCKED</span>
        </div>
        <p className="text-xs text-neutral-400 mb-6 font-sans">
          Provider status is displayed for inspection only. These controls cannot connect providers or test credentials.
        </p>
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li key={provider.id} id={`provider_card_${provider.id}`} className="flex items-center justify-between gap-3 p-3 rounded border border-neutral-900 bg-black/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded bg-neutral-950 text-neutral-500 border border-neutral-900"><CreditCard className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h3 className="text-xs font-mono font-medium text-white">{provider.name}</h3>
                  <span className="text-[10px] font-mono text-neutral-500 block break-all">{provider.connectionId || 'Not connected'}</span>
                  <span className="text-[10px] font-mono text-amber-300 uppercase">{provider.status}</span>
                </div>
              </div>
              <button type="button" id={`toggle_btn_${provider.id}`} onClick={() => onToggleProvider(provider.id)}
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded border border-neutral-700 text-neutral-300 hover:text-white">
                Keep disabled
              </button>
            </li>
          ))}
        </ul>
        <div className="text-[9px] font-mono text-neutral-600 mt-6 pt-4 border-t border-neutral-900">
          NO PROVIDER HANDSHAKE HAS BEEN PERFORMED
        </div>
      </section>

      <section className="xl:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border">
        <div className="flex items-center gap-2 mb-4 border-b border-neutral-900 pb-3">
          <Coins className="h-4 w-4 text-cyan-400" />
          <div>
            <h3 className="font-display font-medium text-white">Unified Transaction API</h3>
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Transaction ingress unavailable</span>
          </div>
        </div>
        <div role="status" className="rounded border border-amber-800/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-mono text-xs uppercase">BLOCKED — PAYMENTS DISABLED</strong>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
              Checkout, escrow, payment creation, and transaction recording are disabled. The server endpoint returns a blocked response. This panel will not call it, display a checkout URL, or claim a payment succeeded.
            </p>
          </div>
        </div>
        <div className="mt-5 border border-neutral-900 rounded bg-black/60 p-4 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-neutral-300 mb-3"><Lock className="h-4 w-4 text-amber-400" /> REQUEST GATE STATUS</div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><dt className="text-[10px] text-neutral-500 uppercase">Endpoint</dt><dd className="text-neutral-200 mt-1">/api/pay/create</dd></div>
            <div><dt className="text-[10px] text-neutral-500 uppercase">Execution</dt><dd className="text-amber-300 mt-1">Not attempted</dd></div>
            <div><dt className="text-[10px] text-neutral-500 uppercase">Provider credentials</dt><dd className="text-neutral-200 mt-1">Not read or tested</dd></div>
            <div><dt className="text-[10px] text-neutral-500 uppercase">Ledger mutation</dt><dd className="text-neutral-200 mt-1">None</dd></div>
          </dl>
        </div>
        <div className="text-[10px] font-mono text-neutral-500 mt-4 border-t border-neutral-900 pt-4 flex items-center justify-between gap-3">
          <span>FAIL-CLOSED PAYMENT GATE</span><ArrowRight className="h-4 w-4 text-neutral-600" /><span>NO CHARGE OR RECEIPT</span>
        </div>
      </section>
    </div>
  );
}
