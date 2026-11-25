# Verified Daisy numerical dataset format

The weight engine is currently a numerical MLP trainer. This adapter accepts already
engineered numerical examples; it does not tokenize text, embed language, create labels,
or train a transformer/GGUF model.

Use UTF-8 JSONL: one record per line.

Required fields:

- `recordId`: unique record identifier.
- `split`: `train` or `validation`; split assignment must be made before training.
- `input`: finite numeric feature vector matching the model input width.
- `target`: finite numeric target vector matching the model output width.
- `sourceId`: source dataset identifier.
- `sourceSha256`: SHA-256 digest of the source artifact.
- `evidenceRefs`: one or more stable evidence references.
- `verification`: exactly `VERIFIED`.
- `licenseStatus`: exactly `APPROVED`.
- `trainingEligible`: exactly `true`.

The loader rejects missing provenance, unverified or unlicensed records, duplicate IDs,
dimension mismatches, non-finite values, and datasets without both train and validation
examples. It returns a manifest with a SHA-256 digest of the exact JSONL bytes.

No existing Daisy corpus is automatically converted by this adapter. A trusted upstream
exporter must produce this format from source records whose provenance, license, and
training eligibility have already been established. Do not set these flags merely to make
a record pass. Do not use synthetic `generateDataset()` output as a substitute for the
Daisy corpus.

This format is for the current MLP reference engine only. It does not create GGUF weights
or establish that a Daisy language model has been trained.
