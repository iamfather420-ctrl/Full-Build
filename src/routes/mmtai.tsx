import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

const GOLD = "#D4AF37";
const BG = "#05080F";
const PANEL = "#0A0F1A";
const FG = "#E0E0E0";
const MUTED = "#6B7280";
const BORDER = "#1A2235";
const MONO = '"IBM Plex Mono", "Courier New", monospace';

const STAGES = ["REGISTER", "UTILIZE", "BURN"] as const;

export const Route = createFileRoute("/mmtai")({
  head: () => ({
    meta: [
      { title: "MMTAI Sovereign Core" },
      { name: "description", content: "Two tracks. The ledger never sees identity. Burn leaves a receipt, not the data." },
    ],
  }),
  component: MmtaiPage,
});

function MmtaiPage() {
  const [stage, setStage] = useState<(typeof STAGES)[number]>("REGISTER");
  const [burned, setBurned] = useState(false);

  const ledger = burned
    ? "Receipt only. No identity field remains."
    : "Settlement, eligibility proof, timestamp. No personal record.";
  const zeronaut = burned
    ? "Hard logic void. The system reports that the record is not obtainable."
    : "Identity attributes stay on this track. Track A cannot read them.";

  return (
    <DashboardLayout>
      <div style={{ background: BG, color: FG, minHeight: "100%", padding: 24, fontFamily: MONO }}>
        <p style={{ color: GOLD, letterSpacing: "0.16em", fontSize: 12 }}>MMTAI SOVEREIGN CORE</p>
        <h1 style={{ fontSize: 32, margin: "8px 0 6px" }}>Two tracks. Nothing left to retrieve.</h1>
        <p style={{ color: MUTED, maxWidth: 760 }}>
          This is the stated backbone of the AGATE trust. It is a verification path, not a store of personal records. Track A handles the ledger. Track B holds identity. The two do not meet.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
            <strong style={{ color: GOLD }}>Track A · Ledger</strong>
            <p>{ledger}</p>
          </section>
          <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
            <strong style={{ color: GOLD }}>Track B · Zeronaut</strong>
            <p>{zeronaut}</p>
          </section>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "18px 0", flexWrap: "wrap" }}>
          {STAGES.map((item) => (
            <button key={item} onClick={() => setStage(item)} style={{ borderColor: stage === item ? GOLD : BORDER, color: stage === item ? GOLD : FG }}>
              {item}
            </button>
          ))}
          <button
            onClick={() => {
              setStage("BURN");
              setBurned(true);
            }}
          >
            Issue NOPOT receipt
          </button>
        </div>

        <section style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 16 }}>
          <strong style={{ color: GOLD }}>{stage}</strong>
          <p>
            {stage === "REGISTER" && "The asset is tagged and split into five shares. The ledger records the tag, not the person."}
            {stage === "UTILIZE" && "A proof can check a rule, such as eligibility, without putting the raw record on the ledger."}
            {stage === "BURN" && "The shares are overwritten. What remains is a receipt that the burn happened, not the data."}
          </p>
          <p style={{ color: MUTED }}>
            {burned ? "Status 404-Sovereign: the record is not obtainable." : "Burn has not run. The two tracks stay separate either way."}
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
