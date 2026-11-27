# Canonical Language Source Collection

This public repository contains pinned, provenance-preserving language and terminology sources intended for later evaluation by downstream projects, including [Full-Build](https://github.com/iamfather420-ctrl/Full-Build). It is a source collection, not an automatically approved training corpus.

## Current collection

The six original Library of Congress English grammar books remain in `data/training_sources/public_domain/english/`. Their existing paths, manifests, and checksums are preserved.

The additional resources in this repository are limited to assessed subsets:

- `data/industry/onet/31.0/` — the O*NET 31.0 Occupation Data, Job Titles, and Sample of Reported Titles CSV tables, under the O*NET database-specific CC BY 4.0 terms.
- `data/communication/plain-language/gsa-plainlanguage-49d50c9/` — guideline Markdown from the pinned GSA `plainlanguage.gov` repository commit, CC0 1.0; the scope excludes the historical PDF and media.
- `data/technical-language/llm-glossary-c8483b3/` — the pinned LLM glossary Markdown subset, CC0 1.0; the scope excludes website code and dependencies.
- `data/semantic-knowledge/wikidata/` — metadata for the dated Wikidata Lexemes snapshot. The compressed source snapshot is distributed as a GitHub Release asset because it is too large for a regular Git file.

Every acquired source remains `not evaluated for training` unless a separate, recorded review changes that status. License permission to redistribute a source does not itself establish that the content is accurate, suitable, or approved for model training.

## Provenance and validation

`manifests/source-inventory.json` records the assessed sources, revisions, license references, exact paths, and validation status. `manifests/SHA256SUMS-acquired.txt` records hashes for the acquired in-repository files; the Wikidata release asset has a matching sidecar checksum. `schemas/term-record.schema.json` defines a source-linked record shape for future normalized terminology. The original LOC checksum manifest is not replaced or rewritten.

Run `python3 scripts/validate_sources.py` to verify the recorded local-file hashes and source inventory after that validator is added.

## Learning-engine staging gate

The dated [`learning-engine-gate-2026-11-27.json`](manifests/learning-engine-gate-2026-11-27.json) links the existing source inventory and records which named subsets may be staged for a downstream preflight. Staging is not training approval: existing training statuses remain unchanged, the LOC records still show `PENDING_REVIEW`, and no training pipeline or runtime adapter is enabled by this repository.

The 17-source review and rights decisions are recorded in [`source-candidate-register-2026-11-27.json`](manifests/source-candidate-register-2026-11-27.json) and [`the dated audit report`](docs/audits/2026-11-27-source-review-and-training-gate.md). No new candidate content was acquired. The NOAA NWS glossary is excluded until its remaining pages have been reviewed; other candidates remain excluded or metadata-only under the public-domain/CC0 selection rule.

## Scope and safeguards

Only the specific subsets and revisions named in their notices are covered by the license assessment. Do not infer license terms for other parts of upstream websites or repositories. Candidate datasets with unresolved rights questions are listed in `docs/audits/2026-11-25-source-candidates/`; they are not included as acquired content. No synthetic examples or conversations are supplied as training data.

This repository does not automatically train downstream models. Any downstream integration must pin a reviewed source revision and preserve source IDs, license evidence, and hashes. No changes to Full-Build training inputs are made by this repository update.
