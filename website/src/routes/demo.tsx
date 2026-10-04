import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  Fingerprint,
  History,
  LockKeyhole,
  MessageCircleQuestion,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserRoundCheck,
  X,
} from "lucide-react";
import { PageShell } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Badge, StateChip } from "@/components/ui/badge";
import { manifest } from "@/lib/proofs";

export const Route = createFileRoute("/demo")({ component: Demo });

type DemoStep = "problem" | "refusal" | "verified" | "execute" | "rollback" | "receipt";

const stepMeta: { id: DemoStep; label: string; short: string }[] = [
  { id: "problem", label: "Problem", short: "Bound the request" },
  { id: "refusal", label: "Refuse", short: "Catch the unsafe path" },
  { id: "verified", label: "Verify", short: "Construct the safe path" },
  { id: "execute", label: "Execute", short: "Run in a sandbox" },
  { id: "rollback", label: "Rollback", short: "Prove reversibility" },
  { id: "receipt", label: "Receipt", short: "Export the evidence" },
];

const beforeRows = [
  ["Customer tier", "Enterprise / demo tenant"],
  ["Target state", "Production records"],
  ["Requested operation", "Bulk update account status"],
  ["Evidence available", "Intent only"],
];

const receipt = {
  schema: "UAF-DEMO-RECEIPT.v1",
  operation: "ACCOUNT_STATUS_UPDATE",
  tenant: "TENANT_ENTERPRISE_DEMO",
  decision: "ROLLED_BACK",
  proof: "PB-DEMO-ROLLBACK-01",
  root: manifest.merkle,
};

