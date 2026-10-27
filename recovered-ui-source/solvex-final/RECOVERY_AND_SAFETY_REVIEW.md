# Recovered UI source snapshot

This directory preserves the historical UI source modules for forensic review. The source blobs below are from Full-Build commit a5ae6a4, not a claim that they are safe to activate unchanged.

## Source files preserved
- src/components/PaymentGateway.tsx
- src/components/CommandBar.tsx
- src/components/ParadoxLedger.tsx
- src/components/JitFactory.tsx
- src/data.ts
- src/types.ts
- src/main.tsx
- src/index.css
- vite.config.ts
- index.html
- package.json

## Activation decision
The active native UI components remain fail-closed until reviewed replacements are prepared:
- PaymentGateway: the historical component can treat any HTTP response as an active checkout session and renders provider URLs/transaction references. The recovered Library archive variant also posts to /api/pay/create and marks activeSession true without checking response.ok. Keep payments disabled and do not activate this module.
- CommandBar: the historical UI displays autonomous-core/tether claims and can expose payment-trigger metadata. It must be reconciled with actual server BLOCKED state and cannot authorize purchases.
- ParadoxLedger: the historical UI presents hardcoded efficacy and compliance/security assertions as if verified. Do not represent those as proof.
- JitFactory: the historical UI uses client-side timers and hardcoded deployment metadata to simulate successful build/deploy completion. Do not activate those paths.

The current native modules under Solvex-core/src/components remain the active fail-closed UI. This snapshot preserves original source for a careful, minimal follow-up integration; it does not change the running app, enable providers, deploy, or mutate databases.
