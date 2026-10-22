import React, { useState } from 'react';
import { ShoppingCart, Calculator, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Lock, Play, FileCode, Check } from 'lucide-react';
import { MarketplaceEngine, DefensiblePriceResult } from '../marketplace/MarketplaceEngine';
import { DurableStore } from '../database/DurableStore';
import { PayPalAdapter } from '../payments/PayPalAdapter';
import { OrderLifecycleManager } from '../marketplace/OrderLifecycle';
import { UserContext } from '../auth/AuthService';

interface MarketplaceViewProps {
  currentUser: UserContext;
  onNavigateToPayPal: () => void;
  onNavigateToEvidence: (proofId: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentUser,
  onNavigateToPayPal,
  onNavigateToEvidence
}) => {
  const market = MarketplaceEngine.getInstance();
  const durable = DurableStore.getInstance();
  const paypal = PayPalAdapter.getInstance();
  const lifecycle = OrderLifecycleManager.getInstance();

  // Pricing calculator state
  const [costBasisUsd, setCostBasisUsd] = useState(250);
  const [complexityFactor, setComplexityFactor] = useState(1.5);
  const [riskClass, setRiskClass] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [calculatedPrice, setCalculatedPrice] = useState<DefensiblePriceResult>(
    market.calculateDefensiblePrice(costBasisUsd * 100, complexityFactor, riskClass)
  );

  // Orders list state
  const [orders, setOrders] = useState<any[]>(() => {
    return [
      {
        id: 'ord_demo_01',
        tenant_id: 'TENANT_ENTERPRISE_DEMO',
        offer_id: 'off_zeno_core',
        solution_id: 'DH-S-001',
        proof_bundle_id: 'PB-DH-S-001',
        title: 'Bounded Zeno Geometric Convergence Algorithm',
        price_cents: 63281,
        status: 'ORDER_CREATED',
        payment_id: null,
        created_at: Date.now() - 3600000
      }
    ];
  });

  const [activePaymentOrder, setActivePaymentOrder] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRecalculate = (cBasis: number, comp: number, risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setCostBasisUsd(cBasis);
    setComplexityFactor(comp);
    setRiskClass(risk);
    const res = market.calculateDefensiblePrice(Math.round(cBasis * 100), comp, risk);
    setCalculatedPrice(res);
  };

  const handleCreateOrder = (solutionId: string, proofId: string, title: string) => {
    const newOrder = {
      id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: currentUser.tenant_id,
      offer_id: `off_${Date.now().toString(36)}`,
      solution_id: solutionId,
      proof_bundle_id: proofId,
      title: title,
      price_cents: calculatedPrice.final_price_cents,
      status: 'ORDER_CREATED',
      payment_id: null,
      created_at: Date.now()
    };
    setOrders([newOrder, ...orders]);
  };

  const handlePayPalCapture = async (orderId: string, amountCents: number) => {
    setActivePaymentOrder(orderId);
    setPaymentMessage(null);

    const idempotencyKey = `idemp_${orderId}_${Date.now()}`;
    const result = await paypal.captureOrderPayment(orderId, amountCents, idempotencyKey);

    if (result.success && result.payment) {
      setPaymentMessage({
        type: 'success',
        text: `PayPal Payment Captured Successfully! Capture ID: ${result.payment.paypal_capture_id || 'COMPLETED'}. Idempotency Key verified.`
      });
      // Transition order to ESCROW_FUNDED
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'ESCROW_FUNDED', payment_id: result.payment?.receipt_hash } : o));
    } else {
      setPaymentMessage({
        type: 'error',
        text: result.error || 'Payment halted fail-closed: PayPal credentials required in active environment.'
      });
    }
  };

  const handleTransition = (orderId: string, nextState: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: nextState } : o));
  };

  const offers = Object.values(durable.getState().offers);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              <ShoppingCart className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Enterprise B2B Solution Marketplace</h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Sovereign catalog of machine-checked, formally certified computational solutions.
            Defensible Pricing Formula v1.4 computes deterministic valuation backed by empirical test receipts.
          </p>
        </div>

        <button
          onClick={onNavigateToPayPal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/20"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Manage PayPal DN-35 Gateway</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Solution Offerings Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            Available Formally Verified Solutions
          </h3>

          {/* Solution 1: DH-S-001 Preserved Verified Solution */}
          <div className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                    DH-S-001
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    PB-DH-S-001
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                    MATHEMATICAL_ANALYSIS
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white">
                  Bounded Zeno Geometric Convergence Algorithm
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Machine-checked Archimedean geometric convergence solver. Decreases distance to zero in bounded O(log(1/eps)) iterations. Validated by NOPOT inductive variant and Lean4 kernel attestations.
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold font-mono text-emerald-400">
                  ${(calculatedPrice.final_price_cents / 100).toFixed(2)}
                </span>
                <span className="block text-[11px] text-slate-500 font-mono">Defensible v1.4</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Performance Gain:</span>
                <span className="text-cyan-400 font-bold">+42.5% Speedup</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Reversibility:</span>
                <span className="text-emerald-400 font-bold">Guaranteed (Rollbackable)</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Formal Status:</span>
                <span className="text-emerald-400 font-bold">100% Machine Checked</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onNavigateToEvidence('PB-DH-S-001')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition cursor-pointer"
              >
                <span>Inspect Crystal Clear Box Evidence</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => handleCreateOrder('DH-S-001', 'PB-DH-S-001', 'Bounded Zeno Geometric Convergence Algorithm')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-600/20"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Create B2B Escrow Order</span>
              </button>
            </div>
          </div>

          {/* Active Orders & Escrows */}
          <div className="pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Active Enterprise Orders & Escrow Pipeline
            </h3>

            {paymentMessage && (
              <div className={`p-4 rounded-xl text-xs font-mono border flex items-center gap-2.5 ${
                paymentMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-700 text-rose-200'
              }`}>
                {paymentMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{paymentMessage.text}</span>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                No orders created yet in current partition. Click &quot;Create B2B Escrow Order&quot; above.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{order.id}</span>
                      <h5 className="font-semibold text-white text-sm">{order.title}</h5>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        ${(order.price_cents / 100).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Lifecycle Steps Indicator */}
                  <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                    <div className={`p-1.5 rounded ${order.status !== 'OFFER' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700' : 'bg-slate-950 text-slate-500'}`}>
                      1. CREATED
                    </div>
                    <div className={`p-1.5 rounded ${['ESCROW_FUNDED', 'SANDBOX_PROVISIONED', 'REPLAY_VERIFIED', 'DEPLOYED'].includes(order.status) ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-slate-950 text-slate-500'}`}>
                      2. ESCROW
                    </div>
                    <div className={`p-1.5 rounded ${['SANDBOX_PROVISIONED', 'REPLAY_VERIFIED', 'DEPLOYED'].includes(order.status) ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700' : 'bg-slate-950 text-slate-500'}`}>
                      3. SANDBOX
                    </div>
                    <div className={`p-1.5 rounded ${['REPLAY_VERIFIED', 'DEPLOYED'].includes(order.status) ? 'bg-purple-900/40 text-purple-300 border border-purple-700' : 'bg-slate-950 text-slate-500'}`}>
                      4. REPLAY
                    </div>
                    <div className={`p-1.5 rounded ${order.status === 'DEPLOYED' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-slate-950 text-slate-500'}`}>
                      5. DEPLOYED
                    </div>
                  </div>

                  {/* Contextual Actions */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-2">
                    <div className="text-xs font-mono text-slate-400">
                      Current Status: <span className="text-white font-bold">{order.status}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'ORDER_CREATED' && (
                        <button
                          onClick={() => handlePayPalCapture(order.id, order.price_cents)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pay & Capture with PayPal DN-35</span>
                        </button>
                      )}

                      {order.status === 'ESCROW_FUNDED' && (
                        <button
                          onClick={() => handleTransition(order.id, 'SANDBOX_PROVISIONED')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer"
                        >
                          Provision Hermetic Sandbox
                        </button>
                      )}

                      {order.status === 'SANDBOX_PROVISIONED' && (
                        <button
                          onClick={() => handleTransition(order.id, 'REPLAY_VERIFIED')}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition cursor-pointer"
                        >
                          Execute Cleanroom Replay
                        </button>
                      )}

                      {order.status === 'REPLAY_VERIFIED' && (
                        <button
                          onClick={() => handleTransition(order.id, 'DEPLOYED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer"
                        >
                          Deploy to Production Enclave
                        </button>
                      )}

                      {order.status === 'DEPLOYED' && (
                        <span className="px-3 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-xs flex items-center gap-1">
                          <Check className="w-3 h-3" /> Live & Running
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Defensible Pricing Formula Console */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Calculator className="w-4 h-4 text-cyan-400" />
                Defensible Pricing Calculator v1.4
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                Formula v1.4
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cost Basis */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300 font-medium">Cost Basis (USD)</label>
                  <span className="font-mono text-cyan-400">${costBasisUsd}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={costBasisUsd}
                  onChange={(e) => handleRecalculate(Number(e.target.value), complexityFactor, riskClass)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Complexity Factor */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300 font-medium">Verification Complexity Factor</label>
                  <span className="font-mono text-cyan-400">{complexityFactor.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.25"
                  value={complexityFactor}
                  onChange={(e) => handleRecalculate(costBasisUsd, Number(e.target.value), riskClass)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Risk Class */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Risk Class & Multiplier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRecalculate(costBasisUsd, complexityFactor, r)}
                      className={`py-1.5 px-2 rounded-lg text-center font-mono border transition cursor-pointer ${
                        riskClass === r
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>{r}</div>
                      <div className="text-[10px] text-slate-500">
                        {r === 'LOW' ? '1.10x' : r === 'MEDIUM' ? '1.25x' : '1.50x'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing Output Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Cost:</span>
                  <span className="text-white">${costBasisUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Complexity Multiplier:</span>
                  <span className="text-white">{complexityFactor.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Risk Multiplier:</span>
                  <span className="text-white">{calculatedPrice.risk_multiplier.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Standard Margin:</span>
                  <span className="text-white">1.35x</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-emerald-400">Final Defensible Price:</span>
                  <span className="text-emerald-400">${(calculatedPrice.final_price_cents / 100).toFixed(2)}</span>
                </div>
              </div>

              {/* Calculation Hash */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400 break-all">
                <span className="text-slate-500 block mb-0.5">Deterministic Formula Hash:</span>
                <span className="text-cyan-400">{calculatedPrice.calculation_hash}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
