import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/nav";
import { StateChip } from "@/components/ui/badge";
import { agents, kindLabel, type AgentKind } from "@/lib/registry";

export const Route = createFileRoute("/registry")({ component: Registry });

const kinds: Array<AgentKind | "ALL"> = [
  "ALL",
  "PARAI",
  "VERIFIER",
  "WORKER",
  "REGISTRAR",
  "SENTINEL",
  "GATEWAY",
];

function Registry() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("ALL");
  const list = useMemo(() => {
    return agents.filter((a) => {
      if (kind !== "ALL" && a.kind !== kind) return false;
      if (!q.trim()) return true;
      const hay = `${a.name} ${a.id} ${a.summary} ${a.owner}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, kind]);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-2xs uppercase tracking-mark text-muted">
          AI registry · public ledger
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Named intelligences. Inspectable states.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          An AI is not real because it talks. It is registered when it has
          identity, a human root, a capability boundary, and a verification
          state that has actually been demonstrated.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, owner, cell"
            className="min-h-11 flex-1 rounded-md bg-surface px-3 text-sm text-fg outline-none hairline placeholder:text-subtle"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={
                kind === k
                  ? "rounded-md bg-fg px-3 py-2 text-3xs uppercase tracking-kicker text-bg"
                  : "rounded-md px-3 py-2 text-3xs uppercase tracking-kicker text-muted hairline"
              }
            >
              {k === "ALL" ? "All" : kindLabel[k]}
            </button>
          ))}
        </div>
        <div className="mt-8 divide-y divide-line rounded-xl bg-surface hairline">
          {list.map((a) => (
            <Link
              key={a.id}
              to="/registry/$id"
              params={{ id: a.id }}
              className="grid gap-2 px-5 py-4 transition-colors hover:bg-elevated md:grid-cols-[1.2fr_0.8fr_auto] md:items-center"
            >
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">
                  {a.name}
                </p>
                <p className="font-mono text-3xs text-muted">{a.id}</p>
              </div>
              <p className="text-sm text-muted">{a.summary}</p>
              <div className="flex items-center gap-2 md:justify-end">
                <span className="font-mono text-2xs uppercase tracking-kicker text-muted">
                  {a.kind}
                </span>
                <StateChip state={a.evidence} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
