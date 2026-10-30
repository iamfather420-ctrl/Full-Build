# Native UI build closure (2026-10-27)

## Recovery and integration update
Original source modules were recovered from the Library archive `solvex-kernel-ui-final8.zip` and historical Full-Build commit `a5ae6a4`. The unmodified sources and supporting project files are preserved under `recovered-ui-source/solvex-final/`.

The active native UI now uses a reviewed integration of the original panel layout and visual language while keeping unsafe original behaviors disabled.

## Active component behavior
- `PaymentGateway`: recovered-style provider list and transaction monitor layout; explicitly BLOCKED. Does not call `/api/pay/create`, connect a provider, show a checkout URL, or create a transaction.
- `CommandBar`: recovered-style command console with safe inspection prompts. Sends user prompts to the server chat route. Chat output cannot authorize payments or other operations; payment-trigger metadata from the historical UI is not rendered.
- `ParadoxLedger`: now reads the local `/api/proof-status` endpoint. The server projects only the current formal aggregation, 120-case summary, 46-gate report, and activation artifact. It reports `VERIFIED` only when the artifacts agree on the source commit and that commit matches the configured runtime commit; otherwise it remains `UNVERIFIED` or `UNAVAILABLE`. The panel is read-only and reports activation separately from corpus verification.
- `JitFactory`: recovered-style factory status panel. No timer-based simulated completion, compile, sign, fingerprint, publish, or deployment action is exposed.
- `App_native.tsx`: removed unsupported claims that 54/54 nodes are running, 58 paradoxes are locked, hosting is Cloud Run, or ISO/SOC2 compliance is established. The node count is identified as a catalogue, not execution evidence.

## Remaining integration gap
The Paradox Ledger is source-wired to the authoritative artifact projection, but the endpoint has not yet been validated against a deployed runtime with commit-bound artifacts. The JIT Factory is still not connected to a verified isolated executor; it must remain BLOCKED. The 54-node CUJ run is coverage evidence, not proof that every subsystem is integrated end-to-end. Do not describe the native app as fully integrated or production-ready.

## Safety constraints
- No PayPal or other payment provider enabled.
- No checkout, escrow, transaction receipt, or synthetic success path.
- No model weights or first-party inference runtime claimed as available.
- No fabricated SAT/UNSAT evidence or compliance claims.
- No production deployment or Neon schema mutation.
- Original sources remain preserved for audit; only evidence-backed, fail-closed behavior is active.
