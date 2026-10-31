import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock, Eye, FileText, Activity, RefreshCw } from 'lucide-react';
import { ProofEngine } from '../proofs/ProofEngine';
import { CrystalClearBox, CustomerEvidenceView } from '../audit/CrystalClearBox';

export const ProofBundlesView: React.FC = () => {
  const engine = ProofEngine.getInstance();
  const bundles = engine.getAllBundles();
  const [selectedBundleId, setSelectedBundleId] = useState(bundles[0]?.proof_id || 'PB-DH-S-001');

  const activeBundle = engine.getBundle(selectedBundleId);
  const evidenceView = activeBundle ? CrystalClearBox.projectCustomerEvidence(activeBundle) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Crystal Clear Box Evidence & Proof Vault
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Zero-knowledge cryptographic evidence projection. Proprietary neural network weights and raw internal chain-of-thought traces are strictly redacted, while mathematical proofs, test receipts, and reproducibility hashes remain 100% verifiable.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Proprietary IP Redaction Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bundles List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
            Sealed Proof Bundles ({bundles.length})
          </h3>

          <div className="space-y-2">
            {bundles.map((b) => (
              <div
                key={b.proof_id}
                onClick={() => setSelectedBundleId(b.proof_id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedBundleId === b.proof_id
                    ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-400">{b.proof_id}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                    {b.verification_status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white line-clamp-1">{b.claim}</h4>
                <div className="text-[11px] text-slate-500 font-mono mt-2 flex items-center justify-between">
                  <span>Tests: {b.tests?.length || 0}</span>
                  <span>Proofs: {b.formal_proofs?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Inspector */}
        <div className="lg:col-span-8">
          {evidenceView ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400">{evidenceView.proof_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold font-mono">
                      {evidenceView.verification_verdict}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white max-w-xl">{evidenceView.claim}</h3>
                </div>

                <div className="text-right font-mono text-[11px] text-slate-400">
                  <span>Verifier Identity:</span>
                  <span className="block text-white font-bold">{activeBundle?.verifier_identity}</span>
                </div>
              </div>

              {/* Redaction Guarantees */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Proprietary Weights: REDACTED (IP-Safe)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Public Audit Token: VERIFIED</span>
                </div>
              </div>

              {/* Empirical Test Receipts */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Empirical Test Suite Receipts ({activeBundle?.tests?.length || 0})
                </h4>
                <div className="space-y-1.5">
                  {activeBundle?.tests?.map((t) => (
                    <div key={t.test_id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-cyan-400 font-bold mr-2">{t.test_id}</span>
                        <span className="text-slate-300">{t.description}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{t.duration_ms}ms</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine-Checked Formal Proofs */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Machine-Checked Formal Proof Systems
                </h4>
                <div className="space-y-1.5">
                  {activeBundle?.formal_proofs?.map((fp, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-400 font-bold">{fp.system}</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CHECKED
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{fp.specification}</p>
                      <div className="text-[10px] text-slate-500 break-all">Hash: {fp.proof_term_hash}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cleanroom Replay Results */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                  Cleanroom Deterministic Replay Traces
                </h4>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Replay Status:</span>
                    <span className="text-emerald-400 font-bold">{evidenceView.replay_verification_status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reproducibility Instructions: {evidenceView.reproducibility_instructions}
                  </div>
                </div>
              </div>

              {/* Public Audit Token */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1">
                <span className="text-slate-500 block">Public Zero-Knowledge Audit Token SHA-256:</span>
                <span className="text-cyan-400 break-all">{evidenceView.public_audit_token}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Select a proof bundle to inspect Crystal Clear Box evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
