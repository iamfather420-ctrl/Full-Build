import { createFileRoute, Link } from "@tanstack/react-router";
import { ParaiStrip } from "@/components/parai";
import { StateChip } from "@/components/ui/badge";
import { agents } from "@/lib/registry";
import { manifest, nodes } from "@/lib/proofs";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/space/")({ component: SpaceHome });

function SpaceHome() {
  const runs = useAppStore((s) => s.runs);
  const orders = useAppStore((s) => s.orders);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "DFRL", v: `${manifest.dfrl.unsat}/${manifest.dfrl.total}`, s: "UNSAT" },
          { k: "Nodes", v: `${manifest.daisyNodes.executed}`, s: "executed" },
          { k: "Invariants", v: `${manifest.invariants.passed}/${manifest.invariants.total}`, s: "passed" },
          { k: "PayPal", v: "CLOSED", s: manifest.gateways.paypal },
        ].map((c) => (
          <div key={c.k} className="rounded-xl bg-surface p-4 hairline">
            <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
              {c.k}
            </p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">
              {c.v}
            </p>
            <p className="mt-1 font-mono text-3xs text-muted">{c.s}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Live PARAI
          </h2>
          <Link to="/space/execution" className="text-xs uppercase tracking-kicker text-muted hover:text-fg">
            Open MMTAI
          </Link>
        </div>
        <ParaiStrip active={runs[0]?.stage} compact />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Recent runs
          </h2>
          {runs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No executions yet. Propose one on the MMTAI track.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {runs.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 hairline"
                >
                  <div>
                    <p className="text-sm">{r.operation}</p>
                    <p className="font-mono text-2xs text-muted">{r.id}</p>
                  </div>
                  <StateChip state={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Registered intelligences
          </h2>
          <ul className="mt-3 space-y-2">
            {agents.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  to="/registry/$id"
                  params={{ id: a.id }}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 hairline hover:bg-elevated"
                >
                  <span className="text-sm">{a.name}</span>
                  <StateChip state={a.evidence} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Node plane
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {nodes.map((n) => (
            <div key={n.id} className="rounded-lg bg-surface p-3 hairline">
              <p className="font-mono text-2xs text-muted">{n.id}</p>
              <p className="mt-1 text-sm">{n.name}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full bg-fg"
                  style={{ width: `${Math.round(n.load * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {orders[0] ? (
        <p className="mt-8 font-mono text-3xs text-muted">
          Last commerce: {orders[0].id} · {orders[0].status}
        </p>
      ) : null}
    </div>
  );
}
