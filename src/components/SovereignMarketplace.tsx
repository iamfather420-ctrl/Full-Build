import React, { useState, useEffect } from 'react';
import { MarketplaceTemplate, SolutionAnchor } from '../types.js';
import { ShieldCheck, Layers, ArrowRight, Award, Lock, CheckCircle2, ShoppingBag, Terminal, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface SovereignMarketplaceProps {
  onSelectTemplate: (templateId: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function SovereignMarketplace({ onSelectTemplate, setActiveTab }: SovereignMarketplaceProps) {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [solutions, setSolutions] = useState<SolutionAnchor[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMarket, setActiveMarket] = useState<'solutions' | 'templates'>('solutions');
  const [selectedSolution, setSelectedSolution] = useState<SolutionAnchor | null>(null);

  // Search, Filter and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [solPage, setSolPage] = useState(1);
  const [tplPage, setTplPage] = useState(1);
  const itemsPerPage = 6; // 6 solutions fits 3x2 grid perfectly, 8 templates fits 4x2 grid perfectly!

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Solutions
      const sRes = await fetch('/api/solutions');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSolutions(sData); // Load all 105 Solutions
      }
      // Fetch Templates
      const tRes = await fetch('/api/templates');
      if (tRes.ok) {
        const tData = await tRes.json();
        setTemplates(tData); // Load all 105 Templates
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination on market/search/filter change
  useEffect(() => {
    setSolPage(1);
    setTplPage(1);
  }, [activeMarket, searchQuery, tierFilter]);

  const handleAcquireTemplate = (id: string) => {
    onSelectTemplate(id);
    setActiveTab('unifier'); // Move to unifier configuration tab
  };

  // Filter Solutions
  const filteredSolutions = solutions.filter(sol => {
    const query = searchQuery.toLowerCase();
    return (
      sol.title.toLowerCase().includes(query) ||
      sol.explanation.toLowerCase().includes(query) ||
      sol.code.toLowerCase().includes(query) ||
      sol.complianceStandards.some(std => std.toLowerCase().includes(query))
    );
  });

  // Filter Templates
  const filteredTemplates = templates.filter(tpl => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = (
      tpl.name.toLowerCase().includes(query) ||
      tpl.description.toLowerCase().includes(query) ||
      tpl.capabilities.some(cap => cap.toLowerCase().includes(query))
    );
    const matchesTier = tierFilter === 'all' || tpl.tier === tierFilter;
    return matchesQuery && matchesTier;
  });

  // Paginated Slices
  const totalSolPages = Math.ceil(filteredSolutions.length / itemsPerPage) || 1;
  const paginatedSolutions = filteredSolutions.slice((solPage - 1) * itemsPerPage, solPage * itemsPerPage);

  const totalTplPages = Math.ceil(filteredTemplates.length / 8) || 1; // 8 templates per page
  const paginatedTemplates = filteredTemplates.slice((tplPage - 1) * 8, tplPage * 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in" id="marketplace-module">
      {/* Marketplace Selector Banner */}
      <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="text-indigo-400 w-5 h-5" />
            Sovereign Dual-Market Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access enterprise-grade resolution artifacts (Marketplace 1) and pre-certified white-labeled business templates (Marketplace 2).
          </p>
        </div>

        {/* Dual toggle selectors */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-[11px] w-full md:w-auto">
          <button
            onClick={() => setActiveMarket('solutions')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeMarket === 'solutions' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Marketplace 1: Solutions
          </button>
          <button
            onClick={() => setActiveMarket('templates')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeMarket === 'templates' ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            Marketplace 2: JIT Templates
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="lg:col-span-4 bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={activeMarket === 'solutions' ? "Search 105 Solutions (e.g., SL-42, Entropy, NIST)..." : "Search 105 JIT Business Templates (e.g., Outreach, Sales, Negotiator)..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 font-mono transition-colors"
          />
        </div>
        {activeMarket === 'templates' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> TIER:
            </span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-xs text-slate-400 font-mono focus:outline-none focus:border-emerald-500/40 cursor-pointer w-full sm:w-auto"
            >
              <option value="all">ALL TIERS</option>
              <option value="Standard">STANDARD</option>
              <option value="Enterprise">ENTERPRISE</option>
              <option value="Sovereign">SOVEREIGN</option>
            </select>
          </div>
        )}
        <div className="text-[10px] font-mono text-slate-500 shrink-0 self-center sm:self-auto">
          {activeMarket === 'solutions' ? (
            <span>FOUND: <b className="text-indigo-400">{filteredSolutions.length}</b> / 105 SOLUTIONS</span>
          ) : (
            <span>FOUND: <b className="text-emerald-400">{filteredTemplates.length}</b> / 105 TEMPLATES</span>
          )}
        </div>
      </div>

      {/* Primary Market content mapping */}
      {activeMarket === 'solutions' ? (
        <>
          {/* Solutions list */}
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-2 text-center py-20 font-mono text-xs text-indigo-400 animate-pulse">
                  Decrypting Sovereign Registry...
                </div>
              ) : paginatedSolutions.map(sol => (
                <div 
                  key={sol.id}
                  onClick={() => setSelectedSolution(sol)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-[180px] ${
                    selectedSolution?.id === sol.id 
                      ? 'bg-indigo-950/25 border-indigo-500 shadow-lg' 
                      : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-950/80'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-indigo-400 font-bold mb-1.5">
                      <span>ARTEFACT {sol.code}</span>
                      <span className="flex items-center gap-1 font-semibold text-[10px]">
                        <Award className="w-3.5 h-3.5 text-indigo-400" />
                        {sol.performanceEfficacy}% EFFICACY
                      </span>
                    </div>
                    <h3 className="text-sm font-display font-semibold text-slate-200 group-hover:text-white transition-colors line-clamp-1">{sol.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3 mt-1.5">{sol.explanation}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {sol.complianceStandards.map(std => (
                      <span key={std} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-mono rounded">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && paginatedSolutions.length === 0 && (
                <div className="col-span-2 text-center py-20 font-mono text-xs text-slate-500">
                  No solutions match the active search query.
                </div>
              )}
            </div>

            {/* Pagination controls for solutions */}
            {totalSolPages > 1 && (
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-xl p-3 font-mono text-xs text-slate-400">
                <button
                  onClick={() => setSolPage(p => Math.max(1, p - 1))}
                  disabled={solPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> PREV
                </button>
                <span>PAGE {solPage} OF {totalSolPages}</span>
                <button
                  onClick={() => setSolPage(p => Math.min(totalSolPages, p + 1))}
                  disabled={solPage === totalSolPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 flex items-center gap-1 cursor-pointer"
                >
                  NEXT <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Solutions Auditing Sidebar */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
            {selectedSolution ? (
              <div className="flex flex-col h-full justify-between" id="solution-auditing-panel">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-mono text-slate-400 font-bold">COMPLIANCE ASSURANCES</span>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded">
                      {selectedSolution.code}
                    </span>
                  </div>

                  <div className="space-y-4 py-4 font-mono">
                    <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                      <span className="text-[9px] text-slate-500 block uppercase">SECURED CODESPACE:</span>
                      <span className="text-xs text-slate-200 block mt-1">{selectedSolution.title}</span>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                      <span className="text-[9px] text-slate-500 block uppercase">NIST AUDITING COMPLIANCE METRIC:</span>
                      <span className="text-xs text-emerald-400 block mt-1 font-bold">{selectedSolution.verificationMetric}</span>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                      <span className="text-[9px] text-slate-500 block uppercase">LICENSING FRAMEWORK:</span>
                      <span className="text-[11px] text-indigo-300 block mt-1">PROPRIETARY PARADOX OPERATOR LICENSE</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <div className="bg-slate-950/50 p-2.5 rounded border border-slate-850 text-[10px] text-slate-400 font-sans leading-relaxed mb-3">
                    Solutions are mathematically bound to corresponding hardware enclaves during sandbox stress runs.
                  </div>
                  
                  <button
                    onClick={() => {
                      alert(`Solution ${selectedSolution.code} actively integrated. Syncing sandbox anchors.`);
                      setActiveTab('sandbox');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Terminal className="w-4 h-4" />
                    Verify Efficacy in Sandbox
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10" id="solution-unselected-panel">
                <Lock className="text-slate-700 w-12 h-12 mb-3" />
                <h3 className="text-slate-300 font-display font-medium text-sm">Select Solution to Audit</h3>
                <p className="text-xs text-slate-500 max-w-[200px] mt-1.5">
                  Select any of the verified solution anchors from Marketplace 1 to inspect compliance specifications and test secure integration parameters.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Templates list */}
          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="templates-list-grid">
              {loading ? (
                <div className="col-span-4 text-center py-20 font-mono text-xs text-emerald-400 animate-pulse">
                  Querying Pre-Certified White-Labeled Templates...
                </div>
              ) : paginatedTemplates.map(tpl => (
                <div 
                  key={tpl.id}
                  className="bg-slate-950/40 border border-slate-850 hover:border-slate-750 p-5 rounded-xl text-left flex flex-col justify-between h-[250px] hover:bg-slate-950/80 transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                  
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 font-bold mb-2.5">
                      <span>VERSION {tpl.version}</span>
                      <span className="bg-emerald-950/50 border border-emerald-900/30 px-2 py-0.2 rounded-full uppercase text-[9px]">
                        {tpl.tier}
                      </span>
                    </div>
                    <h3 className="text-md font-display font-semibold text-slate-200 truncate" title={tpl.name}>{tpl.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-3 mt-2">{tpl.description}</p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">INCLUDED CAPABILITIES:</span>
                      <div className="flex flex-wrap gap-1">
                        {tpl.capabilities.slice(0, 2).map(cap => (
                          <span key={cap} className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 text-[8px] text-slate-300 font-mono rounded truncate max-w-[120px]">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcquireTemplate(tpl.id)}
                      className="w-full bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 text-[11px] font-mono py-1.8 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Acquire & Configure JIT Build
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {!loading && paginatedTemplates.length === 0 && (
                <div className="col-span-4 text-center py-20 font-mono text-xs text-slate-500">
                  No autonomous templates match the active search or filter.
                </div>
              )}
            </div>

            {/* Pagination controls for templates */}
            {totalTplPages > 1 && (
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-xl p-3 font-mono text-xs text-slate-400">
                <button
                  onClick={() => setTplPage(p => Math.max(1, p - 1))}
                  disabled={tplPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> PREV
                </button>
                <span>PAGE {tplPage} OF {totalTplPages}</span>
                <button
                  onClick={() => setTplPage(p => Math.min(totalTplPages, p + 1))}
                  disabled={tplPage === totalTplPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 flex items-center gap-1 cursor-pointer"
                >
                  NEXT <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
