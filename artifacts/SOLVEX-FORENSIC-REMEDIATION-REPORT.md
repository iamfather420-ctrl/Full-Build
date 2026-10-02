# SOLVEX B2B Platform — Forensic Remediation & Execution Report

**Prepared:** 2026-09-26 07:01 UTC  
**Repository:** `solvex-platform`  
**Scope:** Secure the existing Project AGATE / dAIsy / SOLVEX codebase as an evidence-gated B2B platform, run a canonical internal dAIsy candidate intake, and report only verified outcomes.

> **Release posture:** Local build and security gates are verified. Commercial production activation is **blocked**. No PayPal credentials, webhook, provider-approved checkout, capture, explicit PYUSD receipt, or production identity deployment was supplied or executed.

## 1. Executive result

The codebase was converted from a largely client-/fixture-driven demonstration into a **fail-closed server-authoritative foundation**:

- Browser role and tenant selectors are now **presentation-only**; API authorization comes from a signed, expiring server token.
- The public role-selecting `/api/auth/login` flow has been retired (`410 Gone`).
- The previous browser credential/capture concept was removed. PayPal credentials are accepted **only from server environment variables**.
- The marketplace exposes **zero purchasable offers** unless a solution is independently verified and exactly bound to a verified proof bundle and implementation hash.
- A new file-backed SQLite repository stores tenant-scoped records, timestamps, durable audit history, and WAL settings. There is no localStorage/in-memory fallback.
- Checkpoint snapshots were corrected to exclude the checkpoint registry itself, preventing recursive snapshot growth and preserving rollback checkpoints after restoration.
- dAIsy now creates a **candidate**, not an auto-verified solution. It completes static intake only and stops on evidence-dependent stages.
- Payment activation requires an authenticated server flow, a provider order re-read, a capture re-read, amount/currency/reference matching, idempotency protection, and explicit provider-reported PYUSD evidence.
- All non-PayPal settlement/custody rails are hard-disabled in code and the former adapter slots are explicit policy guards.

## 2. Forensic findings and remediation

| Prior risk / invalid claim path | Remediation | Current evidence boundary |
|---|---|---|
| Browser-controlled tenant/role context could be mistaken for authorization. | Implemented HMAC-signed, expiring tokens with issuer, audience, token ID, tamper detection, expiry checks, tenant checks, and RBAC in `AuthService`; sensitive routes default-deny. | No authenticated production issuer is configured in this sandbox, so protected requests fail closed. |
| Browser-facing PayPal credential entry and capture-like behavior. | Replaced with a read-only deployment-status screen; removed session credential setters/clearers and browser credential collection. | Environment values remain server-only; the public status endpoint deliberately returns no secret material. |
| Payment state could be advanced without provider evidence. | Added server-side Orders v2 create/approval/capture design, idempotency key reservation, provider order/capture re-read, strict stored order comparison, signed webhook verification path, and a PYUSD receipt gate. | **No provider transaction was performed.** The gateway reports `EXTERNAL_PROVIDER_REQUIRED` without server credentials. |
| Self-attested proof/candidate data could be treated as verified. | `ProofBundleBuilder` seals only `PARTIAL` or `FAIL`; `ProofEngine.registerBundle` rejects anything lacking test receipts, checked formal proof receipts, independent attestation, replay match, provenance, and a `VERIFIED` state. | There are no proof bundles or verified offerings. |
| Marketplace publication could be separated from a verifiable solution/proof implementation. | `MarketplaceEngine.publishOffer` enforces solution status, proof status, subject binding, exact implementation hash binding, and evidence integrity before creating a published offer. | Candidate publication was actively tested and blocked. |
| Storage was not a production-grade durable authority. | Added a server-only SQLite repository with on-disk path, WAL mode, parameterized values, a closed logical-table allow-list, tenant-scoped reads/writes, transactions, durable snapshot persistence, and a chained audit ledger. | SQLite was tested locally. A managed production database, migrations, backups, encryption policy, and RLS deployment remain external deployment work. |
| Demo claims and unused third-party payment rails exceeded the permitted scope. | Reduced the browser app to overview, PayPal PYUSD readiness, and the verified-marketplace catalogue. Replaced non-PayPal rail nodes with a blocklist, PYUSD-evidence policy guard, and custody exclusion guard. | Static source scan found no residual unsupported-rail references outside test code. |

