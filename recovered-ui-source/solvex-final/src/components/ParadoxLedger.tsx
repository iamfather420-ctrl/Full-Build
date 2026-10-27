import React, { useState } from 'react';
import { ParadoxOperator } from '../types';
import { PARADOX_REGISTRY } from '../data';
import { Search, Filter, ShieldAlert, BadgeCheck, FileCode, CheckCircle2 } from 'lucide-react';

export default function ParadoxLedger() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'shared' | 'proprietary'>('all');
  const [selectedParadoxId, setSelectedParadoxId] = useState<number | null>(1);

  const filteredParadoxes = PARADOX_REGISTRY.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.solutionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const selectedParadox = PARADOX_REGISTRY.find(p => p.id === selectedParadoxId) || PARADOX_REGISTRY[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="paradox_ledger_module">
      {/* Paradox Index Search list */}
      <div className="lg:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse-cyan" />
              <h2 className="font-display font-medium text-lg text-white">88 Paradox Operators Registry</h2>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              Axios: DETERMINISTIC
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-6 font-sans">
            Secure algorithmic database. Mapped to 105 Solution Anchors. Select a Paradox Operator signature to verify active proof of efficacy.
          </p>

          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-600" />
              <input
                id="search_paradox"
                type="text"
                placeholder="Query Registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono pl-9 pr-4 py-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                id="filter_all"
                onClick={() => setFilterType('all')}
                className={`text-xs font-mono px-3 py-1.5 rounded transition ${filterType === 'all' ? 'bg-neutral-800 text-white border border-neutral-700' : 'bg-neutral-950 text-neutral-500 border border-neutral-900 hover:text-white'}`}
              >
                All
              </button>
              <button
                id="filter_proprietary"
                onClick={() => setFilterType('proprietary')}
                className={`text-xs font-mono px-3 py-1.5 rounded transition ${filterType === 'proprietary' ? 'bg-amber-950/20 text-amber-400 border border-amber-900/40' : 'bg-neutral-950 text-neutral-500 border border-neutral-900 hover:text-white'}`}
              >
                Proprietary
              </button>
              <button
                id="filter_shared"
                onClick={() => setFilterType('shared')}
                className={`text-xs font-mono px-3 py-1.5 rounded transition ${filterType === 'shared' ? 'bg-cyan-950/20 text-cyan-400 border border-cyan-900/40' : 'bg-neutral-950 text-neutral-500 border border-neutral-900 hover:text-white'}`}
              >
                Shared
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
            {filteredParadoxes.map((p) => {
              const isSelected = selectedParadoxId === p.id;
              return (
                <button
                  key={p.id}
                  id={`paradox_item_${p.id}`}
                  onClick={() => setSelectedParadoxId(p.id)}
                  className={`
                    w-full text-left p-3 rounded border flex items-center justify-between transition-all duration-150
                    ${isSelected ? 'border-cyan-500 bg-neutral-900/40 text-cyan-400' : 'border-neutral-900 bg-black/40 text-neutral-400 hover:border-neutral-800 hover:bg-neutral-900/20'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold bg-neutral-900 px-2 py-0.5 border border-neutral-800 rounded">
                      #{String(p.id).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-xs font-mono font-medium text-white">{p.name}</h3>
                      <p className="text-[10px] text-neutral-500 truncate max-w-sm mt-0.5">{p.description}</p>
                    </div>
                  </div>

                  <span className={`
                    text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border
                    ${p.type === 'proprietary' ? 'text-amber-400 border-amber-900 bg-amber-950/20' : 'text-cyan-400 border-cyan-900 bg-cyan-950/20'}
                  `}>
                    {p.type}
                  </span>
                </button>
              );
            })}
            {filteredParadoxes.length === 0 && (
              <div className="text-center font-mono text-neutral-600 text-xs py-8">
                No matching paradox definitions registered in RAG database.
              </div>
            )}
          </div>
        </div>

        <div className="text-[9px] font-mono text-neutral-600 mt-4 pt-4 border-t border-neutral-900 uppercase">
          Tether RAG index synchronized against 105 Solution Anchors
        </div>
      </div>

      {/* Paradox Solution & Proof of Efficacy Detail */}
      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-4 border-b border-neutral-900 pb-3">
            <BadgeCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-display font-medium text-white">Sovereign Proof Matrix</h3>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Axiomatic Anchor Mapping</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-mono text-neutral-500 uppercase block">ACTIVE PARADOX OPERATOR</span>
              <span className="text-xs font-mono text-white font-medium block mt-1">
                Paradox #{String(selectedParadox.id).padStart(2, '0')}: {selectedParadox.name}
              </span>
              <p className="text-[11px] font-sans text-neutral-400 mt-1.5 leading-relaxed">
                {selectedParadox.description}
              </p>
            </div>

            <div className="border-t border-neutral-900 pt-4">
              <span className="text-[9px] font-mono text-neutral-500 uppercase block">RESOLVED SOLUTION ANCHOR</span>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Anchor #{selectedParadox.solutionId}: {selectedParadox.solutionName}
                </span>
              </div>
            </div>

            {/* Proof of Efficacy Container */}
            <div className="p-3 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-[9px] font-mono text-neutral-500 block uppercase mb-1">PROVED EFFICACY COEFFICIENT</span>
              <p className="text-xs font-mono text-neutral-200 leading-relaxed break-words">
                {selectedParadox.proofOfEfficacy}
              </p>
            </div>

            {/* Tether security details */}
            <div className="p-3 border border-neutral-900 rounded bg-black/50 font-mono text-[10px] text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>RAG SYNAPSE HANDSHAKE:</span>
                <span className="text-cyan-400">PASSED</span>
              </div>
              <div className="flex justify-between">
                <span>API LEAK SHIELD:</span>
                <span className="text-cyan-400">SOC-II COMPILED</span>
              </div>
              <div className="flex justify-between">
                <span>DE-AUTHORIZATION TRIGGER:</span>
                <span className="text-rose-500">ARMED</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-900 text-[10px] font-mono text-neutral-500 flex justify-between">
          <span>COOPERATOR CODE: ISO_42001</span>
          <span>LOCKOUT STATE: FALSE</span>
        </div>
      </div>
    </div>
  );
}
