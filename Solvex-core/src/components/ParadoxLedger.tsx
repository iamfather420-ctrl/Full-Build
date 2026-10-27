/** Recovered from archive. Sample registry only — not the formal 88-operator Z3 corpus. */
import React, { useState } from 'react';
import { PARADOX_REGISTRY } from '../data';
import { Search, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function ParadoxLedger() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'shared' | 'proprietary'>('all');
  const [selectedParadoxId, setSelectedParadoxId] = useState<number | null>(PARADOX_REGISTRY[0]?.id ?? null);

  const filtered = PARADOX_REGISTRY.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.solutionName.toLowerCase().includes(q);
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const selected = PARADOX_REGISTRY.find((p) => p.id === selectedParadoxId) || filtered[0];

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg" id="paradox_ledger_module">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 text-violet-400" />
          <div>
            <h2 className="font-medium text-white">Paradox Ledger</h2>
            <span className="text-[10px] font-mono text-violet-400 uppercase">Sample registry · not formal corpus</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-500">{PARADOX_REGISTRY.length} sample entries</span>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded px-2">
          <Search className="h-3.5 w-3.5 text-neutral-500" />
          <input
            className="flex-1 bg-transparent text-xs font-mono py-2 text-white focus:outline-none"
            placeholder="Search sample paradoxes…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {(['all', 'shared', 'proprietary'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`text-[10px] font-mono px-2 py-1 rounded border ${
              filterType === t ? 'border-violet-700 text-violet-300' : 'border-neutral-800 text-neutral-500'
            }`}
          >{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ul className="max-h-72 overflow-y-auto space-y-1">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedParadoxId(p.id)}
                className={`w-full text-left text-xs font-mono p-2 rounded border ${
                  selected?.id === p.id ? 'border-violet-700 bg-violet-950/20' : 'border-neutral-900'
                }`}
              >
                <span className="text-neutral-400">#{p.id}</span> {p.name}
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="border border-neutral-900 rounded p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <BadgeCheck className="h-4 w-4 text-emerald-400" />
              {selected.name}
            </div>
            <p className="text-neutral-400">{selected.description}</p>
            <p className="font-mono text-neutral-500">Solution: {selected.solutionName}</p>
            <p className="font-mono text-[10px] text-neutral-600">{selected.proofOfEfficacy}</p>
            <p className="text-[10px] text-amber-500/90 font-mono">
              UI sample only. Formal verification evidence lives in the 120-case / Z3 pipeline, not this list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
