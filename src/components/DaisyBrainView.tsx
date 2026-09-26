import React, { useState } from 'react';
import { Cpu, Flame, CheckCircle2, Shield, Network, Zap, Coins, ArrowRight } from 'lucide-react';
import { DaisyBrain, CompleteBrainState } from '../brain/DaisyBrain';
import { NodeRegistry, NodeEntity } from '../nodes/NodeRegistry';
import { vaultService, AGATELedgerTransaction } from '../services/vaultService';

export const DaisyBrainView: React.FC = () => {
  const brain = DaisyBrain.getInstance();
  const nodeReg = NodeRegistry.getInstance();
  const [brainState, setBrainState] = useState<CompleteBrainState>(brain.getLiveBrainState());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // AGATE waste burn console state
  const [wasteKg, setWasteKg] = useState<number>(500);
  const [harvesterAddress, setHarvesterAddress] = useState<string>('0x7A4b...C891');
  const [burnReceipt, setBurnReceipt] = useState<AGATELedgerTransaction | null>(null);

  const nodes = nodeReg.getAllNodes();
  const categories = ['ALL', 'CORE_KERNEL', 'LOGIC_SOLVER', 'PERSISTENCE', 'SECURITY', 'MARKETPLACE', 'PAYMENTS', 'SETTLEMENT', 'AUDIT'];

  const filteredNodes = nodes.filter(n => selectedCategory === 'ALL' || n.category === selectedCategory);

  const handleRecordWasteBurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (wasteKg <= 0) return;
    const tx = vaultService.recordWasteBurn(wasteKg, harvesterAddress);
    setBurnReceipt(tx);
    setBrainState(brain.getLiveBrainState());
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
              <Cpu className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              dAIsy haMINJA Autonomous Brain & 54-Node Sovereign Mesh
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Neural-symbolic automated problem solver paired with an invariant-verified 54-node mesh topology.
            Integrates the 4 Truth Pillars, waste-backed economic minting, and Microsoft Z3 automated theorem proving.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-white">STATUS: {brainState.claim_scope || brainState.status}</span>
        </div>
      </div>

      {/* 4 Truth Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            Pillar 1: Identity
          </div>
          <h4 className="text-sm font-semibold text-white">Identity as a Fundamental Right</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {brainState.truth_pillars.pillar_1_identity}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            Pillar 2: Privacy
          </div>
          <h4 className="text-sm font-semibold text-white">Privacy as Default</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {brainState.truth_pillars.pillar_2_privacy}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            Pillar 3: Health
          </div>
          <h4 className="text-sm font-semibold text-white">Financial Health as Mandate</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {brainState.truth_pillars.pillar_3_financial_health}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            Pillar 4: Guardianship
          </div>
          <h4 className="text-sm font-semibold text-white">Human Guardianship</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {brainState.truth_pillars.pillar_4_guardianship}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 54-Node Sovereign Mesh */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                54-Node Sovereign Mesh Topology
              </h3>
              <p className="text-xs text-slate-400">
                52 Code Executed Nodes • 2 External Adapters (PayPal DN-35, Neon DN-34)
              </p>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredNodes.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">{n.id}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    n.execution_mode === 'EXTERNAL_PROVIDER_REQUIRED'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                      : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                  }`}>
                    {n.execution_mode === 'EXTERNAL_PROVIDER_REQUIRED' ? 'EXT_PROVIDER' : 'CODE_EXECUTED'}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white">{n.name}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-1">{n.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AGATE Waste-Burn Minting Console */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-amber-400" />
                Waste-Backed Minting Console
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">
                0.15 AGATE / kg
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total AGATE Minted:</span>
                <span className="text-cyan-400 font-bold">
                  {brainState.consensus_telemetry.total_minted_supply_agate.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Certified Waste Destroyed:</span>
                <span className="text-emerald-400 font-bold">
                  {brainState.consensus_telemetry.total_burned_waste_kg.toLocaleString()} kg
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Active Network Harvesters:</span>
                <span className="text-white">
                  {brainState.consensus_telemetry.active_harvesters}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordWasteBurn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Certified Physical Waste (kg)
                </label>
                <input
                  type="number"
                  value={wasteKg}
                  onChange={(e) => setWasteKg(Number(e.target.value))}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Harvester Enclave Address
                </label>
                <input
                  type="text"
                  value={harvesterAddress}
                  onChange={(e) => setHarvesterAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 text-[11px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Certify Waste Burn & Mint AGATE</span>
              </button>
            </form>

            {burnReceipt && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700 text-xs font-mono space-y-1 text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Mint Transaction Confirmed
                </div>
                <div>ID: {burnReceipt.id}</div>
                <div>Minted: +{burnReceipt.amount_agate} AGATE</div>
                <div className="text-[10px] text-slate-400 break-all">Leaf Hash: {burnReceipt.merkle_leaf_hash}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function Lock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
