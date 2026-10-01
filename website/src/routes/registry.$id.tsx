import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/nav";
import { Stamp } from "@/components/brand";
import { StateChip } from "@/components/ui/badge";
import { agentById, kindLabel } from "@/lib/registry";

export const Route = createFileRoute("/registry/$id")({
  component: AgentPage,
});

function AgentPage() {
  const { id } = Route.useParams();
  const agent = agentById(id);
  if (!agent) throw notFound();

  const rows = [
    ["Kind", kindLabel[agent.kind]],
    ["Owner / root", agent.owner],
    ["Cognition / model", agent.model],
    ["Capability", agent.capability],
    ["Authority", agent.authority],
    ["Authorization", agent.authorization],
    ["Reversible", agent.reversible ? "Yes" : "Not established"],
    ["Nodes", String(agent.nodes)],
    ["Last proof", agent.lastProof],
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link
          to="/registry"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-kicker text-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" /> Registry
        </Link>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StateChip state={agent.evidence} />
              <span className="font-mono text-3xs text-muted">{agent.id}</span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              {agent.name}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {agent.summary}
            </p>
            <dl className="mt-8 divide-y divide-line rounded-xl bg-surface hairline">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]"
                >
                  <dt className="font-mono text-2xs uppercase tracking-kicker text-muted">
                    {k}
                  </dt>
                  <dd className="text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <aside className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-elevated p-6 hairline">
              {agent.evidence === "VERIFIED" ? (
                <Stamp tone="ok" className="absolute right-4 top-6 text-3xs">
                  Registered
                </Stamp>
              ) : (
                <Stamp className="absolute right-4 top-6 text-3xs">
                  {agent.evidence}
                </Stamp>
              )}
              <p className="font-mono text-2xs uppercase tracking-mark text-muted">
                Signed cell header
              </p>
              <p className="mt-4 break-all font-mono text-xs leading-relaxed text-fg">
                {agent.signedCell}
              </p>
              <p className="mt-4 text-3xs text-muted">
                A signed header is evidence of signing only insofar as keys,
                verification, and deployment are actually correct.
              </p>
            </div>
            <div className="rounded-xl bg-surface p-5 hairline">
              <p className="font-mono text-2xs uppercase tracking-mark text-muted">
                Separation
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                <li>1. Capability is what it can do.</li>
                <li>2. Authority is what it may possess.</li>
                <li>3. Authorization is this circumstance.</li>
                <li>4. Execution is what actually occurred.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
