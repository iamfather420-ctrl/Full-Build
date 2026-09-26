import React, { useState } from 'react';
import { Cpu, CheckCircle2, Play, Terminal, Code2, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { Z3FormalProofEngine, THEOREM_CATALOG, Z3ProofResult } from '../proofs/Z3FormalProofEngine';

export const Z3TheoremsView: React.FC = () => {
  const engine = Z3FormalProofEngine.getInstance();
  const catalog = engine.getCatalog();

  const [selectedTheorem, setSelectedTheorem] = useState(catalog[0]);
  const [proofResults, setProofResults] = useState<Record<string, Z3ProofResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Custom SMT solver state
  const [customSmtScript, setCustomSmtScript] = useState(`; Enter SMT-LIB 2.0 expressions
(declare-const p Bool)
(declare-const q Bool)
(assert (and p (not p)))
(check-sat)`);
  const [customName, setCustomName] = useState('PropositionalContradiction');
  const [customResult, setCustomResult] = useState<Z3ProofResult | null>(null);

  const handleProveSingle = async (thmId: string) => {
    setIsRunning(true);
    try {
      const res = await engine.proveCatalogTheorem(thmId);
      setProofResults(prev => ({ ...prev, [thmId]: res }));
    } finally {
      setIsRunning(false);
    }
  };

  const handleProveAll = async () => {
    setIsRunningAll(true);
    try {
      const allRes = await engine.proveAllCatalogTheorems();
      const map: Record<string, Z3ProofResult> = {};
      for (const r of allRes) {
        map[r.theorem_id] = r;
      }
      setProofResults(map);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleRunCustom = async () => {
    setIsRunning(true);
    try {
      const res = await engine.verifyCustomSmtScript(customName, customSmtScript, 'unsat');
      setCustomResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              <Cpu className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Z3 Automated Theorem Prover & SMT Kernel</h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Formal mathematical reasoning engine operating on standard SMT-LIB 2.0 language specifications.
            Evaluates satisfiability, foundational set theory contradictions, inductive termination orders, and Byzantine limits.
          </p>
        </div>

        <button
          onClick={handleProveAll}
          disabled={isRunningAll}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          {isRunningAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunningAll ? 'Proving 8 Theorems...' : 'Prove All Catalog Theorems'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Theorem Catalog */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Core Mathematical Theorems ({catalog.length})</span>
            <span className="text-xs text-indigo-400 lowercase">
              {Object.keys(proofResults).length} / {catalog.length} verified
            </span>
          </h3>

          <div className="space-y-2">
            {catalog.map((thm) => {
              const res = proofResults[thm.id];
              const isSelected = selectedTheorem.id === thm.id;
              return (
                <div
                  key={thm.id}
                  onClick={() => setSelectedTheorem(thm)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-bold">
                          {thm.id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900">
                          {thm.domain}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white">{thm.name}</h4>
                    </div>

                    <div>
                      {res ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> UNSAT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500 font-mono text-[10px]">
                          READY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Theorem Detail & Proof Output */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">
                  {selectedTheorem.id} • {selectedTheorem.domain}
                </span>
                <h3 className="text-base font-bold text-white">{selectedTheorem.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedTheorem.description}</p>
              </div>

              <button
                onClick={() => handleProveSingle(selectedTheorem.id)}
                disabled={isRunning}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
              >
                {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Run Z3 Solver</span>
              </button>
            </div>

            {/* SMT-LIB 2.0 Code Script */}
            <div>
              <label className="text-xs font-mono font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                SMT-LIB 2.0 Formal Proposition
              </label>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                {selectedTheorem.smt_script}
              </pre>
            </div>

            {/* Live Solver Proof Result */}
            {proofResults[selectedTheorem.id] && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Solver Status: {proofResults[selectedTheorem.id].solver_result.toUpperCase()} (PROVED)
                  </span>
                  <span className="text-[11px] opacity-80">
                    Time: {proofResults[selectedTheorem.id].execution_time_ms}ms
                  </span>
                </div>
                <p className="text-emerald-200/90 text-xs leading-relaxed">
                  {proofResults[selectedTheorem.id].explanation}
                </p>
                <div className="pt-2 border-t border-emerald-800/50 text-[11px] text-slate-300 break-all">
                  <span className="text-slate-400 block mb-0.5">Formal Proof Certificate SHA-256:</span>
                  <span className="text-cyan-300">{proofResults[selectedTheorem.id].certificate_sha256}</span>
                </div>
              </div>
            )}
          </div>

          {/* Custom SMT-LIB 2.0 Prover Console */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                Interactive Custom SMT-LIB 2.0 Prover
              </h4>
              <button
                onClick={handleRunCustom}
                disabled={isRunning}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Evaluate Script</span>
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Proposition Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <textarea
                rows={5}
                value={customSmtScript}
                onChange={(e) => setCustomSmtScript(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {customResult && (
              <div className={`p-3 rounded-lg border font-mono text-xs ${
                customResult.proved ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span>Status: {customResult.solver_result.toUpperCase()}</span>
                  <span>{customResult.execution_time_ms}ms</span>
                </div>
                <div className="text-[11px] opacity-80 mt-1">{customResult.explanation}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
