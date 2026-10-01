import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Stamp, Wordmark } from "@/components/brand";
import { PageShell } from "@/components/nav";
import { ParaiStrip } from "@/components/parai";
import { SessionScan } from "@/components/session-scan";
import { Button } from "@/components/ui/button";
import { StateChip } from "@/components/ui/badge";
import { products } from "@/lib/catalog";
import { formatUsd } from "@/lib/utils";
import { manifest } from "@/lib/proofs";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const featured = products.filter((p) => p.evidence === "VERIFIED").slice(0, 4);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 scan-grid opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-stamp/80 scan-sweep" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_0.8fr] md:py-20">
          <div>
            <p className="rise-in font-mono text-3xs uppercase tracking-mark text-muted">
              uarefake.com · storefront
            </p>
            <h1 className="rise-in mt-5 display-mega font-display font-extrabold text-fg">
              YOU
              <br />
              ARE
              <br />
              <span className="relative inline-block">
                FAKE
                <Stamp className="absolute -right-4 -top-3 text-3xs sm:right-0 sm:translate-x-1/2 sm:text-sm">
                  Until proven
                </Stamp>
              </span>
            </h1>
            <p className="rise-in mt-8 max-w-md text-base leading-relaxed text-muted">
              Authenticity infrastructure for a synthetic world. Daisy Haminja
              reasons. DFRL verifies. MMTAI executes. Solvex records. Humans
              remain the root of trust.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/store">
                  Enter storefront <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/registry">Open AI registry</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/space">uarefake.space</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <SessionScan />
            <div className="rounded-xl bg-surface p-5 hairline">
              <p className="font-mono text-2xs uppercase tracking-mark text-muted">
                Recorded verification
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm tabular-nums">
                <li>
                  <p className="text-muted text-3xs">DFRL operators</p>
                  <p className="text-lg font-medium">
                    {manifest.dfrl.unsat}/{manifest.dfrl.total} UNSAT
                  </p>
                </li>
                <li>
                  <p className="text-muted text-3xs">Daisy nodes</p>
                  <p className="text-lg font-medium">
                    {manifest.daisyNodes.executed}/{manifest.daisyNodes.total}
                  </p>
                </li>
                <li>
                  <p className="text-muted text-3xs">Invariants</p>
                  <p className="text-lg font-medium">
                    {manifest.invariants.passed}/{manifest.invariants.total}
                  </p>
                </li>
                <li>
                  <p className="text-muted text-3xs">Claim scope</p>
                  <p className="text-xs leading-snug">{manifest.claimScope}</p>
                </li>
              </ul>
              <p className="mt-4 text-3xs text-muted">
                These results are machine-executed for the specified operator
                set. They are not a universal proof of every component.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-px bg-line md:grid-cols-3">
          {[
            {
              to: "/store" as const,
              kicker: "uarefake.com",
              title: "Storefront",
              body: "Verified solutions only. Unverified goods never go live. Entitlement is not execution.",
            },
            {
              to: "/registry" as const,
              kicker: "registry",
              title: "AI Registry",
              body: "Every intelligence has a signed cell, a human owner, and a verification state you can inspect.",
            },
            {
              to: "/space" as const,
              kicker: "uarefake.space",
              title: "Controlboard",
              body: "Propose. Authorize. Execute. Observe. Reverse. Daisy never acts merely because she can.",
            },
          ].map((card) => (
            <Link
              key={card.title}
              to={card.to}
              className="group bg-bg p-6 transition-colors duration-150 hover:bg-surface md:p-8"
            >
              <p className="font-mono text-2xs uppercase tracking-mark text-muted">
                {card.kicker}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
                {card.title}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                {card.body}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-kicker text-fg">
                Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-2xs uppercase tracking-mark text-muted">
              Verified marketplace
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Nothing for sale that cannot prove it.
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/store">Full catalog</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {featured.map((p) => (
            <Link
              key={p.sku}
              to="/store/$sku"
              params={{ sku: p.sku }}
              className="flex flex-col rounded-xl bg-surface p-5 hairline hairline-hover transition-[box-shadow] duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
                  {p.solutionId}
                </p>
                <StateChip state={p.evidence} />
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                {p.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">{p.short}</p>
              <p className="mt-4 font-mono text-sm tabular-nums">
                {formatUsd(p.priceCents)}
                {p.cadence === "seat" ? " / seat" : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-2xs uppercase tracking-mark text-muted">
                PARAI cycle
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
                Beyond input → reason → act.
              </h2>
            </div>
            <Wordmark />
          </div>
          <ParaiStrip />
        </div>
      </section>
    </PageShell>
  );
}
