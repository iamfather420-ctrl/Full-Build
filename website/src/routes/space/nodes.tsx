import { createFileRoute } from "@tanstack/react-router";
import { nodes, manifest } from "@/lib/proofs";

export const Route = createFileRoute("/space/nodes")({ component: NodesPage });

export function NodesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Node registry
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        {manifest.daisyNodes.total} Daisy nodes registered, instantiated,
        reachable, executed, output asserted, evidence generated. Decentralization
        is only an architectural property where the deployment actually uses it.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((n) => (
          <article key={n.id} className="rounded-xl bg-surface p-4 hairline">
            <div className="flex items-center justify-between">
              <p className="font-mono text-3xs text-muted">{n.id}</p>
              <span className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-kicker text-ok">
                <span className="size-1.5 rounded-full bg-ok live-dot" />
                {n.health}
              </span>
            </div>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-tight">
              {n.name}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-kicker text-muted">
              {n.plane}
            </p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between font-mono text-2xs text-muted">
                <span>Load</span>
                <span className="tabular-nums">{Math.round(n.load * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full bg-fg"
                  style={{ width: `${Math.round(n.load * 100)}%` }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
