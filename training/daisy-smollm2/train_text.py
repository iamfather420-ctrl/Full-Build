#!/usr/bin/env python3
"""Local plain-text causal-LM fine-tuning runner for Daisy."""
from __future__ import annotations
import hashlib, json, os, re, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from training_gate import block_reason_for_gate

DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
DEFAULT_REVISION = "eba0825ddc7730d24a88685a6c0a078cf919b383"
RIGHTS_PHRASE = "books in this collection are in the public domain and are free to use and reuse"

def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""): h.update(block)
    return h.hexdigest()

def load_records(path: Path) -> tuple[list[dict[str, Any]], str]:
    if not path.is_file(): raise RuntimeError(f"BLOCKED: language-model corpus not found: {path}")
    digest = file_sha256(path)
    rows, ids, splits = [], set(), Counter()
    with path.open(encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            if not line.strip(): raise RuntimeError(f"BLOCKED: blank JSONL line {line_no}")
            row = json.loads(line)
            required = {"schema","recordId","split","sourceId","sourceTitle","author","publicationYear","sourceUrl","sourceSha256","textSha256","text","rightsEvidence","rightsEvidenceUrl","licenseStatus","trainingEligible"}
            if not isinstance(row, dict) or set(row) != required: raise RuntimeError(f"BLOCKED: schema mismatch line {line_no}")
            if row["schema"] != "daisy-plain-text-lm-record/v1": raise RuntimeError(f"BLOCKED: unsupported record schema line {line_no}")
            if not isinstance(row["recordId"], str) or not row["recordId"] or row["recordId"] in ids: raise RuntimeError(f"BLOCKED: duplicate/empty recordId line {line_no}")
            ids.add(row["recordId"])
            if row["split"] not in {"train","validation"}: raise RuntimeError(f"BLOCKED: invalid split line {line_no}")
            if row["licenseStatus"] != "PUBLIC_DOMAIN_DECLARED_BY_LIBRARY_OF_CONGRESS" or row["trainingEligible"] is not True: raise RuntimeError(f"BLOCKED: source is not training eligible line {line_no}")
            if not isinstance(row["rightsEvidence"], str) or RIGHTS_PHRASE not in row["rightsEvidence"].lower(): raise RuntimeError(f"BLOCKED: missing explicit LOC public-domain evidence line {line_no}")
            if not re.fullmatch(r"[a-fA-F0-9]{64}", str(row["sourceSha256"])): raise RuntimeError(f"BLOCKED: invalid source hash line {line_no}")
            if not re.fullmatch(r"[a-fA-F0-9]{64}", str(row["textSha256"])): raise RuntimeError(f"BLOCKED: invalid text hash line {line_no}")
            if not isinstance(row["text"], str) or not row["text"].strip(): raise RuntimeError(f"BLOCKED: empty text line {line_no}")
            if hashlib.sha256(row["text"].encode("utf-8")).hexdigest() != row["textSha256"].lower(): raise RuntimeError(f"BLOCKED: text hash mismatch line {line_no}")
            rows.append(row); splits[row["split"]] += 1
    if not rows or not splits["train"] or not splits["validation"]: raise RuntimeError("BLOCKED: train and validation splits must both be non-empty")
    train_sources = {r["sourceId"] for r in rows if r["split"] == "train"}
    val_sources = {r["sourceId"] for r in rows if r["split"] == "validation"}
    if train_sources & val_sources: raise RuntimeError("BLOCKED: source leakage between train and validation splits")
    return rows, digest

def main() -> int:
    gate_path = Path(os.environ.get(
        "DAISY_LEARNING_GATE",
        "sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json",
    ))
    gate_block = block_reason_for_gate(gate_path)
    if gate_block:
        print(f"BLOCKED: {gate_block}", file=sys.stderr)
        return 2
    data_path = Path(os.environ.get("DAISY_LM_TRAIN_FILE", "artifacts/training/loc-english/language-model-corpus.jsonl"))
    output_dir = Path(os.environ.get("DAISY_OUTPUT_DIR", "artifacts/daisy-smollm2-loc-grammar"))
    model_id = os.environ.get("DAISY_MODEL_ID", DEFAULT_MODEL)
    revision = os.environ.get("DAISY_MODEL_REVISION", DEFAULT_REVISION)
    if not re.fullmatch(r"[a-fA-F0-9]{40}", revision):
        print("BLOCKED: model revision must be an immutable 40-character commit SHA", file=sys.stderr); return 2
    try: records, dataset_hash = load_records(data_path)
    except Exception as exc:
        print(str(exc), file=sys.stderr); return 2

    require_cuda = os.environ.get("DAISY_REQUIRE_CUDA", "false").lower()
    if require_cuda not in {"true","false"}:
        print("BLOCKED: DAISY_REQUIRE_CUDA must be true or false", file=sys.stderr); return 2
    try:
        import torch
        from datasets import Dataset
        from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling, Trainer, TrainingArguments
    except ImportError as exc:
        print(f"BLOCKED: training dependencies unavailable: {exc}", file=sys.stderr); return 2
    if require_cuda == "true" and not torch.cuda.is_available():
        print("BLOCKED: CUDA required but unavailable", file=sys.stderr); return 2
    device = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    max_length = int(os.environ.get("DAISY_MAX_LENGTH", "512"))
    epochs = float(os.environ.get("DAISY_EPOCHS", "3"))
    batch_size = int(os.environ.get("DAISY_BATCH_SIZE", "1"))
    learning_rate = float(os.environ.get("DAISY_LEARNING_RATE", "0.00002"))
    if output_dir.exists():
        print(f"BLOCKED: output directory already exists: {output_dir}", file=sys.stderr); return 2
    output_dir.mkdir(parents=True)

    tokenizer = AutoTokenizer.from_pretrained(model_id, revision=revision)
    if tokenizer.pad_token is None: tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    train_texts = [r["text"] for r in records if r["split"] == "train"]
    val_texts = [r["text"] for r in records if r["split"] == "validation"]
    def tokenize(batch): return tokenizer(batch["text"], truncation=True, max_length=max_length)
    train_ds = Dataset.from_dict({"text": train_texts}).map(tokenize, batched=True, remove_columns=["text"])
    val_ds = Dataset.from_dict({"text": val_texts}).map(tokenize, batched=True, remove_columns=["text"])
    model = AutoModelForCausalLM.from_pretrained(model_id, revision=revision)
    model.config.use_cache = False
    args = TrainingArguments(
        output_dir=str(output_dir / "trainer-state"), num_train_epochs=epochs,
        per_device_train_batch_size=batch_size, per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate, weight_decay=0.01, evaluation_strategy="epoch",
        save_strategy="epoch", logging_steps=10, load_best_model_at_end=True,
        metric_for_best_model="eval_loss", greater_is_better=False,
        fp16=bool(torch.cuda.is_available()), report_to=[], seed=420, data_seed=420,
        dataloader_num_workers=0
    )
    trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds,
        tokenizer=tokenizer, data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False))
    train_result = trainer.train()
    metrics = trainer.evaluate()
    checkpoint = output_dir / "checkpoint"
    trainer.save_model(str(checkpoint)); tokenizer.save_pretrained(str(checkpoint))
    files = sorted(p for p in checkpoint.rglob("*") if p.is_file())
    manifest = {
        "status":"TRAINING_COMPLETED", "training_mode":"plain_text_causal_language_modeling",
        "model_id":model_id, "model_revision":revision, "dataset_sha256":dataset_hash,
        "record_count":len(records), "train_records":len(train_texts), "validation_records":len(val_texts),
        "max_length":max_length, "epochs":epochs, "batch_size":batch_size, "learning_rate":learning_rate,
        "seed":420, "device":device, "train_metrics":train_result.metrics, "evaluation_metrics":metrics,
        "completed_at":datetime.now(timezone.utc).isoformat(),
        "checkpoint_files":[{"path":str(p.relative_to(checkpoint)),"bytes":p.stat().st_size,"sha256":file_sha256(p)} for p in files],
        "activation_authorized":False
    }
    (output_dir/"run-manifest.json").write_text(json.dumps(manifest,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({"status":manifest["status"],"device":device,"eval_loss":metrics.get("eval_loss"),"dataset_sha256":dataset_hash,"activation_authorized":False},indent=2))
    return 0

if __name__ == "__main__": raise SystemExit(main())
