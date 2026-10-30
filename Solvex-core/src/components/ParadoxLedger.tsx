/**
 * Read-only projection of commit-bound formal verification artifacts.
 * This panel never manufactures a contract, count, solver result, or activation claim.
 */
import React, { useEffect, useState } from 'react';
import { Database, Shield, AlertTriangle, Search, FileCode, RefreshCw } from 'lucide-react';

interface ProofStatus {
  status: 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE';
  source_commit_sha?: string | null;
  runtime_commit_sha?: string | null;
  commit_bound?: boolean;
  corpus_verified?: boolean;
  corpus?: {
    required: number;
    executed: number;
    expected_matches: number;
    replays: number;
    replay_matches: number;
    distribution?: { unsat?: number; sat?: number; unknown?: number; error?: number } | null;
  };
  activation?: {
    status: string;
    gates?: {
      total: number;
      passed: number;
      blocked: number;
      external_provider_required: number;
      failed: number;
      verdict: string;
    };
  };
  generated_at?: string | null;
  message?: string;
  code?: string;
}

export default function ParadoxLedger() {
  const [proof, setProof] = useState<ProofStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/proof-status', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        const payload = await response.json().catch(() => null) as ProofStatus | null;
        if (!payload || typeof payload.status !== 'string') {
          throw new Error('The proof endpoint returned an invalid response.');
        }
        if (!response.ok && payload.status !== 'UNAVAILABLE') {
          throw new Error(payload.message || 'The proof endpoint could not verify the artifact set.');
        }
        setProof(payload);
        if (payload.status === 'UNAVAILABLE') setError(payload.message || 'Authoritative artifacts are not available.');
      } catch (err) {
        if (!controller.signal.aborted) {
          setProof(null);
          setError(err instanceof Error ? err.message : 'Proof status could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const verified = proof?.status === 'VERIFIED' && proof.commit_bound === true && proof.corpus_verified === true;
  const badge = loading ? 'LOADING' : verified ? 'COMMIT-BOUND' : proof?.status || 'UNAVAILABLE';

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6 glow-border" id="paradox_ledger_module">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800"><Database className="h-5 w-5 text-cyan-400" /></div>
          <div>
            <h2 className="font-display font-medium text-lg text-white">Paradox Ledger</h2>
            <p className="text-xs text-neutral-400 mt-1 font-sans">Read-only view · authoritative artifact binding</p>
          </div>
        </div>
        <span className={`text-[10px] font-mono border px-2 py-1 rounded ${verified ? 'text-emerald-300 border-emerald-900/60 bg-emerald-950/30' : 'text-amber-300 border-amber-900/60 bg-amber-950/30'}`}>
          {badge}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><FileCode className="h-4 w-4" /> Formal corpus</div>
          {loading ? (
            <p className="text-sm text-neutral-400 mt-2">Loading current evidence…</p>
          ) : proof?.corpus ? (
            <>
              <p className={`text-sm mt-2 ${proof.corpus_verified ? 'text-emerald-300' : 'text-amber-300'}`}>
                {proof.corpus.executed} / {proof.corpus.required} executed · {proof.corpus.expected_matches} expected matches
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Replays {proof.corpus.replay_matches} / {proof.corpus.replays} · UNSAT {proof.corpus.distribution?.unsat ?? '—'} · SAT {proof.corpus.distribution?.sat ?? '—'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Unknown {proof.corpus.distribution?.unknown ?? '—'} · errors {proof.corpus.distribution?.error ?? '—'}
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-300 mt-2">Evidence not loaded</p>
          )}
        </div>

        <div className="border border-neutral-900 bg-black/40 rounded p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><Search className="h-4 w-4" /> Activation boundary</div>
          <p className="text-sm text-amber-300 mt-2">{proof?.activation?.status || (loading ? 'Loading…' : 'Not available')}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {proof?.activation?.gates
              ? `${proof.activation.gates.passed} / ${proof.activation.gates.total} gates passed · ${proof.activation.gates.blocked} blocked · ${proof.activation.gates.external_provider_required} provider-required`
              : 'No gate result is asserted without current artifacts.'}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {proof?.activation?.gates ? `Verdict: ${proof.activation.gates.verdict}; failures: ${proof.activation.gates.failed}` : ''}
          </p>
        </div>
      </div>

      <div className="border border-neutral-900 bg-black/40 rounded p-4">
        <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase"><Shield className="h-4 w-4" /> Source provenance</div>
        <p className="text-xs text-neutral-400 mt-2">Evidence commit</p>
        <p className="text-xs font-mono text-white break-all">{proof?.source_commit_sha || 'Not bound'}</p>
        <p className="text-xs text-neutral-400 mt-2">Runtime commit</p>
        <p className="text-xs font-mono text-white break-all">{proof?.runtime_commit_sha || 'Not configured'}</p>
        <p className={`text-xs mt-2 ${proof?.commit_bound ? 'text-emerald-300' : 'text-amber-300'}`}>
          {proof?.commit_bound ? 'Artifact source matches the configured runtime commit.' : 'The artifacts are not proven to belong to this running build.'}
        </p>
      </div>

      <div role="status" aria-live="polite" className="rounded border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100 flex gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <strong className="font-mono text-xs uppercase">{verified ? 'PROOF-BEFORE-POWER · EVIDENCE VERIFIED' : 'PROOF-BEFORE-POWER · NOT VERIFIED'}</strong>
          <p className="mt-2 text-xs text-amber-100/80">
            {error || (verified
              ? 'This is a read-only projection of fresh artifacts bound to the running commit. Activation status is reported separately and is not overridden by corpus success.'
              : 'A matching runtime commit and complete fresh artifacts are required before any proof result is presented as verified.')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 border-t border-neutral-900 pt-4">
        <RefreshCw className="h-4 w-4" />
        {proof?.generated_at ? `Artifact timestamp: ${proof.generated_at}` : 'No current artifact timestamp'}
      </div>
    </div>
  );
}
