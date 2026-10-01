import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceState } from "@/lib/catalog";
import type { ProofStatus } from "@/lib/proofs";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-kicker hairline text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

const evidenceTone: Record<string, string> = {
  VERIFIED: "text-ok",
  PARTIAL: "text-hold",
  INTENDED: "text-muted",
  CLAIM: "text-stamp",
  CLAIM_ONLY: "text-stamp",
  UNKNOWN: "text-subtle",
  FAMILY_VARIANT: "text-hold",
  FAIL: "text-stamp",
  HOLD: "text-hold",
  FAIL_CLOSED: "text-stamp",
  EXECUTED: "text-ok",
  REVERSED: "text-muted",
  CYCLING: "text-fg",
  ORDER_CREATED: "text-fg",
  AUTHORIZATION_HOLD: "text-hold",
  ESCROW_FUNDED: "text-ok",
};

export function StateChip({
  state,
  className,
}: {
  state: EvidenceState | ProofStatus | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-kicker hairline",
        evidenceTone[state] ?? "text-muted",
        className,
      )}
    >
      {String(state).replaceAll("_", " ")}
    </span>
  );
}
