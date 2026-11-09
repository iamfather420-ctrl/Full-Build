# Neon schema reconciliation and source mapping

**Status: READ-ONLY AUDIT; migration blocked pending verified target identity and schema mapping.**  
**Date:** 2026-11-09  
**Canonical repository:** `iamfather420-ctrl/Full-Build`

This document records what the repository actually defines and what must be verified before a Neon migration. It is intentionally not a migration plan that can be executed as SQL. Do not use it to create tables or alter production.

## Executive finding

The current application persistence model, historical marketplace schemas, and the inspected Neon branch are not one compatible schema:

1. `src/database/SqliteStore.ts` declares 27 local logical tables. Its SQLite DDL gives every table the same generic columns: `id`, `tenant_id`, `created_at`, `updated_at`, `status`, `version`, and `data_json`. Domain fields are serialized into `data_json`. This is not a typed relational schema suitable for direct copying to PostgreSQL.
2. `src/database/DatabaseSchema.ts` defines domain entity interfaces, but these interfaces are not a PostgreSQL DDL contract. Some tenant ownership is missing or optional in the interfaces (notably `SolutionEntity`, `ProofBundleEntity`, and `OfferEntity.tenant_id`).
3. `attached_assets/extracted/marketplace/drizzle` and `attached_assets/extracted/platform/drizzle` contain historical Drizzle migrations with a **MySQL** dialect and MySQL-specific DDL/enums. They are archive/source material, not a Neon PostgreSQL migration source.
4. The current `src/database/NeonPersistence.ts` declares 27 required names, but deliberately disables generic migrations and generic writes. Its tenant read assumes both a `tenant_id` and `created_at` column on every allowed table, then merges `payload_json`; the actual documented domain schema does not establish that generic contract.
5. The tenant-isolation SQL added in PR #76 checks only eight tables: `solutions`, `offers`, `orders`, `proof_bundles`, `proof_evidence`, `verification_runs`, `audit_records`, and `telemetry`. It is not a complete schema migration or a typed persistence implementation.

## Target-identity discrepancy

Two different Neon inventories are recorded:

- The release checklist records a read-only inspection on 2026-10-26 of the configured production database as 37 tables in `public` plus one in `solvex_private`. It also records `access_requests`, both `_migrations` and `schema_migrations` ledgers, and forced RLS on the listed public tables. This is historical repository documentation, not a fresh verification of today's target.
- The disposable branch inventory supplied during the 2026-11-09 session showed ten different public tables, none with `tenant_id`, all with RLS disabled and no policies; the eight tables in PR #76's probe were reported missing.

Those results cannot be reconciled from table names alone. Before writing a migration, compare the Neon project, endpoint/branch, database name, role, schemas, full columns, constraints, RLS policies, and migration-ledger identities. A branch name or parent label alone is not sufficient proof that the SQL editor is connected to the expected endpoint.

Use `scripts/inspect_neon_schema_readonly.sql` on the disposable branch. It reads catalog metadata only and deliberately does not read application records. Capture the outputs with the Neon Console showing the selected project and branch. Do not paste credentials or connection strings into chat or commit them.

## Application source-to-storage map

The map below distinguishes application concepts from the incomplete physical persistence contract.

| Application concept | Source definition / usage | Candidate relational object | Mapping status |
|---|---|---|---|
| Tenant | `TenantEntity`; auth `UserContext.tenant_id` | `tenants` | Concept exists; physical Neon columns and identity/FK rules must be inspected |
| Tenant user and membership | auth `UserContext`; SQLite 27-table inventory includes `users`, `roles`, `permissions`, `tenant_memberships` | `users`, `roles`, `permissions`, `tenant_memberships` | No complete canonical typed repository contract verified |
| Problem | `ProblemEntity` includes `tenant_id`, raw problem, normalized title, domain, constraints, invariants, status | `problems` | Concept exists; PostgreSQL type/column mapping not verified |
| Paradox / invariant | 27-table local inventory includes `paradoxes`, `invariants` | `paradoxes`, `invariants` | Local table names only; canonical typed entity/Neon mapping not established |
| Solution | `SolutionEntity`; pipeline writes a tenant ID in SQLite call sites | `solutions` | Tenant ownership is not declared in the interface; must resolve before tenant RLS |
| Offer | `OfferEntity` has optional `tenant_id`, solution/proof references, cents, publication and verification state | `offers` | Tenant ownership optional; historical MySQL offer schema has different columns and no tenant_id |
| Order | `OrderEntity` has required `tenant_id`, offer/solution/proof references, price and lifecycle status | `orders` | Concept exists; physical Neon columns/FKs and enum mapping not verified |
| Proof bundle | `ProofBundleEntity` contains claim, evidence arrays, tests, formal proofs, oracle/replay results and hashes | `proof_bundles` plus potentially normalized evidence/verification children | No tenant_id in the interface; normalization and tenant ownership are unresolved |
| Proof evidence | Required by PR #76 probe and 27-table inventory | `proof_evidence` | No canonical entity/column contract located in the current domain interfaces |
| Verification run | Required by PR #76 probe and 27-table inventory | `verification_runs` | No canonical entity/column contract located in the current domain interfaces |
| Audit record | `AuditRecordEntity` has tenant, index, actor/action/target, payload and hash-chain fields | `audit_records` | Concept exists; hash-chain uniqueness/order and PostgreSQL types need a reviewed mapping |
| Checkpoint | `CheckpointEntity` has tenant, mutation, classification, snapshot and timestamp | `checkpoints` | Concept exists; snapshot storage and retention rules need review |
| Telemetry | Included in the 27-table inventory and PR #76 probe | `telemetry` | No canonical typed entity contract verified |
| Failures / rollback / deployment / execution / chain / license / adapters / nodes / payments | Names appear in the 27-table local inventory | Corresponding named tables | Local inventory only; individual entity contracts and Neon mappings remain to be designed; payments stay disabled |

