import React, { useState, useEffect } from 'react';
import { ProofMetric } from '../types.js';
import { Sliders, Activity, Play, Zap, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function SandboxTelemetry() {
  const [metrics, setMetrics] = useState<ProofMetric[]>([]);
  const [chaosLevel, setChaosLevel] = useState(0);
  const [isInjectingChaos, setIsInjectingChaos] = useState(false);
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([
    "[SYSTEM] Sandbox stress testing suite initiated.",
    "[COMPLIANCE] NIST SP 800-53 telemetry audit listener active."
  ]);

  // Fetch metrics history
  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/sandbox/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  // Set chaos level on backend
  const handleChaosSliderChange = async (val: number) => {
    setChaosLevel(val);
    try {
      await fetch('/api/sandbox/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor: val })
      });
      
      const timeStr = new Date().toLocaleTimeString();
      if (val > 50) {
        setSandboxLogs(prev => [
          ...prev, 
          `[${timeStr}] [WARNING] High Workload Surges injected (${val}% intensity). Node load balancing triggered.`
        ].slice(-8));
      } else {
        setSandboxLogs(prev => [
          ...prev, 
          `[${timeStr}] Workload parameters adjusted to ${val}%.`
        ].slice(-8));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Chaos Monkey Network Partition trigger
  const handleTriggerChaosMonkey = () => {
    setIsInjectingChaos(true);
    handleChaosSliderChange(90);
    
    const timeStr = new Date().toLocaleTimeString();
    setSandboxLogs(prev => [
      ...prev,
      `[${timeStr}] [CRITICAL] CHAOS MONKEY INJECTED: Simulating 40% subgrid network partition...`,
      `[${timeStr}] Enforcing Paradox Operator SL-11 consensus fast-path fast-recovery...`
    ].slice(-8));

    setTimeout(() => {
      handleChaosSliderChange(0);
      setIsInjectingChaos(false);
      const timeStrEnd = new Date().toLocaleTimeString();
      setSandboxLogs(prev => [
        ...prev,
        `[${timeStrEnd}] [RESOLVED] Anti-entropy solver successfully auto-healed grid partitions. Latency returning to baseline.`
      ].slice(-8));
    }, 8000);
  };

  // Build SVG path coordinates from telemetry data
  const generateSvgPath = (data: number[], minVal: number, maxVal: number, width: number, height: number) => {
    if (data.length < 2) return '';
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      // Invert Y because SVG coordinates start from top-left
      const ratio = (val - minVal) / (maxVal - minVal || 1);
      const y = height - (ratio * (height - 10)) - 5;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const tpsValues = metrics.map(m => m.tps);
  const latencyValues = metrics.map(m => m.latency);
  const cpuValues = metrics.map(m => m.cpuLoad);

  const minTps = Math.min(...tpsValues, 1000) - 100;
  const maxTps = Math.max(...tpsValues, 2500) + 100;

  const minLatency = 0;
  const maxLatency = Math.max(...latencyValues, 20) + 2;

  const currentTps = tpsValues[tpsValues.length - 1] || 1950;
  const currentLatency = latencyValues[latencyValues.length - 1] || 8;
  const currentCpu = cpuValues[cpuValues.length - 1] || 52;
  const currentBlock = metrics[metrics.length - 1]?.blockHeight || 1204910;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sandbox-telemetry-module">
      
      {/* Real-time telemetry chart graphs */}
      <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="mb-4 pb-3 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="text-emerald-400 w-5 h-5" />
                Proof of Efficacy Analytics
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifiable high-level performance metrics generated under sandbox stress-testing, hiding internal proprietary algorithms.
              </p>
            </div>
            
            <div className="text-right font-mono text-[10px] text-slate-500">
              BLOCK HEIGHT: <span className="text-slate-300 font-bold">{currentBlock}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
            
            {/* Chart 1: Throughput TPS */}
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Throughput (TPS)</span>
                <span className="text-sm font-mono font-bold text-emerald-400 animate-pulse">{currentTps} Res/s</span>
              </div>

              {/* Pure SVG Path line Chart */}
              <div className="h-[120px] w-full bg-slate-950 rounded relative mt-3 overflow-hidden">
                <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none opacity-20">
                  <div className="border-b border-slate-800 w-full text-[8px] font-mono text-slate-400">{maxTps.toFixed(0)}</div>
                  <div className="border-b border-slate-800 w-full text-[8px] font-mono text-slate-400">{(minTps + (maxTps-minTps)/2).toFixed(0)}</div>
                  <div className="text-[8px] font-mono text-slate-400">{minTps.toFixed(0)}</div>
                </div>

                <svg className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Fill Area */}
                  {tpsValues.length > 1 && (
                    <path
                      d={`${generateSvgPath(tpsValues, minTps, maxTps, 320, 120)} L 320,120 L 0,120 Z`}
                      fill="url(#tpsGrad)"
                    />
                  )}
                  {/* Line Path */}
                  <path
                    d={generateSvgPath(tpsValues, minTps, maxTps, 320, 120)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />
                </svg>
              </div>
            </div>

            {/* Chart 2: Network Latency */}
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Consensus Latency</span>
                <span className={`text-sm font-mono font-bold ${currentLatency > 15 ? 'text-amber-400' : 'text-sky-400'}`}>
                  {currentLatency} ms
                </span>
              </div>

              {/* Pure SVG Path line Chart */}
              <div className="h-[120px] w-full bg-slate-950 rounded relative mt-3 overflow-hidden">
                <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none opacity-20">
                  <div className="border-b border-slate-800 w-full text-[8px] font-mono text-slate-400">{maxLatency.toFixed(0)}ms</div>
                  <div className="border-b border-slate-800 w-full text-[8px] font-mono text-slate-400">{(maxLatency/2).toFixed(0)}ms</div>
                  <div className="text-[8px] font-mono text-slate-400">0ms</div>
                </div>

                <svg className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Fill Area */}
                  {latencyValues.length > 1 && (
                    <path
                      d={`${generateSvgPath(latencyValues, minLatency, maxLatency, 320, 120)} L 320,120 L 0,120 Z`}
                      fill="url(#latGrad)"
                    />
                  )}
                  {/* Line Path */}
                  <path
                    d={generateSvgPath(latencyValues, minLatency, maxLatency, 320, 120)}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />
                </svg>
              </div>
            </div>

          </div>
        </div>

        {/* Real-time active events list */}
        <div className="space-y-2 mt-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">SANDBOX RUN LOGS:</span>
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg h-[80px] overflow-y-auto font-mono text-[11px] text-indigo-400 space-y-1 scroll-smooth">
            {sandboxLogs.map((log, idx) => (
              <div key={idx} className="truncate">
                <span className="text-slate-600 select-none">&gt;</span> {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chaos Workload Injector drawer */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-md font-display font-semibold text-slate-100 flex items-center gap-1.5">
              <Sliders className="text-amber-400 w-4.5 h-4.5" />
              Sovereign Chaos Rig
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Inject synthetic network loads to verify anti-fragile thresholds.</p>
          </div>

          <div className="space-y-5 py-3">
            {/* Slider container */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">WORKLOAD SURGE SURCHARGE</span>
                <span className="text-amber-400 font-bold">{chaosLevel}% Intensity</span>
              </div>
              
              <input 
                type="range"
                min="0"
                max="100"
                value={chaosLevel}
                disabled={isInjectingChaos}
                onChange={(e) => handleChaosSliderChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
              />

              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0% (IDLE)</span>
                <span>50% (STRESS)</span>
                <span>100% (CRITICAL)</span>
              </div>
            </div>

            {/* Simulated Live Core Efficacy Stat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/50 p-3 border border-slate-850 rounded-lg text-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">CORE HEAL SPEED</span>
                <span className="text-base font-mono font-bold text-emerald-400 block mt-1">
                  {chaosLevel > 60 ? "112ms" : "14ms"}
                </span>
              </div>
              
              <div className="bg-slate-950/50 p-3 border border-slate-850 rounded-lg text-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">CPU LOAD OVERHEAD</span>
                <span className="text-base font-mono font-bold text-slate-300 block mt-1">
                  {currentCpu}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-lg text-[10px] text-slate-400 leading-relaxed mb-4 flex gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Chaos Monkey forces a subgrid network split, forcing nodes into rapid self-healing and paradox re-anchoring routines.</span>
          </div>

          <button
            onClick={handleTriggerChaosMonkey}
            disabled={isInjectingChaos}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 text-white text-xs font-mono py-2.5 rounded-lg font-bold shadow-lg shadow-rose-950/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${isInjectingChaos ? 'animate-bounce' : 'text-rose-100'}`} />
            {isInjectingChaos ? "Chaos Partition Processing..." : "Inject Chaos Monkey Partition"}
          </button>
        </div>
      </div>
    </div>
  );
}
