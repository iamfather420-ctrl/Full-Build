# Daisy 3-of-3 Independent Model Consent

**Status:** implementation branch / not production-enabled  
**Date:** 2026-11-27  
**Purpose:** prevent a Daisy production activation build unless three independent first-party model evaluators unanimously approve the exact source revision and evidence bundle, and the human root separately signs that same certificate.

## Protocol requirements

Each of the three evaluator identities is pinned by a root-signed runtime configuration containing:

- a distinct evaluator ID and Ed25519 public key;
- a distinct model ID;
- a distinct model-weights SHA-256;
- a distinct evaluator runtime-code SHA-256;
- a distinct immutable container image digest;
- an evaluator-specific private signing-key path.

The runtime rejects repeated model IDs, weight hashes, runtime hashes, image digests, or signing keys. Three different labels or containers around the same model weights do not count as three independent models.

Evaluators run sequentially in fresh Docker containers with no network, read-only root filesystems, dropped Linux capabilities, no-new-privileges, bounded CPU/memory/PIDs, and only their own signing key mounted read-only. Every evaluator receives the same sealed proposal/policy/evidence input. No evaluator receives another evaluator's vote or output.

Each signed vote binds the evaluator/model lineage to the proposal hash, policy hash, evidence hash, one-time nonce, sealed-input hash, decision, and timestamp. All three valid APPROVE votes are required. Any denial, missing vote, duplicate identity, stale signature, altered evidence, or model-lineage mismatch blocks execution.

## What the runtime can execute

The production composition root exposes one action only:

- AUTHORIZE_DAISY_PRODUCTION / SOLVEX_DAISY_PRODUCTION

That handler only persists the signed consensus certificate. It does not deploy, publish, activate payments, change a database schema, or run arbitrary commands. The runtime reports APPROVED_AND_HANDLER_COMPLETED, not deployment success.

The certificate is bound to the current source commit, verification root, and run-evidence hash. The human activation authorization must separately sign the certificate SHA-256. The activation gate will not accept an active record without that binding.

## Durable replay and certificate storage

The nonce and certificate store uses the existing Neon PostgreSQL project. It:

- pins the database host to the already-existing production or staging branch;
- requires an explicit server-owned tenant ID and environment;
- uses transaction-local app.tenant_id;
- requires forced RLS policies on both tables;
- rejects database roles with BYPASSRLS or superuser privileges;
- atomically consumes each nonce once;
- persists the complete certificate and verifies exact readback.

The additive migration is packages/db/migrations/0003_daisy_consensus_storage.sql. It is not auto-applied and has not been run against Neon. The runtime fails closed until an owner-reviewed migration is applied to the correct existing branch and a restricted non-bypass database role is configured.

## Production deployment boundary

The package build command now invokes scripts/verify-production-consensus.ts before Vite. Preview and local builds skip the production-only gate. A Vercel production build requires:

1. a fresh ACTIVE activation record bound to VERCEL_GIT_COMMIT_SHA;
2. all existing 120-corpus, adversarial, and 67 activation-gate checks to pass with zero provider-required gates;
3. a valid root-signed three-model policy and three distinct signed approvals;
4. proposal binding to the exact source commit, verification root, evidence hash, and rollback plan;
5. a human-root activation signature binding the consensus certificate hash;
6. exact certificate readback from the existing Neon tenant store.

Missing or stale evidence blocks the production build. The existing already-deployed production version is not changed by this branch.

## Current completion blockers

- Three independent model weights and immutable evaluator images have not been provisioned or verified.
- Three evaluator signing keys, the root-signed evaluator roster/policy, and runtime host configuration are not present.
- The Neon consensus migration has not been applied; the database role and RLS posture have not been verified for this store.
- Current Vercel/Neon auth and proof-storage endpoints require owner reconciliation; this implementation does not silently reuse stale endpoints.
- No production deployment or activation has been performed.

No new paid infrastructure, third-party AI API, production credential change, database migration, or production deployment is part of this implementation.
