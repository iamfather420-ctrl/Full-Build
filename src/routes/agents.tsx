import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DAISY_FUNCTIONS, daisyPropose, type DaisyFunction } from "@/lib/daisy-functions";

const GOLD = "#D4AF37";
const BG = "#05080F";
const PANEL = "#0A0F1A";
const FG = "#E0E0E0";
const MUTED = "#6B7280";
const BORDER = "#1A2235";
const MONO = '"IBM Plex Mono", "Courier New", monospace';

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Daisy functions" },
      { name: "description", content: "Every tutorial family is a Daisy function. The gate decides before it runs." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const [picked, setPicked] = useState<DaisyFunction | null>(null);
  const [state, setState] = useState("IDLE");
  const [note, setNote] = useState("Choose a Daisy function. She proposes. The gate decides.");

  function run(fn: DaisyFunction) {
    const result = daisyPropose(fn);
    setPicked(fn);
    setState(result.state);
    setNote(result.note);
  }

  return (
    <DashboardLayout>
      <div style={{ background: BG, color: FG, minHeight: "100%", padding: 24, fontFamily: MONO }}>
        <p style={{ color: GOLD, letterSpacing: "0.16em", fontSize: 12 }}>DAISY HAMINJA</p>
        <h1 style={{ fontSize: 32, margin: "8px 0 6px" }}>All tutorial families are her functions.</h1>
        <p style={{ color: MUTED, maxWidth: 760 }}>
          A2A, retrieval, the protocol swarm, the Agatel pass, and the Remix draft are Daisy functions. Low-risk sandbox work can finish. Medium and high work still needs a human, and a missing pass or tool stays blocked.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          {DAISY_FUNCTIONS.map((fn) => (
            <button key={fn.id} onClick={() => run(fn)} style={{ textAlign: "left", background: PANEL, border: `1px solid ${picked?.id === fn.id ? GOLD : BORDER}`, color: FG, padding: 16 }}>
              <strong style={{ color: GOLD }}>{fn.family}</strong>
              <div>{fn.name}</div>
              <div style={{ color: MUTED }}>{fn.risk} · {fn.note}</div>
            </button>
          ))}
        </div>

        <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16, marginTop: 18 }}>
          <strong style={{ color: GOLD }}>{state}</strong>
          <p>{note}</p>
          <Link to="/lifecycle">Open lifecycle gate</Link>
        </section>
      </div>
    </DashboardLayout>
  );
}