## 3. dAIsy execution: actual result

A canonical **existing registry** problem, `DH-P-001`, was submitted to the hardened static intake pipeline.

| Field | Result |
|---|---|
| Execution classification | `CODE_EXECUTED` |
| Origin classification | `EXISTING_REGISTRY` |
| Candidate ID | `DH-C-B28A191DCBFE70D0` |
| Tenant | `TENANT_SOVEREIGN_ROOT` |
| Stages completed | 7 of 21 |
| Candidate status | `PARTIAL` |
| Marketplace action | `NOT_ATTEMPTED` |
| Proof bundle / offer / order / payment | None |

The pipeline completed source normalization, registry classification, static structural checks, and a conservative TypeScript-shape check. It deliberately held stages requiring authorized sandbox execution, formal candidate proof, proof certificate, hermetic tests, independent attestation, cleanroom replay, customer evidence, and marketplace eligibility.

> This is the correct outcome. A candidate was **not** represented as independently verified, production-ready, purchased, delivered, or commercially published.

The machine-readable execution record is [`daisy-candidate-execution-v2.json`](./daisy-candidate-execution-v2.json).

### Candidate continuation result

The existing candidate `DH-C-B28A191DCBFE70D0` was resumed without creating a duplicate. Its deterministic implementation is a bounded Zeno convergence step. The continuation harness safely completed **19 of 21 stages**:

| Stage area | Result |
|---|---|
| Memory safety / input validation | `IMPLEMENTED` — finite numeric inputs, positive epsilon requirement, bounded source size |
| Non-termination inspection | `IMPLEMENTED` — no loops, recursion, dynamic code, or child-process imports |
| Ranking-function inspection | `IMPLEMENTED` — distance halves whenever it exceeds epsilon |
| Candidate-specific formal proof | `IMPLEMENTED` — actual Z3 WASM returned `unsat` for the implementation-bound contract |
| Machine-checked proof receipt | `IMPLEMENTED` |
| Hermetic test execution | `IMPLEMENTED` — isolated VM execution with reproducible inputs, outputs, environment, dependency, and implementation hashes |
| Independent oracle | `IMPLEMENTED` — separate mathematical reference evaluator, not an import of the candidate |
| Cleanroom replay | `MATCH` |
| Pricing, audit append, tenant partition, checkpoint | `IMPLEMENTED` |
| Customer evidence projection | `BLOCKED_BY_EXTERNAL_DEPENDENCY` — no customer-specific acceptance or business evidence exists |
| Marketplace eligibility | `BLOCKED_BY_EXTERNAL_DEPENDENCY` — candidate remains `HOLD` and publication was rejected |

The local evidence is complete for the executable contract, but this candidate is **not promoted to `VERIFIED`** because the missing customer-specific evidence is material to the requested first real B2B offer. The negative publication gate was also exercised and correctly rejected the partial candidate. See [`candidate-verification-DH-C-B28A191DCBFE70D0.json`](./candidate-verification-DH-C-B28A191DCBFE70D0.json), [`candidate-evidence-bundle-DH-C-B28A191DCBFE70D0.json`](./candidate-evidence-bundle-DH-C-B28A191DCBFE70D0.json), and [`candidate-negative-gates-DH-C-B28A191DCBFE70D0.json`](./candidate-negative-gates-DH-C-B28A191DCBFE70D0.json).

### B2B acceptance/evidence layer

A durable server-side B2B reference-case mechanism is now implemented. It stores privacy-preserving references for the candidate, solution version, business problem, required inputs, expected outputs, acceptance criteria, measurable outcomes, dataset reference, authorization reference, evaluator reference, evidence type, implementation hash, timestamps, and controlled lifecycle status.

