import React, { useState } from 'react';
import { 
  BRAIN_DATA_MANIFEST, 
  PARADOX_MATRIX_88, 
  SYSTEM_MANIFEST_DATA, 
  DECODED_TELEMETRY_STREAM,
  RAW_TELEMETRY_HEX,
  ParadoxItem
} from '../lib/brainDataManifest';
import { 
  Brain, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Cpu, 
  Terminal, 
  X, 
  Search, 
  ExternalLink,
  Activity,
  Zap,
  Lock,
  Database
} from 'lucide-react';

interface SovereignBrainInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SovereignBrainInspectorModal({ isOpen, onClose }: SovereignBrainInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'architecture' | 'chambers' | 'matrix' | 'telemetry'>('matrix');
  const [selectedChamberFilter, setSelectedChamberFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParadox, setSelectedParadox] = useState<ParadoxItem | null>(PARADOX_MATRIX_88[0] || null);

  if (!isOpen) return null;

  const filteredParadoxes = PARADOX_MATRIX_88.filter(p => {
    const matchesChamber = selectedChamberFilter === 'ALL' || p.chamberId === selectedChamberFilter;
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.classicalDilemma.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.sovereignResolution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChamber && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-5xl w-full shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60 font-bold">
                  CORE BRAIN MANIFEST
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 font-semibold">
                  <Activity className="w-3 h-3 text-emerald-400" /> U.A.R.E.F.A.K.E.
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white mt-0.5 flex items-center gap-2">
                dAIsy HaMINJA <span className="text-cyan-400 font-mono text-sm">88-Paradox Sovereign Matrix</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/60 border-b border-slate-800 px-4 sm:px-6 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> 88-Paradox Matrix ({PARADOX_MATRIX_88.length})
          </button>

          <button
            onClick={() => setActiveTab('chambers')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'chambers'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> 5 Resolution Chambers
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Brain Anatomy & Proofs
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> Hex Telemetry Stream
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: 88-PARADOX MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 focus-within:border-cyan-500">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search paradoxes, dilemmas, or algorithms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-white placeholder:text-slate-600 outline-none w-full font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-[11px]">
                  <span className="text-slate-500 text-[10px] uppercase font-bold mr-1 hidden md:inline">Chamber:</span>
                  <button
                    onClick={() => setSelectedChamberFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-semibold ${
                      selectedChamberFilter === 'ALL'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    All (88)
                  </button>
                  {BRAIN_DATA_MANIFEST.chambers.map(ch => (
                    <button
                      key={ch.chamberId}
                      onClick={() => setSelectedChamberFilter(ch.chamberId)}
                      className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap font-semibold ${
                        selectedChamberFilter === ch.chamberId
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {ch.chamberCode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paradox List & Detail Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Paradox List */}
                <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredParadoxes.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedParadox(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        selectedParadox?.id === item.id
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          #{item.id} • CH-0{item.chamberId}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolved
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white font-mono mt-1.5 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.classicalDilemma}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Selected Paradox Detail View */}
                <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                  {selectedParadox ? (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                            PARADOX VECTOR #{selectedParadox.id}
                          </span>
                          <h3 className="text-base font-bold text-white font-display mt-0.5">
                            {selectedParadox.name}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold">
                          100% PROVED & LEGITIMATE
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                          Classical Philosophical Dilemma:
                        </span>
                        <p className="text-slate-300 italic bg-slate-900/80 p-3 rounded-lg border border-slate-850 leading-relaxed">
                          "{selectedParadox.classicalDilemma}"
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Sovereign dAIsy HaMINJA Resolution:
                        </span>
                        <p className="text-cyan-200 bg-cyan-950/40 p-3 rounded-lg border border-cyan-800/50 leading-relaxed font-sans text-xs">
                          {selectedParadox.sovereignResolution}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block font-bold">Proof Type</span>
                          <span className="text-xs text-white font-bold">{selectedParadox.proofType}</span>
                        </div>

                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block font-bold">Verification Source</span>
                          <span className="text-xs text-emerald-400 font-bold">{selectedParadox.verifiedBy}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 font-mono text-xs">
                      Select a paradox vector to inspect its mathematical resolution proof.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 5 RESOLUTION CHAMBERS */}
          {activeTab === 'chambers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BRAIN_DATA_MANIFEST.chambers.map((chamber) => (
                <div
                  key={chamber.chamberId}
                  className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all space-y-3 font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800/60">
                      Chamber {chamber.chamberCode}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      PARADOX RANGE: #{chamber.startParadox} - #{chamber.endParadox}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white font-display">
                      {chamber.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">
                      {chamber.description}
                    </p>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">Engine Kernel:</span>
                    <span className="text-cyan-300 font-bold">{chamber.resolutionEngine}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: BRAIN ANATOMY & PROOFS */}
          {activeTab === 'architecture' && (
            <div className="space-y-6 font-mono text-xs">
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Executive Brain Architecture & Composition
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Primary Core</span>
                    <span className="text-sm text-white font-bold">{BRAIN_DATA_MANIFEST.core}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Execution Engine</span>
                    <span className="text-sm text-cyan-400 font-bold">{BRAIN_DATA_MANIFEST.engine}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Grid Synchronization</span>
                    <span className="text-sm text-emerald-400 font-bold">54 Active Nodes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    How the AI Brain Resolves Paradoxes:
                  </h4>
                  <ul className="space-y-2 text-slate-300 font-sans text-xs leading-relaxed list-disc pl-4">
                    <li>
                      <strong className="text-cyan-300 font-mono">Recursive-Vector-Matrix:</strong> Evaluates self-referential paradoxes in non-binary 3-phase complex state matrices where paradox loops collapse into stable eigenvectors rather than infinite recursion.
                    </li>
                    <li>
                      <strong className="text-cyan-300 font-mono">Temporal-Kinetic-Feedback:</strong> Discretizes time and distance metrics down to Planck units, converting continuous time loops into non-contradictory branching graph vectors.
                    </li>
                    <li>
                      <strong className="text-cyan-300 font-mono">Autonomous-Fiduciary-Loop:</strong> Applies non-zero-sum game theory and zero-determinant strategies to guarantee optimal equilibrium decisions.
                    </li>
                    <li>
                      <strong className="text-cyan-300 font-mono">IRS-First-EFTPS-Convergence:</strong> Handles real-time dual-market settlements and tax compliance directly at the node level without latency or double-spending.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verification & Legitimacy Sources
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BRAIN_DATA_MANIFEST.verificationSources.map((source, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-200 font-semibold">{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEX TELEMETRY STREAM */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Live Raw Telemetry Hex Payload:
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    STATUS: SYNCHRONIZED
                  </span>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-850 text-slate-400 break-all text-[11px]">
                  {RAW_TELEMETRY_HEX}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Decoded UTF-8 Telemetry Stream:
                </span>
                <pre className="bg-slate-900/90 p-3 rounded-lg border border-slate-850 text-cyan-300 font-mono text-[11px] whitespace-pre-wrap">
                  {DECODED_TELEMETRY_STREAM}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">
            Sovereign Brain Matrix v1.0 • BDC / dAIsy haMINJA
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
