/**
 * JitFactory — intentionally non-operational.
 * Original source is preserved under recovered-ui-source/solvex-final/.
 * The recovered original simulates completion using timers and hardcoded deployment metadata.
 */
import React from 'react';
import { Layers, AlertTriangle, Lock } from 'lucide-react';

export default function JitFactory() {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6" id="jit_factory_module">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800">
          <Layers className="h-5 w-5 text-neutral-400" />
        </div>
        <div>
          <h2 className="font-display font-medium text-lg text-white">JIT Build Factory</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Product generation, watermarking, compilation, and deployment are not executed from this view.
          </p>
        </div>
      </div>
      <div role="status" className="rounded border border-amber-800/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-2">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong className="font-mono text-xs uppercase">BLOCKED</strong> — Recovered original UI is not activated because its client-side timers and fixed deployment URL do not prove a real build or deployment. No build, seal, or publish action is available.
        </p>
      </div>
      <div className="rounded border border-neutral-900 bg-neutral-900/40 p-4 text-xs font-mono text-neutral-500 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p>Placeholder only. Does not invoke compile, fingerprint, or marketplace publication paths.</p>
      </div>
    </div>
  );
}
