import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { consultDaisy } from "@/lib/daisy";
import { Button } from "@/components/ui/button";
import { ParaiStrip } from "@/components/parai";
import type { ParaiId } from "@/lib/proofs";

export const Route = createFileRoute("/space/daisy")({ component: DaisyPage });

type Msg = { role: "you" | "daisy"; text: string };

const prompts = [
  "Is capability the same as authorization?",
  "Should I execute a payment with PayPal disconnected?",
  "Classify this: a product with INTENDED telemetry sold as VERIFIED.",
];

export function DaisyPage() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ParaiId | undefined>(undefined);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "daisy",
      text: "Daisy Haminja online. Cognition only. I will not execute. Ask a question that needs evidence, not theatre.",
    },
  ]);

  async function ask(prompt: string) {
    const q = prompt.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setMsgs((m) => [...m, { role: "you", text: q }]);
    const cycle: ParaiId[] = ["INPUT", "CONTEXT", "REASON", "FORMALIZE", "VERIFY"];
    for (const s of cycle) {
      setStage(s);
      await new Promise((r) => setTimeout(r, 160));
    }
    try {
      const res = await consultDaisy({ data: { prompt: q } });
      setStage("PROVE");
      if (res.ok) setMsgs((m) => [...m, { role: "daisy", text: res.text }]);
      else
        setMsgs((m) => [
          ...m,
          { role: "daisy", text: `FAIL CLOSED. ${res.error}` },
        ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "daisy", text: "FAIL CLOSED. Cognition transport failed." },
      ]);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Daisy cognition
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Track A only. Daisy proposes. Solvex would still have to authorize.
          Calls are user-initiated and capped.
        </p>
      </div>
      <ParaiStrip active={stage} compact />
      <div className="mt-6 rounded-xl bg-surface p-4 hairline">
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {msgs.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={
                m.role === "you"
                  ? "ml-8 rounded-lg bg-elevated px-3 py-2 text-sm"
                  : "mr-8 rounded-lg bg-bg px-3 py-2 text-sm hairline"
              }
            >
              <p className="font-mono text-2xs uppercase tracking-kicker text-muted">
                {m.role === "you" ? "Operator" : "Daisy"}
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Daisy. Do not ask her to pretend she executed."
            className="min-h-11 flex-1 rounded-md bg-bg px-3 text-sm outline-none hairline placeholder:text-subtle"
            maxLength={1200}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Cycling…" : "Consult"}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              className="rounded-md px-2 py-1 text-left text-3xs text-muted hairline hover:text-fg"
              onClick={() => void ask(p)}
              disabled={busy}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
