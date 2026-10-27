/**
 * Recovered JitFactory layout, with timer-based simulated completion removed.
 * No build, signing, fingerprinting, or deployment action is exposed here.
 */
import React from 'react';
import { Layers, AlertTriangle, Lock, Cpu, CloudLightning } from 'lucide-react';

export default function JitFactory() {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6 glow-border" id="jit_factory_module">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800"><Layers className="h-5 w-5 text-neutral-400" /></div>
          <div>
            <h2 className="font-display font-medium text-lg text-white">JIT Build Factory</h2>
            <p className="text-xs text-neutral-400 mt-1 font-sans">Product generation · artifact sealing · deployment workflow</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-amber-300 border border-amber-900/60 bg-amber-950/30 px-2 py-1 rounded">BLOCKED</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><Cpu className="h-4 w-4" /> Build execution</div>
          <p className="text-sm text-amber-300 mt-2">Not executed</p>
          <p className="text-xs text-neutral-500 mt-1">No compiler or isolated build worker is invoked by this panel.</p>
        </div>
        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><CloudLightning className="h-4 w-4" /> Deployment</div>
          <p className="text-sm text-amber-300 mt-2">Not deployed</p>
          <p className="text-xs text-neutral-500 mt-1">No fixed URL, timer, or client-side status is treated as deployment evidence.</p>
        </div>
      </div>
      <div role="status" className="rounded border border-amber-800/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-3">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <div><strong className="font-mono text-xs uppercase">BLOCKED — NO VERIFIED EXECUTOR</strong><p className="mt-2 text-xs text-amber-100/80">Factory execution remains unavailable until a real isolated executor, authorization policy, artifact verification, and deployment evidence are wired to the control plane.</p></div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 border-t border-neutral-900 pt-4"><AlertTriangle className="h-4 w-4 text-amber-500" />Original UI is preserved in the recovery snapshot; its simulated-success paths are inactive.</div>
    </div>
  );
}
