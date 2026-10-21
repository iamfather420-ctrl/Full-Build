# Final Production Checks

Run only after items 1–4 of the next-steps tracker have recorded evidence.

## Deployment
- Confirm the exact commit SHA deployed to the staging/production target.
- Verify domain mapping and TLS.
- Confirm the runtime secret store contains `NEON_DATABASE_URL` (least-privilege role) and the signing secret; no elevated role.

## Health and readiness
- `GET /api/system/health` returns `HEALTHY` (audit chain continuous, persistence connected).
- `GET /api/system/readiness` returns `ready: true` with expected node counts.
- Both endpoints must fail closed when the database or signing context is unavailable.

## Monitoring
- Confirm alerts exist for backup failure, RLS posture regression, auth failures, and elevated error rates.
- Verify daily backup workflow continues to produce both code and Neon dump artifacts.

## Security regression
- Unauthenticated production API access fails closed (PR #10).
- Cross-tenant reads/writes are rejected under the runtime role.
- PayPal remains disabled until its own sandbox suite passes and a separate approval is given.

## Sign-off
Record the deployed SHA, health responses, isolation transcript, and backup run ID. Only then may GATE-14 be considered for promotion. Production login remains disabled until this record exists.
