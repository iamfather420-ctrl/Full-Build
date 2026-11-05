# MMTAI Paradox Blockchain Daisy Chain

## Purpose

A read-only, bounded, parallel Bitcoin blockchain inspection and verification subsystem for SOLVEX + Daisy Haminja. MMTAI schedules independent height-range chunks across workers, while the pipeline reassembles results in canonical block-height order and checks parent linkage before reporting success.

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

This is deliberate: independent retrieval and per-block checks can be parallelized, while canonical parent linkage is checked in order after reassembly.

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

1. Add deterministic unit tests with synthetic block headers and Merkle trees.
2. Add a read-only API surface behind existing authorization and rate-limit boundaries.
3. Add resumable checkpoints and durable evidence receipts without storing RPC credentials.
4. Benchmark chunk sizes and concurrency against a sequential baseline.
5. Add transaction-level parsing and independent consensus checks only with a reviewed implementation and authoritative test vectors.
6. Add mining research as a separate worker pool. Mining nonce search is not the same operation as scanning or validating historical blocks.

## Evidence semantics

VERIFIED means only that every check listed in the verification scope passed for the requested range using the configured Bitcoin Core RPC source. It does not mean that the whole Bitcoin network was independently audited, that private keys or spendable coins were discovered, or that mining speed was increased.
