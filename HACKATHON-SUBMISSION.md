# UAREFAKE / Solvex — Hackathon Submission Guide

## One-line pitch

**UAREFAKE is an evidence-gated control plane for AI actions: Daisy proposes, Solvex proves, humans authorize, and MMTAI executes only bounded, reversible operations.**

## The problem

Most AI agent demos stop at generation. They show that an agent can produce an answer or call a tool, but not whether the action was authorized, reversible, tenant-scoped, or auditable.

That creates a dangerous gap between **what an AI can do** and **what it should be allowed to do**.

## The 3-minute demo

Open `/demo` and follow the six-step sequence:

1. **Problem** — an agent is asked to update production account records.
2. **Refuse** — Daisy blocks the unsafe shortcut because authorization, target proof, and recovery are missing.
3. **Verify** — Solvex narrows the request to a demo tenant, a specific operation, and a reversible recovery plan.
4. **Execute** — a human authorization is recorded and MMTAI changes sandbox state after sealing a checkpoint.
5. **Rollback** — the state is restored and the compensation event is recorded.
6. **Receipt** — the judge downloads a machine-readable JSON proof receipt.

The key moment is the refusal: **the system demonstrates that safe failure is a successful outcome.**

## Why this is different from a chatbot

| Ordinary agent demo | UAREFAKE / Solvex |
| --- | --- |
| Generates a plausible response | Separates hypothesis from evidence |
| Tool access implies action | Capability never implies authority |
| Success is the end of the story | Recovery and audit are part of success |
| Trust is communicated by UI | Trust is represented by receipts and proof state |
| Model output is treated as truth | Claims remain scoped, typed, and fail-closed |

## Architecture

```text
Daisy cognition
  → problem decomposition and candidate solution
Solvex proof plane
  → formalization, replay, evidence, tamper boundaries
Policy / authorization plane
  → tenant, role, scope, reversibility, human approval
MMTAI execution plane
  → deterministic state change with checkpoint and rollback
Crystal Clear ledger
  → receipt, hashes, timestamps, and recovery record
Verified learning
  → only evaluated, provenance-linked outcomes become reusable memory
```

## Technical stack

- React + TanStack Router
- TypeScript
- Vite
- Neon/PostgreSQL persistence path
- PayPal gateway boundary with fail-closed provider handling
- Z3 formal-verification path and deterministic replay evidence
- GitHub Actions production verification workflow
- UAREFAKE public surfaces: storefront, registry, controlboard, and judge demo

## Truth boundary

The product deliberately distinguishes:

- **VERIFIED** — supported by executable evidence in the stated scope.
- **PARTIAL** — code or local evidence exists, but an external provider or production dependency remains.
- **INTENDED** — designed behavior not yet proven in production.
- **CLAIM** — an architectural concept, not a production guarantee.
- **BLOCKED** — the system refuses to promote or execute without required evidence.

The formal-verification counts are scoped to their formalized operator/case sets. They are not a universal proof that every component or real-world outcome is correct.

## What to say on stage

> “We are not trying to make an AI that acts without limits. We are making the boundary between thinking and acting inspectable. In this demo, Daisy is capable of changing records—but she is not authorized to do it. Solvex catches the missing evidence, refuses the unsafe path, proves a bounded alternative, runs it in a sandbox, rolls it back, and leaves a receipt.”

## Roadmap

1. Connect the same receipt contract to live deployment telemetry.
2. Add independent evaluator sign-off for marketplace eligibility.
3. Expand verified learning from a ledger into retrieval-backed policy and pattern memory.
4. Add customer-owned evidence bundles and revocation workflows.
5. Keep all external effects—payments, public outreach, production mutation, and legal/regulated actions—explicitly authorization-gated.

## Submission checklist

- [x] One-click judge demo
- [x] Seeded demo tenant and repeatable scenario
- [x] Unsafe path visibly blocked
- [x] Verified safe path visibly executed
- [x] Before / after / rollback sequence
- [x] Downloadable proof receipt
- [x] Capability status and external-boundary labels
- [x] Clear explanation of differentiation
- [x] Architecture and stack summary
- [x] Limitations and roadmap stated honestly
