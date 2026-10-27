import React, { useState } from 'react';
import { PaymentProvider } from '../types';
import { CreditCard, Wallet, Smartphone, Coins, Shield, AlertTriangle } from 'lucide-react';

interface PaymentGatewayProps {
  providers: PaymentProvider[];
  onToggleProvider: (id: string) => void;
  onAddTransaction: (provider: string, amount: number, item: string) => void;
}

/**
 * Recovered from v0.1.0-daisy-ai-os archive, sanitized:
 * - Removed Simulate Successful Payment and local transaction fabrication
 * - Calls /api/pay/create only to surface the server BLOCKED/410 response
 * - Does not invent checkout URLs or completed payments
 */
export default function PaymentGateway({ providers, onToggleProvider }: PaymentGatewayProps) {
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.id || 'paypal');
  const [checkoutAmount, setCheckoutAmount] = useState('99');
  const [checkoutItem, setCheckoutItem] = useState('Autonomous API Template Integration');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<Record<string, unknown> | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="h-5 w-5" />;
      case 'Wallet': return <Wallet className="h-5 w-5" />;
      case 'Smartphone': return <Smartphone className="h-5 w-5" />;
      case 'Coins': return <Coins className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const handleProbeEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCheckoutResult(null);
    try {
      const response = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          amount: Math.round(parseFloat(checkoutAmount || '0') * 100),
          currency: 'USD',
          metadata: { item: checkoutItem, timestamp: new Date().toISOString() },
        }),
      });
      const data = await response.json().catch(() => ({
        success: false,
        status: 'BLOCKED',
        code: 'INVALID_JSON',
        message: 'Payment endpoint returned a non-JSON body.',
      }));
      setCheckoutResult({ httpStatus: response.status, ...data });
    } catch (err) {
      setCheckoutResult({
        success: false,
        status: 'BLOCKED',
        code: 'REQUEST_FAILED',
        message: err instanceof Error ? err.message : 'Payment probe failed; no simulated receipt was created.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border" id="payment_gateway_module">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="font-display font-medium text-white">Payment Gateway</h2>
            <span className="text-[10px] font-mono text-amber-400 tracking-wider uppercase">
              Recovered UI · payments DISABLED
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono">BLOCKED</span>
        </div>
      </div>

      <div className="mb-4 p-3 border border-amber-900/50 bg-amber-950/20 rounded text-xs text-amber-100/90 font-mono">
        Live capture, escrow, and checkout success simulation were removed from the archived module.
        Probing <code className="text-amber-300">/api/pay/create</code> should return HTTP 410 / PAYMENTS_DISABLED.
        No transaction is recorded as paid from this UI.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Providers (inactive)</span>
          {providers.length === 0 && (
            <p className="text-xs text-neutral-500">No active payment providers configured.</p>
          )}
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedProvider(p.id);
                onToggleProvider(p.id);
              }}
              className={`w-full flex items-center justify-between p-3 rounded border text-left ${
                selectedProvider === p.id ? 'border-cyan-700 bg-cyan-950/20' : 'border-neutral-900 bg-black/40'
              }`}
            >
              <span className="flex items-center space-x-2 text-sm text-neutral-200">
                {getIcon(p.icon)}
                <span>{p.name}</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">{p.status}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleProbeEndpoint} className="space-y-3 border border-neutral-900 rounded p-3 bg-black/30">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block">Disabled checkout probe</span>
          <input
            className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2 rounded text-white"
            value={checkoutItem}
            onChange={(e) => setCheckoutItem(e.target.value)}
            placeholder="Item label (not charged)"
          />
          <input
            className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2 rounded text-white"
            value={checkoutAmount}
            onChange={(e) => setCheckoutAmount(e.target.value)}
            placeholder="Amount USD (not charged)"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-800 border border-neutral-700 text-white text-xs font-mono py-2 rounded hover:bg-neutral-700 disabled:opacity-50"
          >
            {isLoading ? 'Probing…' : 'Probe /api/pay/create (expect BLOCKED)'}
          </button>
          <div className="p-2 bg-neutral-950 border border-neutral-900 rounded h-40 overflow-auto font-mono text-[10px] text-cyan-400">
            {checkoutResult ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(checkoutResult, null, 2)}</pre>
            ) : (
              <span className="text-neutral-600">No probe result yet.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
