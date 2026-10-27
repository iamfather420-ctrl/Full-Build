/** Recovered from archive. Local demo steps only — does not deploy or claim production. */
import React, { useState } from 'react';
import { BuildLog } from '../types';
import { Cpu, Play, Terminal, ShieldCheck } from 'lucide-react';

const STEPS: BuildLog['step'][] = ['init', 'watermark', 'obfuscate', 'fingerprint', 'seal', 'done'];

export default function JitFactory() {
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);

  const runDemo = async () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setLogs([]);
    setProgress(0);
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      await new Promise((r) => setTimeout(r, 200));
      setProgress(Math.round(((i + 1) / STEPS.length) * 100));
      setLogs((prev) => [
        ...prev,
        {
          id: `log_${Date.now()}_${i}`,
          timestamp: new Date().toISOString(),
          step,
          level: step === 'done' ? 'success' : 'info',
          message:
            step === 'done'
              ? 'Local demo sequence finished. No container was deployed.'
              : `Demo step: ${step}`,
        },
      ]);
    }
    setIsCompiling(false);
  };

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg" id="jit_factory_module">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="h-5 w-5 text-orange-400" />
          <div>
            <h2 className="font-medium text-white">JIT Factory</h2>
            <span className="text-[10px] font-mono text-orange-400 uppercase">Local demo · not a live deploy</span>
          </div>
        </div>
        <button
          type="button"
          onClick={runDemo}
          disabled={isCompiling}
          className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 text-white disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {isCompiling ? 'Running…' : 'Run local demo'}
        </button>
      </div>

      <div className="mb-3 h-2 bg-neutral-900 rounded overflow-hidden">
        <div className="h-full bg-orange-500/70 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-neutral-900 rounded p-3 max-h-56 overflow-y-auto font-mono text-[10px] space-y-1">
          <div className="flex items-center gap-1 text-neutral-500 mb-2">
            <Terminal className="h-3.5 w-3.5" /> Build log
          </div>
          {logs.length === 0 && <span className="text-neutral-600">No demo run yet.</span>}
          {logs.map((l) => (
            <div key={l.id} className={l.level === 'success' ? 'text-emerald-400' : 'text-neutral-400'}>
              [{l.step}] {l.message}
            </div>
          ))}
        </div>
        <div className="border border-neutral-900 rounded p-3 font-mono text-[10px] space-y-2">
          <div className="flex items-center gap-2 text-neutral-300">
            <ShieldCheck className="h-4 w-4" />
            DEPLOY TARGET (UNVERIFIED — NOT LIVE)
          </div>
          <p className="text-neutral-500">DEPLOYMENT NOT AUTHORIZED from this UI. Staging requires separate operator approval.</p>
        </div>
      </div>
    </div>
  );
}
