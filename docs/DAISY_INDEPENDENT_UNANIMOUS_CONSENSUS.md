# Daisy Independent Unanimous Consensus Protocol (DIUCP)

## Contract

- Three evaluator identities are pinned in trusted policy configuration.
- Every evaluator receives the same sealed proposal, policy digest, and evidence bundle digest.
- Evaluators must decide independently. They must not receive peer prompts, reasoning, votes, or outputs before signing their own vote.
- Each vote is Ed25519-signed and bound to the proposal digest, policy digest, evidence digest, nonce, and input-bundle digest.
- The verifier accepts only three distinct, valid approvals. A denial, missing vote, duplicate identity, stale vote, invalid signature, context mismatch, or policy violation blocks.
- The deterministic verifier is not one of the evaluators and cannot change a vote.
- A proposal outside the pre-authorized action/target policy is blocked even when all three evaluators approve.

## Important security boundary

The module verifies signed votes and policy constraints. It does not run the three AI evaluators, prove that their runtime environments were isolated, consume a nonce in durable storage, or execute/deploy the approved action. The `ISOLATED_INPUT_ONLY` attestation is a signed claim, not cryptographic proof that no cross-talk occurred. A production orchestrator must enforce process/container isolation, one-way sealed input delivery, no peer-result channel until all votes are sealed, separate evaluator credentials, durable atomic nonce consumption, and an independently governed execution adapter.

The trusted policy and public-key roster must be loaded from a protected source that evaluators cannot modify. AI consensus cannot edit its own roster, keys, policy, or authority. The executor must re-check policy and the exact proposal digest immediately before execution. Any proposal mutation requires a new vote round.

This module is authorization verification only; no production activation, deployment, payment, or external provider call is enabled by it.
