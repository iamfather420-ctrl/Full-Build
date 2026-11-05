# MMTAI Paradox Blockchain Daisy Chain

## Purpose

A read-only, bounded, parallel Bitcoin blockchain inspection and verification subsystem for SOLVEX + Daisy Haminja. The MMTAI chunk-authorization contract gates work; authorized workers process independent height-range chunks, then results are reassembled in canonical block-height order and parent linkage is checked before success is reported.

## First implementation boundary

This milestone verifies:
- raw 80-byte block-header double-SHA-256 against the node-provided block hash;
- compact proof-of-work target from the header nBits field;
- transaction Merkle root against the decoded transaction IDs;
- raw block transaction count against the decoded transaction-ID count;
- previous-block hash linkage across the requested inclusive height range.

The pipeline is read-only. It does not mine, submit transactions, modify a node, mutate source block data, or claim to discover spendable Bitcoin.

## Parallelism model

- The requested inclusive height range is divided into deterministic chunks.
- A bounded worker pool processes chunks concurrently.
- Blocks within each chunk are read sequentially.
- Results are sorted by block height before chain-link checks and final reporting.
- A failed block or broken parent link makes the report BLOCKED; no partial result is promoted to verified.

Independent retrieval and per-block checks can be parallelized; canonical parent linkage is checked in order after reassembly.

## MMTAI authorization boundary

Every chunk requires an injected MMTAIChunkAuthorizer. Missing, denied, or failed authorization blocks the chunk before any Bitcoin RPC request is made. The test suite uses an explicit test authorizer only.

MMTAIProtocol now supports short-lived, single-use scoped tokens bound to role, capability, tenant, and the exact operation string. The blockchain adapter first calls an injected MMTAIChunkApprovalProvider, then consumes the scoped token for that exact chunk. Missing, denied, or failed approval blocks the chunk. The repository now includes an Ed25519 signed-approval verifier. It binds each signature to tenant, capability, chunk ID, and exact height range; enforces a short validity window; and requires an injected atomic nonce store to reject replay. The signing authority and durable nonce-store implementation remain deployment integrations: no signing key, approval UI/service, or production persistence implementation is bundled. The verifier is not proof of human identity by itself; the public key must be provisioned through an independently governed human-root trust process. Test keys and in-memory nonce stores are test-only.

## Connection configuration

Connect only to a Bitcoin Core JSON-RPC endpoint controlled by the operator or explicitly authorized by them.

Required environment variables:
- BITCOIN_RPC_URL
- BITCOIN_RPC_USER
- BITCOIN_RPC_PASSWORD

Optional:
- BITCOIN_RPC_TIMEOUT_MS (default 15000)

Credentials are never embedded in source or report output. HTTPS is required except for loopback HTTP endpoints.

## Verification limits

The transaction IDs used for the Merkle-root check come from Bitcoin Core's verbosity-2 block decoding. This module does not independently parse and execute every transaction script or implement all Bitcoin consensus rules. A fully synchronized, non-pruned Bitcoin Core node performs its own consensus validation; the report must not be described as an independent reimplementation of full consensus.

A Merkle-root mismatch, invalid proof-of-work, header-hash mismatch, transaction-count mismatch, RPC error, or broken parent link fails closed.

## Next milestones

1. Integrate a real human approval UI/service that signs scoped requests with an independently governed Ed25519 key, and provide a durable atomic nonce store; verify key rotation, revocation, and recovery procedures.
2. Add a read-only API surface behind existing authorization and rate-limit boundaries.
3. Add resumable checkpoints and durable evidence receipts without storing RPC credentials.
4. Benchmark chunk sizes and concurrency against a sequential baseline.
5. Add transaction-level parsing and independent consensus checks only with a reviewed implementation and authoritative test vectors.
6. Add mining research as a separate worker pool. Mining nonce search is not the same operation as scanning or validating historical blocks.

## Evidence semantics

VERIFIED means only that every check listed in the verification scope passed for the requested range using the configured Bitcoin Core RPC source and an explicit authorizer. It does not mean that the whole Bitcoin network was independently audited, that private keys or spendable coins were discovered, or that mining speed was increased.

Scoped tokens are burned on first authorization attempts, including operation/context mismatches and attempts to route a scoped token through the legacy unscoped authorization method. The deterministic test suite covers these downgrade and replay cases.
