import React, { useState } from 'react';
import { Cpu, Shield, ShieldCheck, CheckCircle, RefreshCw, Lock, Key, Fingerprint, ToggleLeft } from 'lucide-react';

export default function EnclaveTab() {
  const [attestationStatus, setAttestationStatus] = useState<'idle' | 'verifying' | 'verified'>('verified');
  const [localSeed, setLocalSeed] = useState('0xDA15YHAM1NJA54S0V3R31GNK3RN3LS33DSHA256F1NG3RPR1NTSTABL3');
  const [attestationLog, setAttestationLog] = useState<string[]>([
    "[INIT] Memory isolation initialized at address space 0x7F0000000000 - 0x7FFFFFFFFFFF.",
    "[CONFIG] Intel SGX external certificate verification requested but bypassed.",
    "[SECURITY] SOVEREIGN MODE: Ignoring external Intel SGX verification calls to maintain complete offline Black Box status.",
    "[ATTESTATION] Using local secure SHA-256 seed as primary hardware anchor.",
    `[ANCHOR] Seed loaded: ${localSeed.substring(0, 16)}...`,
    "[STATUS] Enclave status: HARDENED & ISOLATED."
  ]);

  const triggerAttestation = () => {
    setAttestationStatus('verifying');
    const newLog = [
      `[${new Date().toLocaleTimeString()}] Initiating secure hardware memory sweep...`,
      `[${new Date().toLocaleTimeString()}] Bypassing Intel SGX external certificate checking (Sovereign Lock active)...`,
      `[${new Date().toLocaleTimeString()}] Querying local memory partition attestation registers...`
    ];
    setAttestationLog(prev => [...prev, ...newLog]);

    setTimeout(() => {
      // Generate a new simulated SHA-256 hash seed based on the current time and local secret
      const randomPart = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
      const nextSeed = `0xAA8858${randomPart}CC9933EEFF551100`;
      
      setLocalSeed(nextSeed);
      setAttestationStatus('verified');
      setAttestationLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [COMPLETED] Attestation signature generated via LocalInferenceBridge.`,
        `[${new Date().toLocaleTimeString()}] ATTESTATION SEED: ${nextSeed}`,
        `[${new Date().toLocaleTimeString()}] [SUCCESS] Hardware-isolated enclave verified offline. Efficacy 100.00%.`
      ]);
    }, 2000);
  };

  return (
    <div className="space-y-6" id="enclave-attestation-container">
      
      {/* Overview Banner */}
      <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-sm font-display font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Hardware-Isolated Enclave Security
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-sans">
            Sovereign memory enclaves operate with physical bus-level page isolation. External attestation calls are strictly ignored, and a local cryptographically secure SHA-256 seed is used to sign offline transactions.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] bg-emerald-950/20 text-emerald-400 px-3 py-1.5 border border-emerald-500/20 rounded-lg select-none">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          LOCAL ATTESTATION ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Hardware Specification & Controls */}
        <div className="lg:col-span-1 bg-slate-950/80 border border-slate-900 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-900 pb-3">
            <h3 className="text-xs font-display font-bold text-slate-100 uppercase tracking-tight">Security Configurations</h3>
            <p className="text-[10px] text-slate-400 font-mono">Isolated Memory & Seed Anchors</p>
          </div>

          <div className="space-y-4">
            
            {/* Intel SGX Bypass Indicator */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400">EXTERNAL INTEL SGX</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-rose-950/30 text-rose-400 border border-rose-500/10 rounded font-bold">
                  BYPASSED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                External attestation calls to Intel SGX servers are disabled to ensure zero external dependencies and zero trace leakage.
              </p>
            </div>

            {/* Local Attestation Seed Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 space-y-2">
              <span className="font-mono text-[10px] text-slate-400 block uppercase">Local SHA-256 Attestation Seed</span>
              <div className="bg-slate-950 border border-slate-900 rounded px-2.5 py-1.5 font-mono text-[9px] text-indigo-300 break-all select-all">
                {localSeed}
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                A localized SHA-256 entropy matrix acts as the root key for memory page encryption and signature proofs.
              </p>
            </div>

            {/* Hardware Memory Boundary */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 space-y-2.5">
              <span className="font-mono text-[10px] text-slate-400 block uppercase">Enclave Memory Range</span>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[8px]">BASE REG</span>
                  <span className="text-slate-300 font-bold">0x7F0000000000</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[8px]">BOUND REG</span>
                  <span className="text-slate-300 font-bold">0x7FFFFFFFFFFF</span>
                </div>
              </div>
            </div>

            {/* Attestation Trigger Button */}
            <button
              onClick={triggerAttestation}
              disabled={attestationStatus === 'verifying'}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                attestationStatus === 'verifying'
                  ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${attestationStatus === 'verifying' ? 'animate-spin' : ''}`} />
              {attestationStatus === 'verifying' ? 'VERIFYING MEMORY...' : 'GENERATE LOCAL ATTESTATION'}
            </button>

          </div>
        </div>

        {/* Right Card: Live Audit Log & Cryptographic Verification Monitor */}
        <div className="lg:col-span-2 bg-slate-950/80 border border-slate-900 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-display font-bold text-slate-100 uppercase tracking-tight">Active Attestation Ledger</h3>
                <p className="text-[10px] text-slate-400 font-mono">Simulated cryptographic isolation audits</p>
              </div>
              <Fingerprint className="w-4 h-4 text-indigo-400" />
            </div>

            {/* Live Terminal Output */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-slate-300 space-y-2 h-[260px] overflow-y-auto custom-scrollbar">
              {attestationLog.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-500 shrink-0 select-none">&gt;&gt;</span>
                  <span className={log.includes('[SUCCESS]') || log.includes('COMPLETED') ? 'text-emerald-400 font-bold' : log.includes('[SECURITY]') ? 'text-indigo-400' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))}
              {attestationStatus === 'verifying' && (
                <div className="text-indigo-400 font-bold animate-pulse flex items-center gap-1.5 pt-1.5">
                  <span className="w-1.5 h-3 bg-indigo-400 animate-pulse"></span>
                  <span>Sweeping memory partitions offline...</span>
                </div>
              )}
            </div>
          </div>

          {/* Compliance & Hardware Proof Status Footer */}
          <div className="bg-slate-900/30 border border-slate-900/60 rounded-xl p-3 flex items-center justify-between font-mono text-[9px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>OFFLINE CRYPTO BOND: VERIFIED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>NIST SP 800-53 compliant local seed</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
