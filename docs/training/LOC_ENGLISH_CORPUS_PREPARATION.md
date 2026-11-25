# LOC English corpus preparation

The LOC collection is pinned as a Git submodule at
`data/training_sources/public_domain/english`.

## Prepare review-only corpus

From the Full-Build repository root, after initializing submodules:

```bash
git submodule update --init --recursive
node scripts/prepare_loc_english_corpus.mjs
```

The command verifies all six OCR text files against the SHA-256 digests and
byte counts in `provenance-manifest.json`, normalizes text to Unicode NFC,
and writes deterministic paragraph-aware chunks to:

- `artifacts/training/loc-english/quarantined-corpus.jsonl`
- `artifacts/training/loc-english/preparation-audit.json`

Every chunk is labeled `PENDING_REVIEW`,
`training_eligible: false`, and
`QUARANTINED_NOT_FOR_TRAINING`. The audit records the source and output
hashes. The script does not call Discovery assertions, the numerical MLP
trainer, an external model API, or an inference engine. It does not create
model weights.

## Gate before training

A human must review source rights and OCR quality, then approve each source
through a separate, auditable rights-review process. Do not edit the
quarantine output to bypass that gate. This six-book grammar collection is
a narrow language resource, not by itself a general-purpose model-training
corpus.
