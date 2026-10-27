# Marketplace and enterprise workflow truth boundaries

## Implemented fail-closed behavior (current tree)

`MarketplaceEngine`:

- Publish offer requires VERIFIED solution **and** VERIFIED proof bundle
- Create order requires published + VERIFIED offer
- Local SQLite / DurableStore used for local demos — **not** proven Neon multi-tenant persistence

Payments:

- Native `/api/pay/create` → HTTP 410 `PAYMENTS_DISABLED`
- `PayPalAdapter` disabled; no live capture
- Stripe prohibited (DN-36 policy guard)

## Explicitly incomplete

| Workflow | Status |
| --- | --- |
| Problem intake → solution → proof → offer | Local paths exist; Neon typed repos blocked |
| Order → payment → fulfillment | Payment **BLOCKED**; fulfillment not authorized |
| Escrow / settlement (DN-38) | Not enabled |
| Multi-tenant isolation on cloud DB | RLS posture audit only; production branch may lack RLS |
| Idempotent order create under concurrency | Not proven on Neon |
| Atomic ledger updates | Local merkle/audit only; not production settlement |

## Required before enabling commerce paths

1. Typed repositories on staging Neon with RLS + two-tenant tests
2. Auth sessions binding tenant_id on every write
3. Separate PayPal security review (credentials, webhook auth, reconciliation)
4. Idempotency keys enforced at DB unique constraint
5. Human authorization for live capture environment

Until then, marketplace publication may run in **local verified** scope only; never claim production commerce.
