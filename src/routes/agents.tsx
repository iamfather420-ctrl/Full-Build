import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Lifecycle } from "@/lib/lifecycle";

const GOLD = "#D4AF37";
const BG = "#05080F";
const PANEL = "#0A0F1A";
const FG = "#E0E0E0";
const MUTED = "#6B7280";
const BORDER = "#1A2235";
const MONO = '"IBM Plex Mono", "Courier New", monospace';

const FAMILIES = [
  { name: "A2A", note: "Agent card, then a structured request. The executor does not run until the gate allows it." },
  { name: "RAG", note: "A retrieval agent may propose a lookup. It cannot write a record by itself." },
  { name: "MCP tools", note: "A tool call is a proposal. Permission is checked again at run time." },
  { name: "Multi-agent", note: "One agent may ask another. Neither can authorize medium or high work." },
];

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Propose through the gate" },
      { name: "description", content: "Tutorial agents propose. The lifecycle gate decides before a tool runs." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const [state, setState] = useState("IDLE");
  const [note, setNote] = useState("Daisy can propose a tool call. She cannot run it.");

  function propose() {
    const life = new Lifecycle();
    life.grant("owner", "accounts", "suspend");
    life.setTool("accounts", false, "production credentials missing");
    const task = life.propose(
      { id: "daisy-haminja", kind: "partner" },
      "owner",
      "A2A agent requests a production update",
      "accounts",
      "suspend",
      "HIGH",
    );
    try {
      life.authorize(task.id, { id: "daisy-haminja", kind: "partner" });
      setState("AUTHORIZED");
      setNote("This path should not succeed.");
    } catch (error) {
      setState(task.state);
      setNote(error instanceof Error ? error.message : "denied");
    }
  }

  return (
    <DashboardLayout>
      <div style={{ background: BG, color: FG, minHeight: "100%", padding: 24, fontFamily: MONO }}>
        <p style={{ color: GOLD, letterSpacing: "0.16em", fontSize: 12 }}>AGENT TUTORIALS</p>
        <h1 style={{ fontSize: 32, margin: "8px 0 6px" }}>Agents propose. The gate decides.</h1>
        <p style={{ color: MUTED, maxWidth: 760 }}>
          The attached catalog covers A2A, retrieval, tool calls, and multi-agent work. On this app those patterns stop at a proposal. A partner cannot authorize high-risk work, and a missing tool stays blocked.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          {FAMILIES.map((family) => (
            <section key={family.name} style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
              <strong style={{ color: GOLD }}>{family.name}</strong>
              <p>{family.note}</p>
            </section>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, margin: "18px 0" }}>
          <button onClick={propose}>Daisy proposes an A2A tool call</button>
          <Link to="/lifecycle">Open lifecycle gate</Link>
        </div>

        <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
          <strong style={{ color: GOLD }}>{state}</strong>
          <p>{note}</p>
        </section>
      </div>
    </DashboardLayout>
  );
}