The evaluator workflow requires an authenticated `VERIFIER`, `ADMIN`, or `OWNER` and provides server-side routes for reference-case creation, exact-hash evaluation, acceptance commitment, and readiness inspection. The candidate implementation is executed through a server-side isolated VM only after its stored implementation hash matches the reference-case hash. Evidence records include input, expected-output, observed-output, implementation, environment, dependency, authorization, evaluator, and evidence hashes.

Evidence types are explicit and cannot be upgraded by the UI or by Daisy:

- `INTERNAL_SYNTHETIC`
- `INTERNAL_ENGINEERING`
- `AUTHORIZED_EVALUATOR`
- `CUSTOMER_ACCEPTANCE`
- `EXTERNAL_INDEPENDENT_EVIDENCE`

The test reference case created for the workflow is explicitly labeled **synthetic/internal only**. It is not customer acceptance and is not independent external evidence. Negative tests prove that missing criteria, missing authorization, unauthorized roles, wrong candidate, failed outcomes, synthetic acceptance, duplicate/replayed evaluation, hash tampering, and blocked readiness fail closed. The readiness output for `DH-C-B28A191DCBFE70D0` is:

```text
TECHNICAL VERIFICATION: PASSED
B2B ACCEPTANCE: MISSING
INDEPENDENT B2B EVIDENCE: MISSING
MARKETPLACE PUBLICATION: BLOCKED
PAYMENT: NOT CONFIGURED
PRODUCTION: BLOCKED
```

See [`b2b-reference-verification-v2.json`](./b2b-reference-verification-v2.json). The mechanism is ready to receive a legitimate authorized business case; no customer, revenue, acceptance, payment, or PYUSD claim was created.

## 4. Validation performed

| Validation | Result | Meaning |
|---|---:|---|
| `npm run lint` | Passed | TypeScript compilation completed with no errors. |
| `npm run verify:enterprise` | **9 / 9 passed** | Validated auth fail-closed behavior, tamper/expiry/tenant scope, durable persistence, candidate-only dAIsy behavior, publication rejection, no-credential PayPal block, protected routes, retired public login, and audit tamper detection. |
| `npm run verify:api` | **7 / 7 passed** | Validated unauthenticated denial, public catalogue restriction, authenticated candidate intake, candidate publication rejection, and no-provider checkout denial. |
| `npm run verify:b2b` | **Passed** | Validated the durable reference-case schema, authenticated evaluator API path, exact implementation hash execution, synthetic evidence labeling, missing criteria/authorization, unauthorized evaluator, wrong candidate/hash, failed outcome, tampering, duplicate/replay, and blocked marketplace readiness. |
| `npm run verify:nodes` | **54 / 54 reached and evidence asserted** | Exercised the 54-node harness. `SUCCESS`, `FAIL_CLOSED`, `PROVIDER_REQUIRED`, and `PROHIBITED_BLOCKED` are accepted evidence-bearing control outcomes; it is not a commercial-readiness certification. |
| `npm run verify:dfrl` | **88 / 88 UNSAT model assertions** | Verified the existing DFRL Z3 model suite at **MODEL_VERIFIED** scope, including mutation, failure-injection, and artifact-tamper checks. This is not a commercial-solution certificate. |
| `npm run verify:authoritative` | **3 / 4 gates passed; production gate blocked** | Security, DFRL model, and marketplace-inventory gates passed. Commercial production was truthfully blocked. |
| `npm run build` | Passed | Browser bundle built successfully with no server-only modules included by the production app entrypoint. |
| HTTP smoke test | Passed | Public `/api/system/health` returned `HEALTHY`; public offers returned `[]`; anonymous `/api/orders` returned `401`. |
| Unsupported-rail scan | Passed | No residual unsupported-rail references remain in runtime source outside test code. |

The detailed API regression record is [`api-security-v2.json`](./api-security-v2.json). The node coverage record is [`daisy-54-node-coverage-v2.json`](./daisy-54-node-coverage-v2.json). The consolidated production-boundary result is [`authoritative-verification-v2.json`](./authoritative-verification-v2.json).

## 5. Current HTTP service status

A temporary hardened HTTP service is running for review at:

