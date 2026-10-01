import { useState } from "react";
import { Stamp } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { StateChip } from "@/components/ui/badge";

type Verdict = "idle" | "scanning" | "done";

export function SessionScan() {
  const [phase, setPhase] = useState<Verdict>("idle");

  function scan() {
    setPhase("scanning");
    window.setTimeout(() => setPhase("done"), 1400);
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface p-5 hairline">
      {phase === "scanning" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-stamp scan-sweep origin-top" />
      ) : null}
      <p className="font-mono text-2xs uppercase tracking-mark text-muted">
        Session scan
      </p>
      <h3 className="mt-2 font-display text-xl font-bold tracking-tight">
        Prove this session.
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted">
        Information enters as information. Trust status is determined later.
        This scan does not create identity.
      </p>
      <div className="mt-4 min-h-28">
        {phase === "idle" ? (
          <Button onClick={scan}>Run scan</Button>
        ) : null}
        {phase === "scanning" ? (
          <p className="font-mono text-xs uppercase tracking-kicker text-stamp">
            Reading pointer · viewport · clock · no PII
          </p>
        ) : null}
        {phase === "done" ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <dl className="grid gap-1 font-mono text-xs">
              <div className="flex gap-2">
                <dt className="text-muted">Subject</dt>
                <dd>Human session</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Evidence</dt>
                <dd>Pointer + viewport</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Proof</dt>
                <dd>
                  <StateChip state="CLAIM" />
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">NOPOT</dt>
                <dd>Not registered</dd>
              </div>
            </dl>
            <Stamp>Unverified</Stamp>
          </div>
        ) : null}
      </div>
    </div>
  );
}
