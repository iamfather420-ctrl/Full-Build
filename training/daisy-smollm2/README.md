# Daisy local SmolLM2 fine-tuning

This workstream creates a Daisy-specific checkpoint by fine-tuning the Apache-2.0 SmolLM2-135M-Instruct foundation. It does not claim a Daisy checkpoint exists until a real training run produces one.

## Language-learning data

The Library of Congress collection contains six English grammar books. The text itself is the lesson material: Daisy learns from the original prose through **plain-text causal language modeling**. The pipeline does not fabricate chat conversations, Q&A pairs, synthetic examples, or numeric MLP features.

The source manifest records the Library of Congress rights statement for each title: "The books in this collection are in the public domain and are free to use and reuse." The language-training preparer independently checks that exact rights basis, source status, OCR byte counts, source SHA-256 values, and per-chunk text hashes. It creates source-disjoint train and validation splits and preserves all provenance.

The older quarantined preparation artifact remains unchanged for audit history. The new language-model corpus is a separate output:
- `artifacts/training/loc-english/language-model-corpus.jsonl`
- `artifacts/training/loc-english/language-model-audit.json`

The source manifest's legacy `PENDING_REVIEW` fields are not treated as a language-lesson annotation requirement. Eligibility for this collection is derived from the explicit LOC public-domain/free-reuse statement; the preparer does not rewrite the upstream manifest.

## Run locally or on a no-cost hosted CPU runner

Python 3.10/3.11 is required. No hosted inference or third-party AI API is called. Hugging Face is used only to download the pinned public foundation checkpoint and tokenizer. Training executes locally on the worker.

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r training/daisy-smollm2/requirements.txt
node scripts/prepare_loc_language_model_corpus.mjs
export DAISY_REQUIRE_CUDA=false
export DAISY_LM_TRAIN_FILE=artifacts/training/loc-english/language-model-corpus.jsonl
export DAISY_OUTPUT_DIR=artifacts/daisy-smollm2-loc-grammar
python training/daisy-smollm2/train_text.py
```

The manually triggered GitHub Actions workflow `.github/workflows/daisy-loc-grammar-training.yml` uses a standard hosted CPU runner. It does not provision Render resources or incur a GPU-worker charge. CPU fine-tuning may take substantially longer than GPU training.

## Evidence and release gates

The trainer verifies the LOC rights statement and every source/text hash before importing training dependencies or downloading the model. It records the immutable foundation revision, dataset hash, train/validation counts, metrics, device, checkpoint file hashes, and completion time.

Training completion is not activation authorization. The checkpoint remains a research artifact until independent inference/regression validation and the existing human authorization gates pass.