- **Application:** <https://3000-i5i88bidmlhfvqad9pbqv-09eed7fe.us4.manus.computer>
- **Health endpoint:** <https://3000-i5i88bidmlhfvqad9pbqv-09eed7fe.us4.manus.computer/api/system/health>

At verification time the health endpoint reported:

```json
{
  "status": "HEALTHY",
  "durable_storage": true,
  "audit_chain_continuous": true,
  "authentication_configured": false,
  "fail_closed_active": true
}
```

`authentication_configured: false` is expected for this review service because no production `SOLVEX_AUTH_SECRET` was provided; it is a safety control, not a readiness claim.

## 6. PayPal PYUSD integration truth boundary

The integration follows PayPal’s server-side OAuth/Orders pattern, but it is intentionally not marked live or sandbox-verified in the absence of credentials and an authorized payment test.

### Implemented server controls

1. Uses server environment variables only:
   - `PAYPAL_ENVIRONMENT`
   - `PAYPAL_SANDBOX_CLIENT_ID` / `PAYPAL_SANDBOX_SECRET`
   - `PAYPAL_LIVE_CLIENT_ID` / `PAYPAL_LIVE_SECRET`
   - `PAYPAL_WEBHOOK_ID`
2. Creates an Orders v2 order from the server’s stored SOLVEX order snapshot, not from browser price/currency fields.
3. Reserves a tenant-scoped idempotency key before provider calls.
4. Requires payer approval, re-reads the provider order, captures once, and compares reference ID, custom ID, amount, and USD currency against the stored order.
5. Verifies webhook signatures through PayPal’s `verify-webhook-signature` endpoint and records verified webhook IDs durably.
6. Refuses order activation if the deployment policy is off or provider payloads do not contain **explicit PYUSD asset evidence**.
7. Leaves the order below `ESCROW_FUNDED` in every unsupported, missing, mismatched, or provider-error condition.

### Important limitation

PayPal’s public Orders v2 material describes PYUSD acceptance but does not expose a portable request parameter that universally forces the payer’s funding asset. The implementation therefore does **not** infer PYUSD from a USD amount, merchant configuration, or a successful capture. Activation remains blocked unless the provider response carries the explicit PYUSD evidence expected by the deployment policy.

## 7. Required external steps before commercial activation

These are deployment/operator actions and were not simulated or bypassed:

1. Provision a managed secret store and set a randomly generated `SOLVEX_AUTH_SECRET` of at least 32 characters.
2. Connect the production identity issuer responsible for issuing signed user contexts; do not expose the bootstrap token issuer as a public route.
3. Provision production persistence with migrations, backups, encryption, monitoring, and tenant authorization controls; local SQLite is not a claim of production HA or RLS.
4. Obtain PayPal merchant confirmation for the intended PYUSD program and supported receipt fields.
5. Set *only* the selected environment’s PayPal credentials, `PAYPAL_WEBHOOK_ID`, HTTPS return/cancel URLs, and registered webhook endpoint.
6. Confirm a signed webhook verification round trip in the selected environment.
7. Perform an operator-approved sandbox checkout with no real buyer delivery, then inspect provider order/capture payloads for explicit PYUSD evidence.
8. Enable `PAYPAL_PYUSD_ONLY_ENABLED=true` only after the preceding evidence is captured and reviewed.
9. Execute an independent proof/evidence workflow for a solution; publish only after the proof bundle is independently registered and hash-bound.
10. Perform an operator-approved production smoke test with a controlled merchant/buyer account and retain the resulting provider/audit receipts.

## 10. Final continuation status

