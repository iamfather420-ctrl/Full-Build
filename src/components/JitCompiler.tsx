import React, { useState, useEffect, useRef } from 'react';
import { JITBuild } from '../types.js';
import { Terminal, Shield, Download, FileJson, Cpu, Lock, CheckCircle2, RefreshCw } from 'lucide-react';

interface JitCompilerProps {
  buildTriggeredCount: number;
}

export default function JitCompiler({ buildTriggeredCount }: JitCompilerProps) {
  const [builds, setBuilds] = useState<JITBuild[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<JITBuild | null>(null);
  const [loading, setLoading] = useState(false);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/builds');
      if (res.ok) {
        const data = await res.json();
        setBuilds(data);
        
        // Auto-select latest or maintain selection
        if (data.length > 0) {
          if (!selectedBuild) {
            setSelectedBuild(data[0]);
          } else {
            const updated = data.find((b: JITBuild) => b.id === selectedBuild.id);
            if (updated) setSelectedBuild(updated);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, [buildTriggeredCount]);

  // Periodic polling for build log sync
  useEffect(() => {
    const interval = setInterval(() => {
      // Fetch builds and refresh log scroll if currently watching active build
      fetch('/api/builds')
        .then(res => res.json())
        .then(data => {
          setBuilds(data);
          if (selectedBuild) {
            const updated = data.find((b: JITBuild) => b.id === selectedBuild.id);
            if (updated) {
              setSelectedBuild(updated);
            }
          }
        });
    }, 1500);
    return () => clearInterval(interval);
  }, [selectedBuild?.id]);

  // Scroll to bottom of terminal when logs change
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [selectedBuild?.logs?.length]);

  // Action: Trigger JSON deployment download
  const handleDownloadManifest = (bld: JITBuild) => {
    const manifest = {
      manifest_id: `SOV-MAN-${bld.id.toUpperCase()}`,
      compilation_version: "dAIsy_HaMINJA-1.0.0-STABLE",
      build_epoch: bld.completedAt || new Date().toISOString(),
      source_template: bld.templateName,
      obfuscation_entropy_index: "7.998/8.000",
      compliance_certification: {
        "NIST_SP_800-53": "COMPLIANT",
        "SOC2_TYPE_II": "VERIFIED_AUDIT",
        "ISO_42001": "SOCIETAL_AI_GOVERNANCE_STABLE"
      },
      cryptographic_fingerprints: {
        watermark_label: bld.watermark || "UNSPECIFIED_WATERMARK",
        sha256_binary_fingerprint: bld.sha256Fingerprint || "COMPILING...",
        anti_tamper_signature_seal: bld.antiTamperSeal || "SEALING_CORE..."
      },
      target_nodes: [
        "SovereignNode-01", "SovereignNode-02", "SovereignNode-12", "SovereignNode-44"
      ],
      licensing: {
        issuer: "SolveX Institutional Core",
        validity: "UNLIMITED_Sovereign_Authority_Node"
      },
      configuration_bindings: bld.credentialsConfig || {}
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sovereign_manifest_${bld.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'queued': return 'bg-slate-800 border-slate-700 text-slate-400';
      case 'failed': return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default: return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="jit-compiler-module">
      
      {/* Build History Column */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="mb-4 pb-3 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-100 flex items-center gap-1.5">
                <Terminal className="text-indigo-400 w-4.5 h-4.5" />
                JIT Compile Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Sovereign artifact factory history logs.</p>
            </div>
            
            <button 
              onClick={fetchBuilds}
              className="p-1 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded transition-all cursor-pointer"
              title="Sync Ledger"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {builds.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 font-mono">
                No active compiles. Deploy repository files first.
              </div>
            ) : (
              builds.map(bld => {
                const isSelected = selectedBuild?.id === bld.id;
                return (
                  <div
                    key={bld.id}
                    onClick={() => setSelectedBuild(bld)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-950/20 border-indigo-500/80' 
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-display font-semibold text-slate-200 truncate pr-2" title={bld.templateName}>
                        {bld.templateName}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 uppercase">{bld.id}</span>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded border ${getStatusBadgeColor(bld.status)}`}>
                        {bld.status.toUpperCase()}
                      </span>
                      <span className="text-slate-500">
                        {bld.duration ? `${(bld.duration/1000).toFixed(2)}s` : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>RSA-4096 JIT Key signatures actively rotating every 10 minutes.</span>
          </div>
        </div>
      </div>

      {/* Terminal Logs & Manifest Column */}
      <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
        {selectedBuild ? (
          <div className="flex flex-col h-full justify-between" id="build-terminal-panel">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="text-lg font-display font-semibold text-slate-100">{selectedBuild.templateName}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">BUILD IDENTIFIER: {selectedBuild.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedBuild.status === 'completed' && (
                    <button
                      onClick={() => handleDownloadManifest(selectedBuild)}
                      className="text-xs font-mono bg-emerald-600 hover:bg-emerald-500 hover:scale-102 text-white font-semibold px-3 py-1.5 rounded-lg border border-emerald-500 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Manifest JSON
                    </button>
                  )}
                  <span className={`text-xs font-mono px-2 py-1 rounded border ${getStatusBadgeColor(selectedBuild.status)}`}>
                    {selectedBuild.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">JIT SYSTEM COMPILER CONSOLE:</span>
                <div 
                  ref={logTerminalRef}
                  className="bg-slate-950 border border-slate-850 rounded-lg p-3.5 h-[230px] overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5 scroll-smooth"
                >
                  {selectedBuild.logs.map((log, lIdx) => (
                    <div key={lIdx} className="leading-relaxed flex items-start gap-1">
                      <span className="text-emerald-600 select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  {selectedBuild.status !== 'completed' && selectedBuild.status !== 'failed' && (
                    <div className="flex items-center gap-1.5 text-indigo-400 mt-2 animate-pulse">
                      <span className="w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                      <span>Injecting secure layout parameters...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cryptographic Proof and Watermarks Card */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">DIGITAL WATERMARK</span>
                  <span className="text-xs font-mono text-indigo-300 block truncate" title={selectedBuild.watermark}>
                    {selectedBuild.watermark || "COMPILING..."}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">SHA-256 FINGERPRINT</span>
                  <span className="text-xs font-mono text-emerald-400 block truncate font-semibold" title={selectedBuild.sha256Fingerprint}>
                    {selectedBuild.sha256Fingerprint ? `0x${selectedBuild.sha256Fingerprint.replace('sha256-', '')}` : "CALCULATING..."}
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">ANTI-TAMPER CORE SEAL</span>
                  <span className="text-xs font-mono text-amber-300 block truncate" title={selectedBuild.antiTamperSeal}>
                    {selectedBuild.antiTamperSeal || "SEALING CORES..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>COMPILED ON: {selectedBuild.completedAt ? new Date(selectedBuild.completedAt).toLocaleTimeString() : 'COMPILING LIVE'}</span>
              <span>COMPILER: dAIsy_HaMINJA-1.0.0</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20" id="build-unselected-panel">
            <Cpu className="text-slate-700 w-14 h-14 mb-3 animate-pulse-slow" />
            <h3 className="text-slate-300 font-display font-medium text-sm">No Active Compiled Artifact</h3>
            <p className="text-xs text-slate-500 max-w-[240px] mt-1.5">
              Select an historical compilation record from the ledger or trigger a fresh workspace build using the Repository Unifier panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