### Why the eight-table probe is not a migration specification

The probe's eight names are a security-test scope, not an authoritative application schema. It omits core concepts such as tenants, users/memberships, problems, paradoxes, invariants, checkpoints, and access requests. It also includes `proof_evidence` and `verification_runs` without a complete current entity definition. Creating these eight tables alone would not make the application's 27-table persistence model operational.

## Required mapping decisions before DDL

1. **Confirm the target.** Verify Neon project, endpoint/branch ID, database, selected role, and schemas against the intended disposable clone. Explain the ten-table versus 37-table discrepancy before proceeding.
2. **Obtain the actual schema.** Review all columns, defaults, identity behavior, PK/unique/FK/check constraints, indexes, triggers, grants, RLS policies, and both migration ledgers. Table inventory alone is insufficient.
3. **Define tenant ownership.** Specify the authoritative tenant key for each tenant-scoped object and resolve missing/optional ownership in solution, offer, proof bundle, telemetry, and verification models. Never infer tenant ownership from an untrusted caller field or a global constant.
4. **Define relations and lifecycle.** Specify foreign keys and deletion behavior for problem → solution → proof → offer → order; decide whether proof evidence and verification runs are normalized child tables or structured immutable documents; preserve audit hash-chain semantics.
5. **Design PostgreSQL-native migrations.** Use versioned, additive, transactional migrations with explicit PostgreSQL types, constraints, indexes, backfill strategy, and rollback/forward-recovery plan. Do not copy MySQL Drizzle DDL or generic SQLite `data_json` DDL.
6. **Apply only to a verified disposable clone.** Confirm a restorable backup, migration-ledger state, and least-privilege role. No production migration is authorized by this task.
7. **Implement typed repositories.** Add explicit per-entity read/write methods, tenant predicates, idempotency, transaction boundaries, restart readback, and safe error behavior. Keep generic `payload_json` operations disabled.
8. **Test isolation against real PostgreSQL.** Use two real fixture tenants and rows for every tenant-scoped table; assert own-row visibility, cross-tenant invisibility, cross-tenant write rejection, role privileges, and RLS enabled/forced. Do not count skipped tests as passing.

## Safe next action

Run `scripts/inspect_neon_schema_readonly.sql` on the selected disposable branch and compare its metadata outputs with the project/branch selected in Neon Console. This is the missing evidence needed to decide whether the branch is connected to the intended database and to design the actual PostgreSQL migrations. Until then, leave the branch schema unchanged and keep the production gate blocked.

## Files and code reviewed

- `src/database/SqliteStore.ts` — 27 generic local tables and JSON payload persistence
- `src/database/DatabaseSchema.ts` — application entity interfaces
- `src/database/NeonPersistence.ts` — read-only connectivity/RLS checks; generic migrations and writes blocked
- `src/auth/AuthService.ts` and `src/auth/SessionGuard.ts` — tenant identity contract
- `src/marketplace/OrderLifecycle.ts` and `src/marketplace/MarketplaceEngine.ts` — order/offer lifecycle usage
- `attached_assets/extracted/marketplace/drizzle` and `attached_assets/extracted/platform/drizzle` — historical MySQL schemas
- `docs/deployment/PRODUCTION_RELEASE_CHECKLIST.md` — recorded production schema and release requirements
- `scripts/verify_neon_tenant_isolation.sql` on PR #76 — eight-table security probe
