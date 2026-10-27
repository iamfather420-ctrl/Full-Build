/**
 * ParadoxLedger — read-only status surface.
 * Does not claim live formal verification results beyond what the activation gate has already authorized.
 * Prefer wiring to authoritative registry + evidence when the native bundle is fully recovered.
 */
import React from 'react';
import { Database, Shield, AlertTriangle } from 'lucide-react';

export default function ParadoxLedger() {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6" id="paradox_ledger_module">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
          <Database className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="font-display font-medium text-lg text-white">88 Paradox Ledger</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Formal DFRL / DH contracts live in the root verification pipeline. This native view is a placeholder until the original ledger module is recovered from archive.
          </p>
        </div>
      </div>

      <div role="status" className="rounded border border-cyan-900/50 bg-cyan-950/20 p-4 text-sm text-cyan-100 flex gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Authoritative results are produced by <code className="font-mono text-xs">npm run verify:120</code> and the activation gate. Do not treat this panel as evidence of a fresh 120/120 pass.
        </p>
      </div>

      <div className="rounded border border-neutral-900 bg-neutral-900/40 p-4 text-xs font-mono text-neutral-400 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <p>
          Original ParadoxLedger UI module is missing from the current tree. Status remains informational only.
        </p>
      </div>
    </div>
  );
}
