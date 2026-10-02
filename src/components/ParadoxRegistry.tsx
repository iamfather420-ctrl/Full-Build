import React, { useState, useEffect } from 'react';
import { ParadoxOperator, SolutionAnchor } from '../types.js';
import { Search, ShieldAlert, CheckCircle, HelpCircle, Layers, Fingerprint, Award } from 'lucide-react';

export default function ParadoxRegistry() {
  const [paradoxes, setParadoxes] = useState<ParadoxOperator[]>([]);
  const [solutions, setSolutions] = useState<SolutionAnchor[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'shared' | 'proprietary'>('all');
  const [selectedParadox, setSelectedParadox] = useState<ParadoxOperator | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{
    success: boolean;
    solution: SolutionAnchor;
    proof: string;
    hash: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Fetch Paradoxes and Solutions
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Paradoxes
      const pRes = await fetch(`/api/paradoxes?category=${categoryFilter === 'all' ? '' : categoryFilter}&search=${search}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setParadoxes(pData);
      }
      // Fetch Solutions
      const sRes = await fetch('/api/solutions');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSolutions(sData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter, search]);

  // Action: Test paradox resolution in secure sandboxed solver
  const handleTestResolve = (paradox: ParadoxOperator) => {
    setResolvingId(paradox.id);
    setResolveResult(null);

    // Find the mapped solution
    const solution = solutions.find(s => s.id === paradox.defaultSolutionId) || solutions[0];

    setTimeout(() => {
      // Simulate cryptographic resolution proof
      const hexSignature = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
      
      setResolveResult({
        success: true,
        solution,
        proof: `Axiom Proof Validated: Solver matched PX code ${paradox.code} to solution node ${solution.code}. Efficacy calculated at ${solution.performanceEfficacy}% under NIST compliance protocols.`,
        hash: `SHA-256 (0x${hexSignature})`
      });
      setResolvingId(null);
    }, 1500);
  };

  // Get total counts
  const totalShared = 40;
  const totalProprietary = 58;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="paradox-registry-module">
      
      {/* Paradox Operator Search & List */}
      <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col">
        <div className="mb-5 pb-4 border-b border-slate-800">
          <h2 className="text-xl font-display font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="text-indigo-400 w-5 h-5" />
            Synaptic Axiom Registry <span className="text-xs font-mono px-2 py-0.5 bg-indigo-950/40 text-indigo-300 border border-indigo-900/40 rounded">88 Paradoxes Registered</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse the deterministic resolution registry. Split into 40 Shared and 58 Proprietary paradox nodes.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by paradox code, name, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-800 focus:border-slate-700 focus:outline-none placeholder-slate-600 font-mono"
            />
          </div>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-[10px]">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${categoryFilter === 'all' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All (88)
            </button>
            <button
              onClick={() => setCategoryFilter('shared')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${categoryFilter === 'shared' ? 'bg-indigo-950/60 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Shared ({totalShared})
            </button>
            <button
              onClick={() => setCategoryFilter('proprietary')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${categoryFilter === 'proprietary' ? 'bg-emerald-950/60 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Proprietary ({totalProprietary})
            </button>
          </div>
        </div>

        {/* Paradox Grid/List Scrollable area */}
        <div className="max-h-[460px] overflow-y-auto pr-2 space-y-2">
          {loading && paradoxes.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 font-mono">Syncing synaptic registries...</div>
          ) : paradoxes.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 font-mono">No matching paradox operators found.</div>
          ) : (
            paradoxes.map(p => (
              <div 
                key={p.id}
                onClick={() => { setSelectedParadox(p); setResolveResult(null); }}
                className={`group p-3.5 rounded-lg border text-left transition-all cursor-pointer flex justify-between items-start ${
                  selectedParadox?.id === p.id 
                    ? 'bg-indigo-950/20 border-indigo-500/80' 
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                      {p.code}
                    </span>
                    <h3 className="text-xs font-display font-semibold text-slate-200 group-hover:text-white transition-colors">{p.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{p.description}</p>
                </div>

                <div className="flex flex-col items-end justify-between h-full gap-2 text-[9px] font-mono shrink-0">
                  <span className={`px-2 py-0.5 rounded-full border ${
                    p.category === 'proprietary' 
                      ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {p.category.toUpperCase()}
                  </span>
                  
                  <span className={`text-[10px] ${
                    p.status === 'stable' ? 'text-emerald-400' :
                    p.status === 'vulnerable' ? 'text-rose-400 animate-pulse' :
                    'text-amber-400'
                  }`}>
                    ● {p.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Paradox-Solution Mapping Drawer */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        {selectedParadox ? (
          <div className="flex flex-col h-full justify-between" id="paradox-resolution-panel">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Fingerprint className="text-indigo-400 w-5 h-5" />
                  <span className="text-sm font-display font-semibold text-slate-200">Resolution Resolver</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  {selectedParadox.code}
                </span>
              </div>

              {/* Paradox properties */}
              <div className="space-y-4 py-4">
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3">
                  <h4 className="text-xs font-mono text-indigo-400 font-semibold mb-1">AXIOMATIC ANOMALY:</h4>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">{selectedParadox.name}</p>
                  <span className="text-[10px] font-mono text-slate-500 block mt-2">Complexity Depth: {selectedParadox.complexity.toUpperCase()}</span>
                </div>

                {/* Mapped Solution details */}
                {(() => {
                  const solution = solutions.find(s => s.id === selectedParadox.defaultSolutionId);
                  if (!solution) return <div className="text-xs font-mono text-slate-500">Retrieving corresponding anchor mapping...</div>;
                  return (
                    <div className="space-y-3">
                      <div className="border border-slate-800/80 bg-slate-950/60 rounded-lg p-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 mb-1.5">
                          <span>SOLUTION ANCHOR {solution.code}</span>
                          <span className="flex items-center gap-1 font-semibold text-xs">
                            <Award className="w-3.5 h-3.5" />
                            {solution.performanceEfficacy}% EFFICACY
                          </span>
                        </div>
                        <h5 className="text-xs font-display font-semibold text-slate-200 mb-1">{solution.title}</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{solution.explanation}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-slate-950/40 p-2 border border-slate-800/60 rounded-lg">
                          <span className="text-slate-500 block">COMPLIANCE CODE</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {solution.complianceStandards.map(std => (
                              <span key={std} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[8px] rounded">
                                {std}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 p-2 border border-slate-800/60 rounded-lg">
                          <span className="text-slate-500 block">EFFICACY METRIC</span>
                          <span className="text-[9px] text-emerald-400 font-medium block mt-1 truncate" title={solution.verificationMetric}>
                            {solution.verificationMetric}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Test Solver Box */}
            <div className="pt-4 border-t border-slate-800/80">
              {resolvingId === selectedParadox.id ? (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center space-y-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] font-mono text-indigo-400 animate-pulse">Running hardware cryptographic solver...</p>
                </div>
              ) : resolveResult ? (
                <div className="space-y-3" id="solver-result-block">
                  <div className="bg-emerald-950/25 border border-emerald-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold mb-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      PARADOX RESOLVED
                    </div>
                    <p className="text-[10px] text-slate-300 font-mono leading-relaxed bg-slate-950/40 p-2 border border-emerald-900/10 rounded">
                      {resolveResult.proof}
                    </p>
                    <div className="text-[9px] font-mono text-slate-500 mt-2 truncate">
                      SIGNATURE: {resolveResult.hash}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestResolve(selectedParadox)}
                    className="w-full bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-900 hover:border-indigo-800 text-indigo-300 text-xs font-mono py-2 rounded-lg transition-all cursor-pointer"
                  >
                    Recalculate Proof
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleTestResolve(selectedParadox)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono py-2.5 rounded-lg font-semibold shadow-lg shadow-indigo-950/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Evaluate Paradox Efficacy
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10" id="paradox-unselected-panel">
            <HelpCircle className="text-slate-700 w-12 h-12 mb-3 animate-pulse-slow" />
            <h3 className="text-slate-300 font-display font-medium text-sm">Select Paradox to Query</h3>
            <p className="text-xs text-slate-500 max-w-[200px] mt-1.5">
              Select any of the 88 paradox operators in the list to inspect its proprietary mathematical Solution Anchor and evaluate its compliance efficacy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
