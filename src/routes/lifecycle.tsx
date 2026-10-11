import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Lifecycle, type AuditEntry, type Task } from "@/lib/lifecycle";

const GOLD = "#D4AF37";
const BG = "#05080F";
const PANEL = "#0A0F1A";
const FG = "#E0E0E0";
const MUTED = "#6B7280";
const BORDER = "#1A2235";
const MONO = '"IBM Plex Mono", "Courier New", monospace';

const DAISY = { id: "daisy-haminja", kind: "partner" as const };
const OWNER = { id: "owner", kind: "human" as const };

function fresh() {
  const life = new Lifecycle();
  life.grant("owner", "accounts", "suspend");
  life.setTool("accounts", false, "production credentials missing", true);
  return life;
}

export const Route = createFileRoute("/lifecycle")({
  head: () => ({
    meta: [
      { title: "SolveX Lifecycle — Propose, Authorize, Run" },
      { name: "description", content: "Daisy proposes. A human authorizes. An unavailable tool stays blocked." },
    ],
  }),
  component: LifecyclePage,
});

function LifecyclePage() {
  const [life, setLife] = useState(fresh);
  const [task, setTask] = useState<Task | null>(null);
  const [note, setNote] = useState("Daisy may propose. She cannot authorize medium or high work.");
  const [log, setLog] = useState<AuditEntry[]>([]);

  const states = useMemo(
    () => ["PROPOSED", "REVIEWED", "AUTHORIZED", "RUNNING", "VALIDATING", "COMPLETED", "BLOCKED"],
    [],
  );

  function commit(next: Lifecycle, message: string, current?: Task) {
    setLife(next);
    setTask(current ?? null);
    setNote(message);
    setLog(next.log());
  }

  function propose() {
    const next = fresh();
    const created = next.propose(DAISY, "owner", "Suspend production accounts", "accounts", "suspend", "HIGH");
    commit(next, "Proposed. Proposed is not authorized, and authorized is not completed.", created);
  }

  function tryDaisyAuthorize() {
    if (!task) return;
    try {
      life.authorize(task.id, DAISY);
      commit(life, "This path should not succeed.", life.must(task.id));
    } catch (error) {
      commit(life, error instanceof Error ? error.message : "denied", life.must(task.id));
    }
  }

  function ownerReview() {
    if (!task) return;
    const reviewed = life.review(task.id, OWNER, true);
    commit(life, "Owner reviewed. Daisy still cannot authorize this high-risk task.", reviewed);
  }

  function ownerAuthorize() {
    if (!task) return;
    try {
      const authorized = life.authorize(task.id, OWNER);
      commit(life, "Owner authorized. Run still re-checks the tool before anything happens.", authorized);
    } catch (error) {
      commit(life, error instanceof Error ? error.message : "denied", life.must(task.id));
    }
  }

  function run() {
    if (!task) return;
    const ran = life.run(task.id, OWNER);
    commit(
      life,
      ran.state === "BLOCKED"
        ? "Blocked. Missing production credentials never become a fake success."
        : `Finished in ${ran.state}.`,
      ran,
    );
  }

  return (
    <DashboardLayout>
      <div style={{ background: BG, color: FG, minHeight: "100%", padding: 24, fontFamily: MONO }}>
        <p style={{ color: GOLD, letterSpacing: "0.16em", fontSize: 12 }}>FULL-BUILD LIFECYCLE</p>
        <h1 style={{ fontSize: 32, margin: "8px 0 6px" }}>Propose. Authorize. Then run.</h1>
        <p style={{ color: MUTED, maxWidth: 720 }}>
          Daisy proposes the production update. A partner cannot approve medium or high work. An unavailable tool returns blocked with the real reason.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "18px 0" }}>
          {states.map((state) => (
            <span
              key={state}
              style={{
                border: `1px solid ${task?.state === state ? GOLD : BORDER}`,
                color: task?.state === state ? GOLD : MUTED,
                padding: "6px 10px",
                background: PANEL,
              }}
            >
              {state}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={propose}>Daisy proposes</button>
          <button onClick={ownerReview} disabled={!task}>Owner reviews</button>
          <button onClick={tryDaisyAuthorize} disabled={!task}>Daisy tries to authorize</button>
          <button onClick={ownerAuthorize} disabled={!task}>Owner authorizes</button>
          <button onClick={run} disabled={!task}>Run</button>
        </div>

        <section style={{ marginTop: 18, background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
          <strong style={{ color: GOLD }}>{task?.state ?? "IDLE"}</strong>
          <p>{note}</p>
          <p style={{ color: MUTED }}>
            Audit chain {life.chainOk() ? "holds" : "broken"} · {log.length} entries
          </p>
        </section>

        <pre style={{ whiteSpace: "pre-wrap", color: MUTED, marginTop: 16 }}>
          {log.map((entry) => `${entry.seq} ${entry.actor} ${entry.event} ${entry.to ?? ""}`).join("\n") || "No events yet."}
        </pre>
      </div>
    </DashboardLayout>
  );
}
