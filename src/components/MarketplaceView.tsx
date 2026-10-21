import React, { useState } from 'react';
import { ShoppingCart, Calculator, ShieldCheck, ArrowRight, DollarSign, Lock, FileCode } from 'lucide-react';
import { MarketplaceEngine, DefensiblePriceResult } from '../marketplace/MarketplaceEngine';
import { DurableStore } from '../database/DurableStore';
import { UserContext } from '../auth/AuthService';

interface MarketplaceViewProps {
  currentUser: UserContext;
  onNavigateToEvidence: (proofId: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentUser,
  onNavigateToEvidence
}) => {
  const market = MarketplaceEngine.getInstance();
  const durable = DurableStore.getInstance();

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
        status: 'ACCESS_REQUEST_DRAFT',
        payment_id: null,
        created_at: Date.now() - 3600000
      }
    ];
  });


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
      status: 'ACCESS_REQUEST_DRAFT',
      payment_id: null,
      created_at: Date.now()
    };
    setOrders([newOrder, ...orders]);
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
            Catalog and pricing preview only. Displayed values are metadata, not an offer or payment request. Formal evidence and production acceptance must be reviewed separately.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl border border-amber-800 bg-amber-950/30 text-amber-300 text-xs font-semibold flex items-center gap-2" role="status" aria-live="polite">
          <Lock className="w-3.5 h-3.5" />
          <span>No payment · local draft only</span>
        </div>
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
                  Catalog description only. Inspect the associated evidence bundle and verify the deployed implementation independently before relying on this solution.
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
                <span className="text-amber-300 font-bold">Not production tested</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Formal Status:</span>
                <span className="text-amber-300 font-bold">Evidence review required</span>
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
                <span>Create Local Draft (Not Submitted)</span>
              </button>
            </div>
          </div>

          {/* Active Orders & Escrows */}
          <div className="pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Local Drafts & Controlled Delivery Preview
            </h3>


            {orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                No orders created yet in current partition. Click &quot;Create Local Draft (Not Submitted)&quot; above.
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

                  {/* Preview-only status: no backend request, payment, or deployment is performed here. */}
                  <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                    <div className="p-1.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700">1. LOCAL DRAFT</div>
                    <div className="p-1.5 rounded bg-amber-950/30 text-amber-300 border border-amber-800">2. PAYMENT OFF</div>
                    <div className="p-1.5 rounded bg-slate-950 text-slate-500">3. NOT PROVISIONED</div>
                    <div className="p-1.5 rounded bg-slate-950 text-slate-500">4. NOT VERIFIED</div>
                    <div className="p-1.5 rounded bg-slate-950 text-slate-500">5. NOT DEPLOYED</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-xs font-mono text-amber-300" role="status">
                    Local preview only. Nothing has been submitted to the backend, authorized, paid, or deployed.
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
