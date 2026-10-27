/**
 * Recovered ParadoxLedger layout, with all hardcoded proof/compliance claims removed.
 * This view does not manufacture contract records or substitute for current evidence.
 */
import React from 'react';
import { Database, Shield, AlertTriangle, Search, FileCode } from 'lucide-react';

export default function ParadoxLedger() {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6 glow-border" id="paradox_ledger_module">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800"><Database className="h-5 w-5 text-cyan-400" /></div>
          <div>
            <h2 className="font-display font-medium text-lg text-white">Paradox Ledger</h2>
            <p className="text-xs text-neutral-400 mt-1 font-sans">Read-only evidence view · source registry integration pending</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-amber-300 border border-amber-900/60 bg-amber-950/30 px-2 py-1 rounded">NOT VERIFIED HERE</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><FileCode className="h-4 w-4" /> Evidence source</div>
          <p className="text-sm text-white mt-2">Root verification pipeline</p>
          <p className="text-xs text-neutral-500 mt-1">Use current run artifacts and source commit, not values rendered by this UI.</p>
        </div>
        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><Search className="h-4 w-4" /> Current view</div>
          <p className="text-sm text-amber-300 mt-2">Evidence not loaded</p>
          <p className="text-xs text-neutral-500 mt-1">No contract count, SAT/UNSAT outcome, or compliance status is asserted here.</p>
        </div>
      </div>
      <div role="status" className="rounded border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-3">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <div><strong className="font-mono text-xs uppercase">PROOF-BEFORE-POWER</strong><p className="mt-2 text-xs text-amber-100/80">This panel is informational only. A fresh verification run and the authoritative activation gate must establish any result before it can be presented as verified.</p></div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 border-t border-neutral-900 pt-4"><AlertTriangle className="h-4 w-4 text-amber-500" />Recovered original visual source retained separately for audit; unsupported proof claims are not active.</div>
    </div>
  );
}
