# Native UI build closure (2026-10-27)

## Problem
`Solvex-core/src/App_native.tsx` originally imported modules that were absent from the active tree. Fail-closed components were added to restore resolvable imports.

## Recovery update
Original UI source has now been located in the prior Library archive `solvex-kernel-ui-final8.zip` and historical Full-Build commit `a5ae6a4`. A historical source snapshot is preserved under `recovered-ui-source/solvex-final/` for review. The archived `PaymentGateway.tsx` variant differs from the historical Git blob; the safety review records the observed behavior of the Library archive version.

## Active native components
The active modules remain fail-closed until reviewed replacements are prepared:
- `PaymentGateway`: explicit BLOCKED state; no provider request or transaction success.
- `ParadoxLedger`: informational only; no assertion of fresh formal verification.
- `JitFactory`: no compile/publish path.
- `CommandBar`: sends real requests to `/api/chat`; preserves server BLOCKED responses.
- `NodeGrid` / `GithubUnifier`: re-export existing native implementations.
- `main.tsx`: React entry for `index_native.html`.

## Why the originals are not activated yet
- Historical/archived PaymentGateway variants post to `/api/pay/create`; the Library archive version marks a session active without checking `response.ok`. The historical source also renders transaction references and checkout URLs. Payments remain disabled.
- CommandBar contains autonomous-core/tether status claims and payment-trigger metadata. It must be reconciled with server-authoritative state and cannot authorize purchases.
- ParadoxLedger displays hardcoded efficacy and compliance/security claims as verified. Those are not proof evidence.
- JitFactory uses client-side timers and hardcoded deployment metadata to simulate successful build/deploy completion.

## Constraints
- No PayPal or other payment provider enabled.
- No first-party inference runtime or model weights added.
- No fabricated SAT/UNSAT evidence.
- No production deployment or Neon schema mutation.
- Keep the recovered source as an auditable reference; only activate a reviewed version that replaces simulated success with evidence-backed outcomes or explicit BLOCKED states.
