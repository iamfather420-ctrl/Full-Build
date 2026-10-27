/**
 * Paradox Ledger — read-only view over the server's persisted verification artifacts.
 * The UI never runs verifiers, invents evidence, or upgrades stale data to proof.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Database, Shield, AlertTriangle, Search, FileCode, RefreshCw, CheckCircle2, XCircle, Clock3 } from 'lucide-react';

type EvidenceSource = {
  available: boolean;
  status: string;
  generated_at?: string | null;
  age_seconds?: number | null;
  source_commit_sha?: string | null;
  runtime_commit_sha?: string | null;
  commit_match?: boolean;
  fresh?: boolean;
};

type LedgerResponse = {
  success: boolean;
  status: 'ACTIVE' | 'BLOCKED';
  reason: string;
  runtime_commit_sha: string | null;
  generated_at: string;
  artifacts_directory: string | null;
  sources: Record<string, EvidenceSource>;
  formal: null | {
    total_z3_executions: number | null;
    expected_result_matches: number | null;
    replay_matches: number | null;
    unsat: number | null;
    sat: number | null;
    unknown: number | null;
    errors: number | null;
    combined_root_sha256: string | null;
    run_evidence_sha256: string | null;
    commit_sha: string | null;
    timestamp: string | null;
    activation_gate: string | null;
  };
  activation: null | {
    status: string;
    reason: string | null;
    corpus: Record<string, number> | null;
    adversarial_verification: Record<string, boolean> | null;
    mandatory_gates: Record<string, number> | null;
    verification_root_sha256: string | null;
    run_evidence_sha256: string | null;
    source_commit_sha: string | null;
    generated_at: string | null;
    gate_exceptions: Array<{ gate_number?: number; gate_id?: string; name?: string; status?: string; details?: unknown }>;
  };
  gates: null | {
    timestamp: string | null;
    total_gates: number | null;
    gates_passed: number | null;
    blocked_count: number | null;
    failed_count: number | null;
    external_provider_required_count: number | null;
    overall_verdict: string;
    non_passed: Array<{ gate_number?: number; gate_id?: string; name?: string; status?: string }>;
  };
  authoritative_pipeline: null | {
    completed_at: string | null;
    commit_sha: string | null;
    gates_total: number | null;
    gates_passed: number | null;
    production_gate_verdict: string;
    production_blockers: string[];
  };
};

const SOURCE_LABELS: Record<string, string> = {
  'daisy-brain-activation-gate.json': 'Daisy activation gate',
  'z3-120-formal-verification-summary.json': '120-case formal summary',
  'system-46-gates.json': '46 mandatory gates',
  'execution-gates.json': 'Authoritative pipeline',
};

function shortHash(value?: string | null) {
  if (!value) return 'Unavailable';
  return value.length > 18 ? value.slice(0, 12) + '…' + value.slice(-6) : value;
}

function formatAge(seconds?: number | null) {
  if (seconds == null) return 'Age unavailable';
  if (seconds < 60) return 'Updated less than a minute ago';
  if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)} min ago`;
  return `Updated ${Math.floor(seconds / 3600)} hr ago`;
}

export default function ParadoxLedger() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/evidence/paradox-ledger', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== 'object' || (payload as any).success !== true) {
        throw new Error('The evidence endpoint did not return a valid response.');
      }
      setData(payload as LedgerResponse);
    } catch {
      setLoadError('Evidence endpoint unavailable. No cached or fabricated proof is displayed.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEvidence(); }, [loadEvidence]);

  const active = data?.status === 'ACTIVE';
  const formal = data?.formal;
  const gates = data?.gates;
  const activation = data?.activation;
  const pipeline = data?.authoritative_pipeline;

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg space-y-6 glow-border" id="paradox_ledger_module">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800"><Database className="h-5 w-5 text-cyan-400" /></div>
          <div>
            <h2 className="font-display font-medium text-lg text-white">Paradox Ledger</h2>
            <p className="text-xs text-neutral-400 mt-1 font-sans">Read-only · persisted artifacts · source-revision bound</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadEvidence()} disabled={loading}
          className="flex items-center gap-2 rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:border-cyan-800 disabled:opacity-50"
          aria-label="Refresh verification evidence">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div role="status" className={`rounded border p-4 text-sm flex gap-3 ${active ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-100' : 'border-amber-900/60 bg-amber-950/20 text-amber-100'}`}>
        {active ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <Shield className="h-4 w-4 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <strong className="font-mono text-xs uppercase">{loading ? 'LOADING EVIDENCE' : active ? 'ACTIVE — EVIDENCE CONTRACT SATISFIED' : 'BLOCKED — NOT VERIFIED FOR THIS REVISION'}</strong>
          <p className="mt-2 text-xs leading-relaxed">{loading ? 'Reading persisted artifacts from the server. No verification result is assumed while loading.' : loadError || data?.reason || 'No evidence result is available.'}</p>
          <p className="mt-2 text-[10px] font-mono break-all text-neutral-400">Runtime commit: {data?.runtime_commit_sha || 'unavailable — cannot bind proof to runtime'}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-300"><FileCode className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-mono uppercase">Evidence source integrity</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data?.sources || {}).map(([name, source]) => (
            <div key={name} className="border border-neutral-900 bg-black/40 rounded p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-neutral-200">{SOURCE_LABELS[name] || name}</p>
                <span className={`text-[9px] font-mono uppercase ${source.status === 'CURRENT' ? 'text-emerald-300' : 'text-amber-300'}`}>{source.status}</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">{source.generated_at || 'No timestamp found'}</p>
              <p className="text-[10px] text-neutral-500 mt-1">{formatAge(source.age_seconds)}</p>
              <p className="text-[10px] font-mono text-neutral-600 mt-1 break-all">Source: {shortHash(source.source_commit_sha)}</p>
            </div>
          ))}
          {!Object.keys(data?.sources || {}).length && !loading && (
            <div className="border border-neutral-900 bg-black/40 rounded p-4 text-xs text-neutral-500">No artifact source metadata was returned.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-300"><Search className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-mono uppercase">Formal corpus</h3></div>
        {formal ? (
          <>
            {!active && <p className="text-[11px] text-amber-300">The following counts are present in the stored artifact but are not certified as current for this runtime revision.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Z3 executions', formal.total_z3_executions],
                ['Expected matches', formal.expected_result_matches],
                ['Replay matches', formal.replay_matches],
                ['UNSAT outcomes', formal.unsat],
                ['SAT outcomes', formal.sat],
                ['Unknown / errors', `${formal.unknown ?? '—'} / ${formal.errors ?? '—'}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-neutral-900 rounded p-3 bg-black/30">
                  <p className="text-[10px] text-neutral-500 uppercase">{label}</p>
                  <p className="text-lg font-mono text-white mt-1">{value ?? 'Unavailable'}</p>
                </div>
              ))}
            </div>
            <div className="border border-neutral-900 rounded p-3 bg-black/30">
              <p className="text-[10px] text-neutral-500 uppercase">Combined corpus root</p>
              <p className="text-[10px] font-mono text-neutral-300 break-all mt-1">{formal.combined_root_sha256 || 'Unavailable'}</p>
              <p className="text-[10px] text-neutral-500 mt-2">Run receipt: <span className="font-mono break-all">{formal.run_evidence_sha256 || 'Unavailable'}</span></p>
              <p className="text-[10px] text-neutral-500 mt-2">Artifact commit: <span className="font-mono">{shortHash(formal.commit_sha)}</span> · {formal.timestamp || 'timestamp unavailable'}</p>
            </div>
          </>
        ) : <p className="text-xs text-neutral-500 border border-neutral-900 rounded p-4">Formal summary artifact is missing or unreadable.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-300"><Shield className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-mono uppercase">Activation and 46-gate closure</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-neutral-900 rounded p-3 bg-black/30">
            <p className="text-[10px] text-neutral-500 uppercase">Activation record</p>
            <p className={`text-sm font-mono mt-1 ${activation?.status === 'ACTIVE' && active ? 'text-emerald-300' : 'text-amber-300'}`}>{active ? activation?.status || 'MISSING' : 'BLOCKED'}</p>
          </div>
          <div className="border border-neutral-900 rounded p-3 bg-black/30">
            <p className="text-[10px] text-neutral-500 uppercase">Gates passed</p>
            <p className="text-sm font-mono text-white mt-1">{gates?.gates_passed ?? '—'} / {gates?.total_gates ?? 46}</p>
          </div>
          <div className="border border-neutral-900 rounded p-3 bg-black/30">
            <p className="text-[10px] text-neutral-500 uppercase">Gate verdict</p>
            <p className="text-sm font-mono text-amber-300 mt-1">{active ? gates?.overall_verdict || 'UNKNOWN' : 'BLOCKED'}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-500">{activation?.reason || 'Activation artifact has not been loaded. The UI does not infer activation from the formal corpus alone.'}</p>
        {gates && gates.non_passed.length > 0 && (
          <div className="border border-amber-900/50 rounded p-3 space-y-2">
            <p className="text-[10px] font-mono text-amber-300 uppercase">Non-passed gates ({gates.non_passed.length})</p>
            {gates.non_passed.map((gate, index) => (
              <div key={gate.gate_id || index} className="flex items-start gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-neutral-300">{gate.gate_id || `Gate ${gate.gate_number ?? '?'}`} — {gate.name || 'Unnamed gate'}: <span className="text-amber-300">{gate.status || 'UNKNOWN'}</span></span>
              </div>
            ))}
          </div>
        )}
        {activation?.gate_exceptions && activation.gate_exceptions.length > 0 && (
          <div className="border border-amber-900/50 rounded p-3 space-y-2">
            <p className="text-[10px] font-mono text-amber-300 uppercase">Activation exceptions</p>
            {activation.gate_exceptions.map((gate, index) => (
              <div key={gate.gate_id || index} className="text-xs text-neutral-300">{gate.gate_id || `Gate ${gate.gate_number ?? '?'}`} — {gate.name || 'Unnamed gate'}: <span className="text-amber-300">{gate.status || 'UNKNOWN'}</span></div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-neutral-900 rounded p-4 bg-black/30 space-y-2">
        <div className="flex items-center gap-2 text-neutral-400"><Clock3 className="h-4 w-4" /><h3 className="text-[10px] font-mono uppercase">Authoritative pipeline</h3></div>
        <p className="text-xs text-neutral-300">Last stored result: {pipeline?.production_gate_verdict || 'Unavailable'}</p>
        <p className="text-[10px] text-neutral-500">Completed: {pipeline?.completed_at || 'No timestamp'}</p>
        {!active && <p className="text-[10px] text-amber-300">Stored pipeline details are informational only until every artifact is fresh and bound to the running source commit.</p>}
        {pipeline?.production_blockers?.length ? (
          <ul className="list-disc pl-5 text-xs text-neutral-400 space-y-1">
            {pipeline.production_blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}
          </ul>
        ) : null}
      </section>

      <div className="flex items-start gap-2 text-[10px] font-mono text-neutral-600 border-t border-neutral-900 pt-4">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        This panel reads persisted artifacts only. It never runs verification, never treats stale data as current, and never activates the OS.
      </div>
    </div>
  );
}