| Required output | Status |
|---|---|
| `CANDIDATE_SELECTED` | `DH-C-B28A191DCBFE70D0` (resumed; no duplicate created) |
| `CANDIDATE_EXECUTION_STATUS` | `CODE_EXECUTED`; local continuation complete through 19/21 stages |
| `STAGES_COMPLETED` | 19 implemented; stages 17 and 21 remain externally blocked |
| `FORMAL_PROOF_STATUS` | `CANDIDATE_SPECIFIC_UNSAT_EXECUTED` via actual Z3 WASM |
| `MACHINE_CHECK_STATUS` | `unsat`, proved |
| `HERMETIC_TEST_STATUS` | Passed in isolated VM; invalid input rejected; receipt reproducible |
| `INDEPENDENT_ORACLE_STATUS` | Passed; reference evaluator did not import candidate implementation |
| `CLEANROOM_REPLAY_STATUS` | `MATCH` |
| `EVIDENCE_BUNDLE_STATUS` | Local evidence complete, held pending customer evidence |
| `IMPLEMENTATION_HASH_BINDING` | Bound to `b28a191dcbfe70d02e98455d09982b93db4b2561243e558ee9f73ba2c74cdcd5` |
| `VERIFICATION_STATUS` | `HOLD` — not `VERIFIED` |
| `MARKETPLACE_PUBLICATION_STATUS` | Blocked; partial-candidate negative gate passed |
| `PAYPAL_CONFIGURATION_STATUS` | Not configured |
| `PYUSD_EVIDENCE_STATUS` | Not observed |
| `PAYMENT_TEST_STATUS` | Not performed |
| `FULFILLMENT_TEST_STATUS` | Not performed |
| `COMMERCIAL_PRODUCTION_STATUS` | `COMMERCIAL_PRODUCTION_BLOCKED` |

## 11. B2B readiness outputs

| Output | Current result |
|---|---|
| `TECHNICAL_VERIFICATION` | `PASSED` for the candidate-specific local chain |
| `B2B_REFERENCE_FRAMEWORK` | `IMPLEMENTED` and durably recorded |
| `B2B_EVALUATION_WORKFLOW` | `IMPLEMENTED_TESTED` through authenticated server routes |
| `CUSTOMER_ACCEPTANCE_EVIDENCE` | `MISSING` — no customer was invented |
| `INDEPENDENT_B2B_EVIDENCE` | `MISSING` — synthetic/internal fixtures are excluded |
| `MARKETPLACE_ELIGIBILITY` | `BLOCKED` |
| `MARKETPLACE_PUBLICATION` | `NOT_ATTEMPTED` |
| `PAYPAL_CONFIGURATION` | `NOT_CONFIGURED` |
| `PYUSD_EVIDENCE` | `NOT_OBSERVED` |
| `COMMERCIAL_PRODUCTION` | `BLOCKED` |

The B2B mechanism can now receive a legitimate authorized business case without allowing the browser, dAIsy, internal synthetic data, or a developer assertion to manufacture customer acceptance.

## 8. Files changed materially

| Area | Primary implementation files |
|---|---|
| API, auth, HTTP routing | `src/api/ApiRouter.ts`, `src/auth/AuthService.ts`, `server.ts` |
| Durable state and audit | `src/database/SqliteStore.ts`, `src/database/DurableStore.ts` |
| Candidate/evidence truth boundaries | `src/solutions/SolutionPipeline.ts`, `src/proofs/ProofBundle.ts`, `src/proofs/ProofEngine.ts` |
| Marketplace and lifecycle | `src/marketplace/MarketplaceEngine.ts`, `src/marketplace/OrderLifecycle.ts` |
| PayPal gateway | `src/payments/PayPalAdapter.ts`, `.env.example` |
| Public client | `src/App.tsx`, `src/components/MarketplaceView.tsx`, `src/components/PayPalHub.tsx` |
| Regression evidence | `src/tests/enterpriseVerification.ts`, `scripts/verify_api_security.ts`, `scripts/run_daisy_candidate.ts`, `src/tests/authoritativeVerificationPipeline.ts` |

## 9. Explicit non-claims

This work does **not** claim:

- a deployed production identity provider;
- a live or sandbox PayPal/PYUSD transaction;
- a confirmed explicit PYUSD provider receipt;
- a production database connection, RLS policy, backup, or high-availability setup;
- an independently verified commercial solution;
- a published offer, buyer order, paid invoice, funded escrow, delivery, or deployment;
- proof that the DFRL model suite applies to a particular commercial candidate.

Those claims remain blocked until their respective external evidence exists.
