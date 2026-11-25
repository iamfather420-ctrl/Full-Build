# Daisy local SmolLM2 fine-tuning

This workstream creates a Daisy-specific checkpoint by supervised fine-tuning the Apache-2.0 SmolLM2-135M-Instruct foundation. It does not claim that a Daisy checkpoint exists until a real training run produces one.

## Execution contract

- Training is local to the worker. Hugging Face is used only to retrieve the published foundation weights/tokenizer when they are not already cached; no hosted inference or third-party AI API is called.
- Training data must be supplied as a real, reviewed JSONL corpus. No generated/demo/synthetic records are permitted.
- Every record must include a unique `recordId`, `split` (`train` or `validation`), `messages` (chat messages), `sourceId`, `sourceSha256`, non-empty `evidenceRefs`, `verification: "VERIFIED"`, `licenseStatus: "APPROVED"`, and `trainingEligible: true`.
- Both train and validation splits must be non-empty. Duplicate IDs, invalid hashes, unverified records, missing provenance, unsupported roles, and empty message content fail closed.
- The 120 formal verification cases are not automatically a language-model corpus. Do not convert numeric MLP examples into conversational training data.
- The default foundation is `HuggingFaceTB/SmolLM2-135M-Instruct`. Pin the exact resolved model revision in the run manifest before a production run.
- The trainer writes a new checkpoint and a SHA-256 manifest. It never overwrites the base model.
- No deploy, production activation, or authority change is performed by this training job.

## Dataset

Place the approved corpus at `data/daisy_train.jsonl` on the training worker, or set `DAISY_TRAIN_FILE`. Each JSONL line is one record. See `dataset.schema.json` for the record contract. Do not commit private or sensitive training records to Git.

### Current LOC source collection status

The six-book Library of Congress collection has been checksum-verified and prepared as 847 quarantined text chunks (1,406,668 characters; dataset SHA-256 `44fe084e2f14cfad5428fef48ad1ee0dbf5d590493285db0e8d6d65201eb053d`). Its manifest and every chunk remain `PENDING_REVIEW` / `training_eligible: false`. This raw-text quarantine JSONL is intentionally **not** the conversational SFT schema above. The training gate is tested to reject it before importing training dependencies, downloading the foundation model, or creating a training output directory. Do not relabel or convert it to eligible data until the source-level rights review and a separate human review of any derived records are complete.

## Run

Use a dedicated GPU-capable worker with Python 3.10/3.11 and enough memory for full fine-tuning. PyTorch is an explicit runtime dependency. `DAISY_REQUIRE_CUDA` defaults to `true`; without a CUDA device the trainer stops before model download and output creation. Render's currently connected service is the Discovery Engine (free Node service), not a GPU training worker; do not run training there.

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r training/daisy-smollm2/requirements.txt
export DAISY_REQUIRE_CUDA=true  # default; blocks before model download if CUDA is unavailable
export DAISY_TRAIN_FILE=/secure-data/daisy_train.jsonl
export DAISY_OUTPUT_DIR=/secure-artifacts/daisy-smollm2-135m-run
export DAISY_MODEL_ID=HuggingFaceTB/SmolLM2-135M-Instruct
python training/daisy-smollm2/train.py
```

For offline execution, pre-stage the exact foundation snapshot and set `DAISY_MODEL_ID` to its local directory. Record the model revision and snapshot SHA-256 in the run manifest.

## Engine hand-offs

1. **Model Engine:** validate corpus, train, save checkpoint, tokenizer, metrics, and run manifest.
2. **Inference Engine:** load only the resulting checkpoint; run local smoke tests and regression tests; record runtime and model hashes.
3. **Discovery Engine:** independently verify source references, license approvals, dataset hashes, base model revision, training configuration, checkpoint hashes, and evaluation evidence. Discovery findings are evidence leads until independently validated.

## Release gate

A checkpoint is not eligible for activation unless the dataset and base-model lineage are complete, training exits successfully, checkpoint files hash correctly, held-out evaluation is recorded, local inference succeeds, and human authorization is separately recorded. Training completion is not authorization.
