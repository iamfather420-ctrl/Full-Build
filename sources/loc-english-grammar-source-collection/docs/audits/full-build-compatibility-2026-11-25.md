# Full-Build, training, and runtime compatibility — 2026-11-25

## Read-only compatibility result

At the time of the initial check, `iamfather420-ctrl/Full-Build` was at commit `133cd82c23563e7b13ab636ef12d117db05ccf16`. Its LOC submodule path, `data/training_sources/public_domain/english`, was pinned to source commit `8d1710185c9a5bb393d699f05195eea453dcf926`. Daisy LOC Grammar Language Training run `45661493760` was in progress at that commit when checked at 2026-11-25 17:08:16 UTC. A later read-only check on 2026-11-25 at 19:26:41 UTC showed the run completed successfully at the same commit.

The canonical repository additions are isolated to new source directories, provenance, schema, reports, and validation tooling. They do not change the six-book LOC directory, its provenance manifest, its checksum file, Full-Build's submodule gitlink, or the run's checked-out revision. No Full-Build files, workflows, inputs, artifacts, configuration, or run state were written, replaced, canceled, or restarted.

## What is and is not compatible

The existing Full-Build corpus preparation is intentionally LOC-specific. It reads the six source records in the LOC provenance manifest, verifies their recorded OCR hashes and byte counts, normalizes the text, and emits chunks marked `PENDING_REVIEW`, `training_eligible: false`, and `QUARANTINED_NOT_FOR_TRAINING`. The current trainer expects a separate, exact JSONL record schema. It checks source hashes, licensing evidence, and a positive training-eligibility flag before training. The newly acquired CSV, Markdown, and Wikidata dump formats do not satisfy either interface and have not been given adapters or converted into a trainer input.

Therefore the result is **reference-only and not directly training- or runtime-integrated**. The release asset is outside a normal submodule checkout, so consuming it would also require an explicit later retrieval step. No model, retrieval index, runtime package, or language-model corpus was built from these materials. No training or inference process was started by this work.

This is a static compatibility assessment of the pinned code and repository state, not an end-to-end integration test. An integration test was intentionally not run while the training job was active. Any later consumer change must be separately reviewed for source rights, content quality, provenance preservation, parser behavior, test coverage, and explicit governance approval. It should be made only after the current run has finished and should not broaden the LOC corpus or bypass its existing fail-closed checks.

## Evidence and related records

The downstream files inspected read-only were `docs/training/LOC_ENGLISH_CORPUS_PREPARATION.md`, `scripts/prepare_loc_english_corpus.mjs`, and `training/daisy-smollm2/train_text.py` at Full-Build commit `133cd82c23563e7b13ab636ef12d117db05ccf16`. The source repository inventory is in [`manifests/source-inventory.json`](../../manifests/source-inventory.json), and acquisition decisions are in [`acquisition-status-2026-11-25.md`](acquisition-status-2026-11-25.md).
