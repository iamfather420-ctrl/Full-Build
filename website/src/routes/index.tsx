import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleDot,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Orbit,
  Play,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { Stamp, Wordmark } from "@/components/brand";
import { PageShell } from "@/components/nav";
import { ParaiStrip } from "@/components/parai";
import { SessionScan } from "@/components/session-scan";
import { Button } from "@/components/ui/button";
import { Badge, StateChip } from "@/components/ui/badge";
import { products } from "@/lib/catalog";
import { nodes, manifest, paraiStages } from "@/lib/proofs";
import { formatUsd } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

type Lens = "SEE" | "PROVE" | "ACT";

const lenses: Record<Lens, { eyebrow: string; title: string; copy: string; icon: typeof BrainCircuit; accent: string }> = {
  SEE: {
    eyebrow: "DAISY / COGNITION",
    title: "See the shape of the problem.",
    copy: "Daisy maps ambiguity into a bounded problem space before she proposes a single move. Context first. Confidence second.",
    icon: BrainCircuit,
    accent: "text-cyan-300",
  },
  PROVE: {
    eyebrow: "SOLVEX / PROOF PLANE",
    title: "Turn belief into an obligation.",
    copy: "A candidate is not a solution until its assumptions, tests, replay, and evidence can survive inspection. Unsupported claims stop here.",
    icon: ShieldCheck,
    accent: "text-lime-300",
  },
  ACT: {
    eyebrow: "UAREFAKE / CONTROL PLANE",
    title: "Make only authorized change.",
    copy: "Capability never implies authority. MMTAI executes scoped operations with a checkpoint, a recovery plan, and a visible receipt.",
    icon: LockKeyhole,
    accent: "text-amber-300",
  },
};

