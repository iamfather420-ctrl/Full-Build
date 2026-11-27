import React, { useEffect, useState } from "react";
import type { ReadinessReport } from "../readiness/types";

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const ReadinessConsole: React.FC = () => {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>(["scan-only"]);
  const [approve, setApprove] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/readiness/scan");
      if (!response.ok) throw new Error(`Scan HTTP ${response.status}`);
      setReport((await response.json()) as ReadinessReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/readiness/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskIds: selected, approve }),
      });
      if (!response.ok) throw new Error(`Execute HTTP ${response.status}`);
      setReport((await response.json()) as ReadinessReport);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  const needsApproval = (report?.tasks ?? []).filter((task) => selected.includes(task.id)).some((task) => task.requiresApproval);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Production readiness</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Evidence from canonical repositories and the existing weight engine. Path names do not pass checks.
            The transitional GGUF is not retired by this console.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={busy} className="min-h-11 rounded-lg bg-slate-800 px-4 text-sm text-white disabled:opacity-50">
          {busy ? "Working" : "Scan again"}
        </button>
      </div>
      {error ? <p className="rounded-lg border border-rose-800 px-4 py-3 text-sm text-rose-300">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Weighted readiness" value={percent(report?.weightedCompletion ?? 0)} />
        <Metric label="Raw verified" value={percent(report?.rawCompletion ?? 0)} />
        <Metric label="Daisy gates" value={percent(report?.daisyCompletion ?? 0)} />
        <Metric label="Passed / failed / blocked" value={`${report?.counts.passed ?? 0} / ${report?.counts.failed ?? 0} / ${report?.counts.blocked ?? 0}`} />
      </div>
      {report?.acceptance ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(report.acceptance).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <p className="text-xs text-slate-500">{key}</p>
              <p className="mt-1 font-mono text-sm text-slate-100">{String(value)}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold text-white">Completion center</h3>
          <div className="mt-3 space-y-2">
            {(report?.tasks ?? []).map((task) => (
              <label key={task.id} className="flex min-h-11 items-start gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(task.id)}
                  onChange={() => setSelected((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])}
                />
                <span>
                  {task.label}
                  <span className="mt-0.5 block font-mono text-xs text-slate-500">{task.state}{task.destructive ? " · destructive" : ""}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={approve} onChange={() => setApprove((value) => !value)} />
            Approve non-destructive tasks. Migrations, deploys, and GGUF removal stay refused.
          </label>
          <button type="button" disabled={busy || selected.length === 0 || (needsApproval && !approve)} onClick={() => void submit()} className="mt-3 min-h-11 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white disabled:opacity-40">
            Submit approved plan
          </button>
          {report?.execution ? (
            <ul className="mt-4 space-y-2 font-mono text-xs text-slate-400">
              {report.execution.results.map((result) => (
                <li key={result.taskId}>{result.taskId}: {result.state} — {result.detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-semibold text-white">Daisy gates</h3>
            <p className="mt-1 text-xs text-amber-300">Temporary model remains: {report?.temporaryModel.identity ?? "unscanned"}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(report?.daisyGates ?? []).map((gate) => (
                <li key={gate.id} className="border-t border-slate-800 pt-2">
                  <div className="flex justify-between gap-3 text-slate-200"><span>{gate.label}</span><span className="font-mono text-xs">{gate.status}</span></div>
                  <p className="text-xs text-slate-500">{gate.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            <h3 className="font-semibold text-white">Repositories</h3>
            <ul className="mt-3 space-y-2">
              {(report?.repositories ?? []).map((repo) => (
                <li key={repo.id} className="font-mono text-xs">
                  {repo.role} {repo.owner}/{repo.repo} {repo.state} {repo.commitSha ? repo.commitSha.slice(0, 10) : "no-commit"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-semibold text-white">Evidence</h3>
        <ul className="mt-3 space-y-3">
          {(report?.evidence ?? []).slice(0, 20).map((row) => (
            <li key={row.id} className="border-t border-slate-800 pt-2 text-sm">
              <div className="flex justify-between gap-3 font-mono text-xs text-slate-500"><span>{row.id} {row.category}</span><span>{row.status}</span></div>
              <p className="text-slate-300">{row.actual}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl text-white">{value}</p>
    </div>
  );
}