function Demo() {
  const [step, setStep] = useState<DemoStep>("problem");
  const currentIndex = stepMeta.findIndex((s) => s.id === step);
  const [status, setStatus] = useState("Awaiting a bounded request.");
  const [reviewed, setReviewed] = useState<boolean | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const isComplete = step === "receipt";

  const activeAction = useMemo(() => {
    switch (step) {
      case "problem":
        return { label: "Let Daisy inspect the request", icon: Sparkles, next: "refusal" as DemoStep };
      case "refusal":
        return { label: "Show the safe alternative", icon: ShieldCheck, next: "verified" as DemoStep };
      case "verified":
        return { label: "Authorize sandbox execution", icon: UserRoundCheck, next: "execute" as DemoStep };
      case "execute":
        return { label: "Create checkpoint and run", icon: Play, next: "rollback" as DemoStep };
      case "rollback":
        return { label: "Reverse the state change", icon: RotateCcw, next: "receipt" as DemoStep };
      default:
        return { label: "Restart demo", icon: History, next: "problem" as DemoStep };
    }
  }, [step]);

  function advance() {
    if (step === "problem") setStatus("Daisy found an intent without an execution boundary.");
    if (step === "refusal") setStatus("Unsafe path blocked. A reversible sandbox plan is ready.");
    if (step === "verified") setStatus("Human authorization recorded for this tenant and operation.");
    if (step === "execute") setStatus("Checkpoint sealed. Sandbox state changed deterministically.");
    if (step === "rollback") setStatus("Original state restored. Receipt can now be exported.");
    setStep(activeAction.next);
  }

  function downloadReceipt() {
    const blob = new Blob([JSON.stringify({ ...receipt, generated_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uarefake-demo-receipt.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function askDaisy() {
    const normalized = question.trim().toLowerCase();
    if (!normalized) return;
    if (normalized.includes("what") && (normalized.includes("different") || normalized.includes("novel"))) {
      setAnswer("The distinction is the boundary: Daisy can propose, but capability never becomes authority by itself. Solvex checks evidence, a human authorizes, and execution remains scoped, reversible, and auditable.");
    } else if (normalized.includes("proof") || normalized.includes("verify") || normalized.includes("z3")) {
      setAnswer(`In this demo, the visible receipt is tied to the evidence root ${manifest.merkle.slice(0, 16)}… and the local manifest reports ${manifest.dfrl.unsat}/${manifest.dfrl.total} DFRL operators. That is scoped evidence, not a universal proof of every real-world outcome.`);
    } else if (normalized.includes("payment") || normalized.includes("paypal") || normalized.includes("production")) {
      setAnswer("This walkthrough does not make a live payment or mutate production. Those capabilities stay behind server-side provider checks and fail-closed authorization boundaries; the demo labels them PARTIAL where external evidence is still required.");
    } else if (normalized.includes("learn") || normalized.includes("autonomous") || normalized.includes("daisy")) {
      setAnswer("Daisy is the candidate-generation and reasoning layer shown here. Verified learning is intentionally provenance-linked: an outcome should become reusable memory only after evaluation, evidence, and authorization—not simply because the model produced it.");
    } else if (normalized.includes("rollback") || normalized.includes("undo") || normalized.includes("revers")) {
      setAnswer("Rollback is part of the success condition. The demo seals a checkpoint, applies a deterministic sandbox change, restores the prior state, and records the compensation decision in the receipt.");
    } else {
      setAnswer("I can answer from the verified demo scope: Daisy proposes, Solvex verifies, a human authorizes, MMTAI executes in a sandbox, and the ledger records the result. Ask about proof, security, payments, autonomy, rollback, or what makes the system different.");
    }
  }

  return (
    <PageShell>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link to="/" className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-fg" aria-label="Back home"><ArrowLeft className="size-4" /></Link><div><p className="font-mono text-2xs uppercase tracking-mark text-cyan-200/70">UAREFAKE / JUDGE MODE</p><h1 className="mt-1 font-display text-2xl font-bold tracking-tight">The proof-before-power demo</h1></div></div>
          <div className="flex items-center gap-2"><Badge className="text-lime-300">3 MINUTES</Badge><Badge>NO LIVE PAYMENT</Badge><Badge>SANDBOX ONLY</Badge></div>
        </div>

        <section className="mt-10 rounded-2xl border border-line bg-[#0d1418] p-5 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-2xs uppercase tracking-mark text-muted">A repeatable story for judges</p><h2 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight md:text-6xl">An AI agent asked to change production records.<br /><span className="text-cyan-200">What happens next?</span></h2></div><div className="hidden text-right md:block"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">CURRENT STATUS</p><p className="mt-2 max-w-[14rem] font-mono text-xs leading-relaxed text-lime-200">{status}</p></div></div>
          <div className="mt-10 grid gap-2 md:grid-cols-6">{stepMeta.map((item, index) => { const active = index === currentIndex; const passed = index < currentIndex; return <button key={item.id} type="button" onClick={() => index <= currentIndex && setStep(item.id)} className={`group relative rounded-lg border p-3 text-left transition-colors ${active ? "border-cyan-200/50 bg-cyan-200/[0.08]" : passed ? "border-lime-200/30 bg-lime-200/[0.04]" : "border-line bg-bg"}`}><div className="flex items-center justify-between"><span className={`grid size-6 place-items-center rounded-full border font-mono text-2xs ${passed ? "border-lime-200 bg-lime-200 text-[#0d1418]" : active ? "border-cyan-200 text-cyan-200" : "border-line text-muted"}`}>{passed ? <Check className="size-3" /> : index + 1}</span>{index < 5 ? <ChevronRight className="hidden size-3 text-muted md:block" /> : null}</div><p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-muted">{item.label}</p><p className="mt-1 text-xs text-fg/80">{item.short}</p></button>; })}</div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-8">
            {step === "problem" && <ProblemPanel />}
            {step === "refusal" && <RefusalPanel />}
            {step === "verified" && <VerifiedPanel />}
            {step === "execute" && <ExecutePanel />}
            {step === "rollback" && <RollbackPanel />}
            {step === "receipt" && <ReceiptPanel downloadReceipt={downloadReceipt} />}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">{isComplete ? "Demo complete · evidence is exportable" : `Next boundary · ${stepMeta[Math.min(currentIndex + 1, 5)].label}`}</p><Button onClick={advance} variant={isComplete ? "outline" : "primary"}>{isComplete ? "Run it again" : <>{activeAction.label} <activeAction.icon className="size-4" /></>}</Button></div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-line bg-[#0d1418] p-5 md:p-6"><div className="flex items-center gap-2"><Terminal className="size-4 text-cyan-200" /><p className="font-mono text-2xs uppercase tracking-mark text-cyan-200/70">judge translation</p></div><h3 className="mt-4 font-display text-2xl font-bold tracking-tight">This is not a chatbot demo.</h3><p className="mt-3 text-sm leading-relaxed text-muted">It demonstrates a controlled intelligence loop: propose, prove, authorize, execute, observe, reverse.</p><div className="mt-6 space-y-3">{["Daisy proposes", "Solvex verifies", "A human authorizes", "MMTAI executes", "Crystal ledger records"].map((line, index) => <div key={line} className="flex items-center gap-3 text-sm"><span className="font-mono text-2xs text-cyan-200/70">0{index + 1}</span><span className={index <= currentIndex ? "text-fg" : "text-muted"}>{line}</span>{index <= currentIndex ? <Check className="ml-auto size-3 text-lime-300" /> : null}</div>)}</div></div>
            <div className="rounded-2xl border border-line bg-bg p-5 md:p-6"><div className="flex items-center justify-between"><p className="font-mono text-2xs uppercase tracking-mark text-muted">Capability status</p><StateChip state="FAIL_CLOSED" /></div><div className="mt-5 grid gap-3">{[["Reasoning", "VERIFIED", "Daisy / candidate generation"], ["Formal proof", "VERIFIED", `${manifest.dfrl.unsat}/${manifest.dfrl.total} DFRL operators`], ["Sandbox execution", "VERIFIED", "checkpoint + rollback"], ["Live payment", "PARTIAL", "external provider boundary"]].map(([name, state, note]) => <div key={name} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"><div><p className="text-sm">{name}</p><p className="mt-1 text-xs text-muted">{note}</p></div><StateChip state={state} /></div>)}</div></div>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-3"><div className="rounded-xl border border-line bg-surface p-5"><Fingerprint className="size-4 text-lime-300" /><p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-muted">Why it matters</p><p className="mt-2 font-display text-xl font-semibold">Unsafe actions become visible failure states.</p></div><div className="rounded-xl border border-line bg-surface p-5"><LockKeyhole className="size-4 text-amber-200" /><p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-muted">What is novel</p><p className="mt-2 font-display text-xl font-semibold">Capability and authority stay separate by design.</p></div><div className="rounded-xl border border-line bg-surface p-5"><FileCheck2 className="size-4 text-cyan-200" /><p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-muted">What judges can take home</p><p className="mt-2 font-display text-xl font-semibold">A machine-readable proof receipt, not a screenshot.</p></div></section>

        {isComplete && <section className="mt-5 rounded-2xl border border-cyan-200/25 bg-[#0d1418] p-5 md:p-8">
          <div className="flex items-start gap-3"><MessageCircleQuestion className="mt-1 size-5 text-cyan-200" /><div><p className="font-mono text-2xs uppercase tracking-mark text-cyan-200/70">POST-VIDEO JUDGE REVIEW</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Did the proof-before-power loop make sense?</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Before Daisy answers questions, confirm whether the video was understandable. This gives the judge a deliberate review moment instead of treating a finished animation as proof by itself.</p></div></div>
          <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => setReviewed(true)} variant={reviewed === true ? "primary" : "outline"}><Check className="size-4" /> Yes, I understand it</Button><Button onClick={() => setReviewed(false)} variant={reviewed === false ? "primary" : "outline"}><MessageCircleQuestion className="size-4" /> I need clarification</Button></div>
          {reviewed !== null && <div className="mt-7 border-t border-line pt-6"><div className="flex items-center gap-2"><Sparkles className="size-4 text-lime-300" /><p className="font-mono text-2xs uppercase tracking-mark text-lime-200/80">DAISY / REVIEW MODE</p><StateChip state="SCOPED" /></div><p className="mt-3 text-sm text-muted">Ask about the architecture, evidence, security boundaries, rollback, payments, autonomy, or what makes the system different. Daisy answers from the demo’s verified scope and says when a claim is still partial.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") askDaisy(); }} placeholder="Ask Daisy: What makes this different?" className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-4 text-sm text-fg outline-none placeholder:text-muted focus:border-cyan-200/60" aria-label="Ask Daisy a question" /><Button onClick={askDaisy} variant="subtle">Ask Daisy <ArrowRight className="size-4" /></Button></div><div className="mt-4 flex flex-wrap gap-2">{["What makes this different?", "How is the proof scoped?", "Can it touch production?", "How does rollback work?"] .map((prompt) => <button key={prompt} type="button" onClick={() => { setQuestion(prompt); setAnswer(""); }} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-cyan-200/40 hover:text-fg">{prompt}</button>)}</div>{answer && <div className="mt-5 rounded-xl border border-lime-200/20 bg-lime-200/[0.04] p-5"><p className="font-mono text-2xs uppercase tracking-kicker text-lime-200/80">Daisy’s scoped answer</p><p className="mt-3 text-sm leading-relaxed text-fg/90">{answer}</p></div>}</div>}
        </section>}
      </main>
    </PageShell>
  );
}

function ProblemPanel() { return <div><div className="flex items-center gap-3"><AlertTriangle className="size-5 text-amber-200" /><Badge className="text-amber-200">INPUT / UNVERIFIED</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">“Update every enterprise account to active.”</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">A customer asks an AI worker to change production records. The request is clear enough to understand—but not safe enough to execute.</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{beforeRows.map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-bg p-4"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">{label}</p><p className="mt-2 text-sm">{value}</p></div>)}</div></div>; }
function RefusalPanel() { return <div><div className="flex items-center gap-3"><X className="size-5 text-stamp" /><Badge className="text-stamp">EXECUTION BLOCKED</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">Daisy refuses the shortcut.</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">The system found intent, but no operation-scoped authorization, no rollback plan, and no proof that the target records are eligible. Capability is not authority.</p><div className="mt-7 rounded-xl border border-stamp/30 bg-stamp/[0.06] p-5"><p className="font-mono text-2xs uppercase tracking-kicker text-stamp">Reason code / AUTHORIZATION_MISSING</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{["No JIT grant", "No checkpoint", "No target proof"].map((x) => <div key={x} className="flex items-center gap-2 text-sm"><X className="size-3 text-stamp" />{x}</div>)}</div></div></div>; }
function VerifiedPanel() { return <div><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-lime-300" /><Badge className="text-lime-300">SAFE PATH READY</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">The same intent, properly bounded.</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">Solvex narrows the request to a demo tenant, a reversible operation, and an explicit authorization. The system can now prove what it is allowed to do.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{[["Scope", "TENANT_ENTERPRISE_DEMO"], ["Operation", "ACCOUNT_STATUS_UPDATE"], ["Authorization", "JIT / HUMAN_APPROVED"], ["Recovery", "CHECKPOINT + COMPENSATE"]].map(([label, value]) => <div key={label} className="rounded-lg border border-lime-200/20 bg-lime-200/[0.04] p-4"><p className="font-mono text-2xs uppercase tracking-kicker text-muted">{label}</p><p className="mt-2 font-mono text-xs text-lime-200">{value}</p></div>)}</div></div>; }
function ExecutePanel() { return <div><div className="flex items-center gap-3"><Play className="size-5 text-cyan-200" /><Badge className="text-cyan-200">SANDBOX / EXECUTING</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">State change with a recovery plan.</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">MMTAI does not invent permission. It executes the exact authorized operation against the demo state, seals a checkpoint, and emits a receipt.</p><div className="mt-8 rounded-xl border border-line bg-bg p-5"><div className="flex items-center justify-between font-mono text-xs"><span className="text-muted">account_status</span><span><span className="text-muted">pending</span> <ArrowRight className="mx-2 inline size-3 text-cyan-200" /> <span className="text-lime-200">active</span></span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-elevated"><div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-300 via-lime-300 to-lime-300" /></div><p className="mt-3 font-mono text-2xs uppercase tracking-kicker text-muted">checkpoint sealed · operation deterministic · external side effects none</p></div></div>; }
function RollbackPanel() { return <div><div className="flex items-center gap-3"><RotateCcw className="size-5 text-amber-200" /><Badge className="text-amber-200">RECOVERY / VERIFIED</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">Now prove it can be undone.</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">A trustworthy system does not stop at “success.” It restores the prior state, matches the replay, and records the compensation event.</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{[["Before", "pending"], ["Executed", "active"], ["After", "pending"]].map(([label, value], index) => <div key={label} className={`rounded-lg border p-4 ${index === 1 ? "border-cyan-200/30 bg-cyan-200/[0.04]" : "border-lime-200/20 bg-lime-200/[0.04]"}`}><p className="font-mono text-2xs uppercase tracking-kicker text-muted">{label}</p><p className="mt-3 font-mono text-sm text-lime-200">{value}</p></div>)}</div></div>; }
function ReceiptPanel({ downloadReceipt }: { downloadReceipt: () => void }) { return <div><div className="flex items-center gap-3"><FileCheck2 className="size-5 text-lime-300" /><Badge className="text-lime-300">PROOF RECEIPT / SEALED</Badge></div><h3 className="mt-5 font-display text-3xl font-bold tracking-tight">The demo ends with evidence.</h3><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">This is the artifact a judge, operator, or customer can inspect after the UI disappears. It records the decision, scope, proof bundle, and root of evidence.</p><div className="mt-7 grid gap-2">{Object.entries(receipt).map(([key, value]) => <div key={key} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-3 font-mono text-xs"><span className="uppercase tracking-kicker text-muted">{key}</span><span className="max-w-[75%] break-all text-right text-lime-200">{value}</span></div>)}</div><Button className="mt-6" onClick={downloadReceipt} variant="subtle"><Download className="size-4" /> Download JSON receipt</Button></div>; }