function Home() {
  const [lens, setLens] = useState<Lens>("SEE");
  const [selectedNode, setSelectedNode] = useState(nodes[0].id);
  const featured = products.filter((p) => p.evidence === "VERIFIED").slice(0, 4);
  const activeLens = lenses[lens];
  const LensIcon = activeLens.icon;
  const activeNode = nodes.find((node) => node.id === selectedNode) ?? nodes[0];
  const signalRows = useMemo(
    () => [
      { label: "Daisy nodes", value: `${manifest.daisyNodes.executed}/${manifest.daisyNodes.total}`, tone: "LIVE" },
      { label: "DFRL operators", value: `${manifest.dfrl.unsat}/${manifest.dfrl.total}`, tone: "UNSAT" },
      { label: "Tenant tables", value: `${manifest.persistence.tables}`, tone: "SEALED" },
      { label: "External gateways", value: "2", tone: "BOUNDARY" },
    ],
    [],
  );

  const jumpToProof = () => document.getElementById("proof-cockpit")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden border-b border-line bg-[#0b1014]">
        <div className="pointer-events-none absolute inset-0 cockpit-grid opacity-70" />
        <div className="pointer-events-none absolute -right-40 top-20 size-[34rem] rounded-full border border-cyan-300/10 shadow-[0_0_140px_rgba(71,210,255,0.08)]" />
        <div className="pointer-events-none absolute -right-12 top-48 size-[21rem] rounded-full border border-lime-300/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-300/80 scan-sweep" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-16 md:grid-cols-[0.92fr_1.08fr] md:px-8 md:pb-24 md:pt-24">
          <div className="flex flex-col justify-center">
            <div className="rise-in flex items-center gap-3 font-mono text-3xs uppercase tracking-mark text-cyan-200/70">
              <span className="live-dot size-1.5 rounded-full bg-lime-300" />
              UAREFAKE / SOLVEX CONTROL SURFACE
            </div>
            <h1 className="rise-in mt-7 max-w-3xl font-display text-[clamp(3.8rem,10vw,8.8rem)] font-extrabold leading-[0.82] tracking-[-0.07em] text-fg">
              Make the
              <br />
              <span className="text-cyan-200">unknown</span>
              <br />
              inspectable.
            </h1>
            <p className="rise-in mt-8 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              UAREFAKE is the public edge of a deeper machine: Daisy reasons, Solvex verifies, and the control plane decides what is allowed to become real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={jumpToProof} size="lg">
                Enter the proof cockpit <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="subtle" size="lg">
                <Link to="/demo">Run the judge demo <Play className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/registry">Inspect the registry</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-2xs uppercase tracking-kicker text-muted">
              <span className="inline-flex items-center gap-2"><Fingerprint className="size-3 text-lime-300" /> human root of trust</span>
              <span className="inline-flex items-center gap-2"><ScanLine className="size-3 text-cyan-300" /> evidence before claims</span>
            </div>
          </div>

          <div className="relative min-h-[31rem] md:min-h-[37rem]">
            <div className="absolute inset-4 rounded-full border border-cyan-100/10 md:inset-10" />
            <div className="absolute inset-16 rounded-full border border-cyan-100/10 border-dashed md:inset-24 orbit-spin" />
            <div className="absolute inset-[26%] rounded-full border border-lime-200/20 bg-[#111a20]/80 shadow-[0_0_100px_rgba(91,216,255,0.08)] backdrop-blur-sm">
              <div className="absolute inset-3 rounded-full border border-lime-200/10" />
              <div className="relative flex h-full flex-col items-center justify-center px-7 text-center">
                <div className="grid size-16 place-items-center rounded-2xl border border-cyan-200/30 bg-cyan-200/10 text-cyan-200 shadow-[0_0_40px_rgba(91,216,255,0.18)]">
                  <Orbit className="size-8" />
                </div>
                <p className="mt-5 font-mono text-3xs uppercase tracking-mark text-cyan-200/70">signal / {activeNode.id}</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">{activeNode.name}</h2>
                <p className="mt-2 max-w-[15rem] text-xs leading-relaxed text-muted">{activeNode.plane} plane · {Math.round(activeNode.load * 100)}% current load</p>
                <div className="mt-5 flex items-center gap-2 font-mono text-2xs uppercase tracking-kicker text-lime-300"><span className="live-dot size-1.5 rounded-full bg-lime-300" /> reachable / live</div>
              </div>
            </div>
            {nodes.map((node, index) => {
              const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 43;
              const y = 50 + Math.sin(angle) * 43;
              const selected = node.id === selectedNode;
              return (
                <button
                  key={node.id}
                  type="button"
                  aria-label={`Inspect ${node.name}`}
                  onClick={() => setSelectedNode(node.id)}
                  className={`node-pin absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-2xs font-mono transition-all ${selected ? "scale-125 border-lime-200 bg-lime-200 text-[#0b1014] shadow-[0_0_28px_rgba(190,242,100,0.45)]" : "border-cyan-200/30 bg-[#10181d] text-cyan-100/70 hover:scale-110 hover:border-cyan-100"}`}
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 120}ms` }}
                >
                  {node.id.replace("N-", "")}
                </button>
              );
            })}
            <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
              {signalRows.map((row) => (
                <div key={row.label} className="bg-[#10171c]/95 px-3 py-3 backdrop-blur-sm">
                  <p className="font-mono text-3xs uppercase tracking-kicker text-muted">{row.label}</p>
                  <div className="mt-1 flex items-baseline justify-between gap-2"><strong className="font-mono text-sm text-fg">{row.value}</strong><span className="hidden font-mono text-3xs text-lime-300 sm:inline">{row.tone}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="proof-cockpit" className="scroll-mt-20 border-b border-line bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="font-mono text-2xs uppercase tracking-mark text-cyan-200/70">01 / choose a lens</p>
              <h2 className="mt-3 max-w-md font-display text-4xl font-bold tracking-tight md:text-5xl">One machine.<br /><span className="text-muted">Three ways to see it.</span></h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">A public interface for an evidence-gated system. Nothing here asks you to trust a black box. Open the seam. Follow the receipt.</p>
              <div className="mt-8 grid gap-2">
                {(Object.keys(lenses) as Lens[]).map((key) => {
                  const item = lenses[key];
                  const Icon = item.icon;
                  return <button key={key} type="button" onClick={() => setLens(key)} className={`group flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${lens === key ? "border-cyan-200/40 bg-cyan-200/[0.07]" : "border-line bg-surface hover:border-cyan-200/20"}`}><span className={`grid size-10 place-items-center rounded-lg border border-line bg-bg ${lens === key ? item.accent : "text-muted"}`}><Icon className="size-4" /></span><span className="flex-1"><span className="block font-mono text-2xs uppercase tracking-kicker text-muted">{key}</span><span className="mt-1 block font-display text-lg font-semibold">{item.title}</span></span><ArrowRight className={`size-4 transition-transform ${lens === key ? "translate-x-0 text-cyan-200" : "-translate-x-1 text-muted group-hover:translate-x-0"}`} /></button>;
                })}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 md:p-8">
              <div className="pointer-events-none absolute right-0 top-0 size-64 rounded-full bg-cyan-300/[0.04] blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-5"><div><Badge className={activeLens.accent}>{activeLens.eyebrow}</Badge><h3 className="mt-5 max-w-xl font-display text-3xl font-bold tracking-tight md:text-4xl">{activeLens.title}</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{activeLens.copy}</p></div><LensIcon className={`size-8 ${activeLens.accent}`} /></div>
              <div className="relative mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Terminal, label: "input", body: lens === "SEE" ? "ambiguous signal" : lens === "PROVE" ? "formal obligation" : "authorized intent" },
                  { icon: Gauge, label: "state", body: lens === "SEE" ? "context bound" : lens === "PROVE" ? "replay matched" : "checkpoint ready" },
                  { icon: Check, label: "boundary", body: lens === "ACT" ? "reversible only" : lens === "PROVE" ? "evidence linked" : "not a claim" },
                ].map(({ icon: Icon, label, body }) => <div key={label} className="rounded-xl border border-line bg-bg p-4"><Icon className="size-4 text-cyan-200" /><p className="mt-5 font-mono text-2xs uppercase tracking-kicker text-muted">{label}</p><p className="mt-1 font-display text-lg font-semibold">{body}</p></div>)}
              </div>
              <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-kicker text-lime-300"><CircleDot className="size-3" /> no silent execution</div><Link to={lens === "SEE" ? "/space/daisy" : lens === "PROVE" ? "/space/proofs" : "/space/execution"} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-kicker text-fg hover:text-cyan-200">Open this layer <ArrowRight className="size-3.5" /></Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-[#0d1418]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div><p className="font-mono text-2xs uppercase tracking-mark text-lime-200/70">02 / the launch sequence</p><h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">From possibility<br /><span className="text-lime-200">to proof.</span></h2><p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">The experience is not a dashboard pretending everything is green. It is a visible sequence of decisions, with every handoff carrying its own burden of proof.</p><div className="mt-8 flex items-center gap-3"><Button asChild variant="subtle"><Link to="/space">Open controlboard <Workflow className="size-4" /></Link></Button><span className="font-mono text-2xs uppercase tracking-kicker text-muted">PARAI / 12 stages</span></div></div>
          <div className="relative"><div className="absolute bottom-6 left-4 top-6 w-px bg-gradient-to-b from-cyan-300/50 via-lime-300/50 to-transparent" />{paraiStages.slice(0, 6).map((stage, index) => <div key={stage.id} className="group relative flex gap-5 py-3"><div className="z-10 mt-1.5 grid size-2.5 shrink-0 place-items-center rounded-full border border-lime-200/60 bg-[#0d1418]"><span className="size-1 rounded-full bg-lime-200 opacity-0 transition-opacity group-hover:opacity-100" /></div><div className="flex flex-1 items-baseline justify-between gap-4 border-b border-line/70 pb-3"><div><p className="font-mono text-2xs text-cyan-200/70">0{index + 1} / {stage.id}</p><p className="mt-1 font-display text-lg font-semibold">{stage.label}</p></div><p className="hidden max-w-[15rem] text-right text-xs text-muted sm:block">{stage.hint}</p></div></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-2xs uppercase tracking-mark text-muted">03 / the receipt</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Trust is a trail, not a tone.</h2></div><SessionScan /></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-line bg-bg p-4"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">last sealed root</p><p className="mt-3 break-all font-mono text-xs leading-relaxed text-lime-200">{manifest.merkle}</p></div><div className="rounded-xl border border-line bg-bg p-4"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">claim scope</p><p className="mt-3 font-display text-xl font-semibold">{manifest.claimScope}</p></div></div><div className="mt-6 flex flex-wrap gap-2"><StateChip state="VERIFIED" /><StateChip state="PARTIAL" /><StateChip state="EXTERNAL_PROVIDER_REQUIRED" /></div></div>
          <div className="rounded-2xl border border-line bg-bg p-6 md:p-8"><div className="flex items-center gap-3"><Sparkles className="size-4 text-amber-200" /><p className="font-mono text-2xs uppercase tracking-mark text-amber-200/70">human root of trust</p></div><h2 className="mt-5 font-display text-3xl font-bold tracking-tight">The machine can propose. You decide what becomes real.</h2><p className="mt-4 text-sm leading-relaxed text-muted">Explore the registry, inspect the proof bundles, or enter the storefront. UAREFAKE keeps the boundary visible so ambition never has to impersonate certainty.</p><div className="mt-7 grid gap-2"><Link to="/manifesto" className="group flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm hover:border-cyan-200/30"><span>Read the operating doctrine</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link><Link to="/store" className="group flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm hover:border-cyan-200/30"><span>Browse verified solutions</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></div></div>
        </div>
      </section>

      <section className="border-t border-line bg-surface"><div className="mx-auto max-w-7xl px-4 py-16 md:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-2xs uppercase tracking-mark text-muted">Verified marketplace</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Nothing for sale that cannot prove it.</h2></div><Button asChild variant="outline"><Link to="/store">Full catalog</Link></Button></div><div className="mt-8 grid gap-3 sm:grid-cols-2">{featured.map((p) => <Link key={p.sku} to="/store/$sku" params={{ sku: p.sku }} className="flex flex-col rounded-xl bg-bg p-5 hairline hairline-hover transition-[box-shadow] duration-150"><div className="flex items-start justify-between gap-3"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">{p.solutionId}</p><StateChip state={p.evidence} /></div><h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{p.title}</h3><p className="mt-2 flex-1 text-sm text-muted">{p.short}</p><p className="mt-4 font-mono text-sm tabular-nums">{formatUsd(p.priceCents)}{p.cadence === "seat" ? " / seat" : ""}</p></Link>)}</div></div></section>

      <section className="border-t border-line bg-[#11171a]"><div className="mx-auto max-w-7xl px-4 py-16 md:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-2xs uppercase tracking-mark text-muted">PARAI cycle</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Beyond input → reason → act.</h2></div><Wordmark /></div><ParaiStrip /></div></section>
    </PageShell>
  );
}
