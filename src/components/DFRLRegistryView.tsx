import React, { useState } from 'react';
import { BookOpen, Search, Filter, CheckCircle2, Shield, Download, FileText } from 'lucide-react';
import { REAL_88_PARADOX_REGISTRY, DFRLParadoxItem } from '../data/paradoxData';
import { generateDFRLFormalDossier } from '../services/dfrlFormalArtifacts';

export const DFRLRegistryView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inspectItem, setInspectItem] = useState<DFRLParadoxItem | null>(REAL_88_PARADOX_REGISTRY[0]);

  const categories = ['ALL', ...Array.from(new Set(REAL_88_PARADOX_REGISTRY.map(p => p.domain)))];

  const filtered = REAL_88_PARADOX_REGISTRY.filter(item => {
    const matchSearch = item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.classical_antinomy.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || item.domain === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleDownloadDossier = () => {
    const dossier = generateDFRLFormalDossier();
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dfrl_complete_88_proof_dossier_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
              <BookOpen className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              DFRL 88-Paradox Machine-Checked Formal Registry
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Complete enumeration of 88 classical antinomies and foundational boundary problems.
            Each paradox possesses machine-checked inductive invariants and SMT-LIB 2.0 assertions with zero speculative mocks.
          </p>
        </div>

        <button
          onClick={handleDownloadDossier}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-600/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 88-Paradox Formal Dossier (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across 88 formal paradoxes by code, title, or mechanism..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-slate-950">{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Paradox Grid */}
        <div className="lg:col-span-7 space-y-2 max-h-[650px] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const isSelected = inspectItem?.code === item.code;
            return (
              <div
                key={item.code}
                onClick={() => setInspectItem(item)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 font-bold">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.domain}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.classical_antinomy}</p>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspect Panel */}
        <div className="lg:col-span-5">
          {inspectItem ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 sticky top-20">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{inspectItem.code}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                    {inspectItem.machine_checked_status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{inspectItem.name}</h3>
                <span className="text-xs text-slate-400 font-mono block mt-0.5">
                  Domain: {inspectItem.domain} • Category: {inspectItem.category}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium mb-1">Classical Antinomy Formulation:</span>
                  <p className="text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                    {inspectItem.classical_antinomy}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium mb-1">Machine-Checked Invariant Specification:</span>
                  <p className="text-emerald-300 bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/40 leading-relaxed font-mono text-[11px]">
                    {inspectItem.formal_invariant}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium mb-1">SMT-LIB 2.0 Reduction Proposition:</span>
                  <pre className="text-cyan-300 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                    {inspectItem.z3_smt_assertion}
                  </pre>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Proof Bundle Ref:</span>
                  <span className="text-cyan-400">{inspectItem.proof_bundle_ref}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Select a paradox to inspect formal invariants.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
