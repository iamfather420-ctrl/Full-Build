# Startup Reconciliation Acceptance Gate

**Status:** Required before any live job acceptance.
**Branch:** chore/predeploy-hardening-20261111
**Baseline doc:** docs/solvex-worker-security-baseline.md (unchanged)

## Requirement

The SolveX Docker worker dispatcher MUST run a startup reconciliation pass on every boot before accepting new jobs.

## What It Does

1. Scans the shared stage table for stale `sending` rows and delivery-receipt/audit records that indicate a partially persisted send. A merely stale `composed` row is not evidence of a send attempt and must not be treated as a failed or delivered message.
2. For each stuck row, determines the true terminal state from durable evidence (Gmail API receipts, message IDs, delivery timestamps) rather than guessing.
3. Repairs a row to `delivered` only when a durable, verifiable Gmail receipt proves acceptance. If delivery is not conclusively established either way, marks it `needs_review` / `delivery_unknown`. Absence of a message ID is not proof of non-delivery.
4. Never re-sends. Reconciliation is read-and-correct only.
5. Logs every reconciled row with before-state, after-state, evidence source, and timestamp.

## Acceptance Criteria

- [ ] Dispatcher refuses to accept new jobs until reconciliation completes successfully.
- [ ] A row stuck in `sending` with a recorded Gmail message ID but no delivered confirmation transitions to `delivered` only when the message ID is verifiable; otherwise `needs_review`.
- [ ] A row stuck in `sending` with no durable, verifiable Gmail receipt transitions to `needs_review` / `delivery_unknown`, never to a retryable `failed` state solely because the message ID is absent.
- [ ] No duplicate send is triggered for any reconciled row.
- [ ] Reconciliation is idempotent: running it twice on the same stuck set produces the same terminal states.
- [ ] Unit tests inject failures at each database persistence boundary. Writes that are part of one database transaction must roll back together; writes spanning separate transactions must be detected and deterministically reconciled on next boot.
- [ ] Fault-injection tests (timeout leaving row in sending, blocking retries, message ID recorded before delivery, persistence failure) all pass with reconciliation enabled.

## Why It Matters

A crash between a successful Gmail send and the stage-row update leaves a lead that looks unsent but was actually delivered. Without reconciliation, the next retry sends a second email. With it, the orphan is detected, corrected, and never resent.

It is the difference between a crash costing one retry and a crash costing a duplicate email to a real human.

## Safeguards Intact

- No merge to main.
- No deployment.
- No live jobs.
- No real email sent by tests.
- Original baseline doc not modified.
