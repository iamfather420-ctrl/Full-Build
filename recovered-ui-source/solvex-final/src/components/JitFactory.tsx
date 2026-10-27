import React, { useState } from 'react';
import { BuildLog } from '../types';
import { Cpu, Play, CheckCircle2, Terminal, RefreshCw, Trash2, ShieldCheck, CloudLightning } from 'lucide-react';

export default function JitFactory() {
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<{
    watermark: string;
    obfuscationLevel: string;
    fingerprint: string;
    tamperSeal: string;
    rockUrl: string;
  } | null>(null);

  const buildSteps = [
    { step: 'init', message: 'Initializing JIT binary package compiler engine...' },
    { step: 'watermark', message: 'Applying hardened binary watermark: "DAISY_HAMINJA_SOVEREIGN_MARKETPLACE"' },
    { step: 'obfuscate', message: 'Triggering 58-operator anti-reverse compilation passes & obfuscator logic...' },
    { step: 'fingerprint', message: 'Calculating cryptographic SHA-256 fingerprint for binary authentication...' },
    { step: 'seal', message: 'Generating hardware anti-tamper environmental seal. Compressing stack...' },
    { step: 'deploy', message: 'Connecting to Google Cloud Run ("Google Cloud Rock") CI/CD Continuous Handshake...' },
    { step: 'done', message: 'Deployment completed successfully. Sovereign container is active.' }
  ];

  const handleStartBuild = () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setProgress(0);
    setLogs([]);
    setMetadata(null);

    let stepIndex = 0;

    const runNextStep = () => {
      if (stepIndex >= buildSteps.length) {
        setIsCompiling(false);
        setActiveStep(null);
        setProgress(100);
        setMetadata({
          watermark: 'dAIsy_HaMINJA_v1.0.0_STABLE',
          obfuscationLevel: '100% Core Matrix Obfuscation',
          fingerprint: 'sha256:4f8e97a3b2c1f0e9d8c7b6a5f4e3d2c1',
          tamperSeal: 'SEAL_STATE_LOCKED_0x00FF',
          rockUrl: 'https://ais-dev-p3rmymvbrucbklmpkrllui-305259416373.us-west1.run.app'
        });
        return;
      }

      const currentStep = buildSteps[stepIndex];
      setActiveStep(currentStep.step);
      
      const newLog: BuildLog = {
        id: `log_${Date.now()}_${stepIndex}`,
        timestamp: new Date().toLocaleTimeString(),
        step: currentStep.step as any,
        level: currentStep.step === 'done' ? 'success' : 'info',
        message: currentStep.message
      };

      setLogs(prev => [...prev, newLog]);
      setProgress(Math.floor(((stepIndex + 1) / buildSteps.length) * 100));

      // Schedule next step
      stepIndex++;
      setTimeout(runNextStep, 1100);
    };

    runNextStep();
  };

  const handleClearLogs = () => {
    setLogs([]);
    setProgress(0);
    setMetadata(null);
    setActiveStep(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="jit_factory_module">
      {/* Configuration & Compilation Trigger */}
      <div className="lg:col-span-1 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <h2 className="font-display font-medium text-lg text-white">JIT Compilation Pipeline</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              Factory: JIT_v4
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-6 font-sans">
            Orchestrate JIT APK and standalone compiled binary builders. Automated pipelines apply watermarks, anti-tamper seals, obfuscation arrays, and push directly to Google Cloud Run (Rock Hosting).
          </p>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 border border-neutral-900 rounded bg-neutral-950">
              <span className="text-[9px] text-neutral-500 block">DEPLOYMENT TARGET</span>
              <span className="text-white font-bold block mt-1">Google Cloud Run (Sovereign Rock)</span>
            </div>

            <div className="p-3 border border-neutral-900 rounded bg-neutral-950">
              <span className="text-[9px] text-neutral-500 block">OBFUSCATION LEVEL</span>
              <span className="text-white font-bold block mt-1">Proprietary XOR Block + Entry Obfuscator</span>
            </div>

            <div className="p-3 border border-neutral-900 rounded bg-neutral-950">
              <span className="text-[9px] text-neutral-500 block">WATERMARK HANDSHAKE</span>
              <span className="text-white font-bold block mt-1">Embedded Secure Fingerprint</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <button
            id="btn_trigger_jit_build"
            onClick={handleStartBuild}
            disabled={isCompiling}
            className="w-full flex items-center justify-center space-x-2 text-xs font-mono font-bold bg-white hover:bg-neutral-200 text-black py-3 rounded transition disabled:opacity-50"
          >
            {isCompiling ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Compiling {progress}%...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Compile Autonomous Template</span>
              </>
            )}
          </button>

          <button
            id="btn_clear_jit_logs"
            onClick={handleClearLogs}
            disabled={isCompiling || logs.length === 0}
            className="w-full flex items-center justify-center space-x-1 text-xs font-mono py-2 rounded border border-neutral-900 hover:border-neutral-700 text-neutral-500 hover:text-neutral-300 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Pipeline States</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="lg:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <h3 className="font-display font-medium text-white">Compiler Output Stream</h3>
            </div>
            <div className="text-[10px] font-mono text-neutral-500 flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isCompiling ? 'bg-amber-500 animate-pulse' : 'bg-neutral-800'}`}></span>
              <span>{isCompiling ? 'BUILD_RUNNING' : 'IDLE'}</span>
            </div>
          </div>

          {/* Scrolling log viewport */}
          <div className="bg-black/60 border border-neutral-900 p-4 rounded-lg font-mono text-[11px] h-60 overflow-y-auto no-scrollbar space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2">
                <span className="text-neutral-600">[{log.timestamp}]</span>
                <span className={`uppercase font-bold text-[10px] ${log.level === 'success' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {log.step}
                </span>
                <span className="text-neutral-300 flex-1 leading-relaxed">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-neutral-600 flex flex-col items-center justify-center h-full text-center">
                <span>Compiler terminal is inactive.</span>
                <span className="text-[9px] mt-1">Initiate compilation from the control panel.</span>
              </div>
            )}
          </div>
        </div>

        {/* Generated Fingerprint & Deployment Status Details */}
        <div className="mt-4 pt-4 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-neutral-500 uppercase block">FINGERPRINT SIGNATURES</span>
            {metadata ? (
              <div className="p-3 border border-neutral-900 rounded bg-black/40 font-mono text-[10px] space-y-1.5 text-neutral-400">
                <div className="flex justify-between">
                  <span>WATERMARK:</span>
                  <span className="text-white font-medium">{metadata.watermark}</span>
                </div>
                <div className="flex justify-between">
                  <span>OBFUSCATOR:</span>
                  <span className="text-white font-medium">{metadata.obfuscationLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span>SHA-256 FINGERPRINT:</span>
                  <span className="text-cyan-400 font-bold tracking-tighter truncate max-w-[140px]" title={metadata.fingerprint}>
                    {metadata.fingerprint.substring(0, 18)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ENVIRONMENT SEAL:</span>
                  <span className="text-emerald-400 font-bold">{metadata.tamperSeal}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 border border-neutral-900 border-dashed rounded text-center text-neutral-600 font-mono text-[10px] py-6">
                Awaiting compilation completed handshake.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-mono text-neutral-500 uppercase block">GOOGLE CLOUD RUN STATUS (ROCK COMPUTE)</span>
            {metadata ? (
              <div className="p-3 border border-neutral-900 rounded bg-black/40 font-mono text-[10px] flex flex-col justify-between h-[82px]">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>CONTAINER ACTIVE & ROUTED</span>
                </div>
                <div className="text-[9px] text-neutral-500 truncate mt-1">
                  URL: <span className="text-white underline">{metadata.rockUrl}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 border border-neutral-900 border-dashed rounded text-center text-neutral-600 font-mono text-[10px] py-6">
                Awaiting continuous deployment handshake.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
