#!/usr/bin/env python3
"""Fail-closed local SFT runner for Daisy's SmolLM2 foundation."""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from training_gate import bind_training_optimizer, block_reason_for_gate, fresh_step_authorization, install_trainer_step_boundary

DEFAULT_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
DEFAULT_MODEL_REVISION = "eba0825ddc7730d24a88685a6c0a078cf919b383"
REQUIRED = {
    "recordId", "split", "messages", "sourceId", "sourceSha256",
    "evidenceRefs", "verification", "licenseStatus", "trainingEligible",
}
ALLOWED_ROLES = {"system", "user", "assistant"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_verified_records(path: Path) -> tuple[list[dict[str, Any]], str]:
    if not path.is_file():
        raise RuntimeError(f"BLOCKED: verified training corpus not found: {path}")
    raw_hash = sha256_file(path)
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    splits: Counter[str] = Counter()

    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                raise RuntimeError(f"BLOCKED: blank JSONL line at {line_number}")
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"BLOCKED: invalid JSON at line {line_number}: {exc}") from exc
            if not isinstance(row, dict) or set(row) != REQUIRED:
                raise RuntimeError(f"BLOCKED: schema keys mismatch at line {line_number}")
            record_id = row["recordId"]
            if not isinstance(record_id, str) or not record_id.strip() or record_id in seen:
                raise RuntimeError(f"BLOCKED: empty or duplicate recordId at line {line_number}")
            seen.add(record_id)
            if row["split"] not in {"train", "validation"}:
                raise RuntimeError(f"BLOCKED: invalid split at line {line_number}")
            if row["verification"] != "VERIFIED" or row["licenseStatus"] != "APPROVED" or row["trainingEligible"] is not True:
                raise RuntimeError(f"BLOCKED: record is not verified, licensed, and training-eligible at line {line_number}")
            if not isinstance(row["sourceId"], str) or not row["sourceId"].strip():
                raise RuntimeError(f"BLOCKED: missing sourceId at line {line_number}")
            if not isinstance(row["sourceSha256"], str) or not re.fullmatch(r"[a-fA-F0-9]{64}", row["sourceSha256"]):
                raise RuntimeError(f"BLOCKED: invalid sourceSha256 at line {line_number}")
            refs = row["evidenceRefs"]
            if not isinstance(refs, list) or not refs or any(not isinstance(x, str) or not x.strip() for x in refs):
                raise RuntimeError(f"BLOCKED: missing evidenceRefs at line {line_number}")
            messages = row["messages"]
            if not isinstance(messages, list) or len(messages) < 2:
                raise RuntimeError(f"BLOCKED: messages must contain at least two turns at line {line_number}")
            for message in messages:
                if (not isinstance(message, dict) or set(message) != {"role", "content"}
                        or message["role"] not in ALLOWED_ROLES
                        or not isinstance(message["content"], str) or not message["content"].strip()):
                    raise RuntimeError(f"BLOCKED: malformed message at line {line_number}")
            if messages[-1]["role"] != "assistant":
                raise RuntimeError(f"BLOCKED: final message must be assistant at line {line_number}")
            records.append(row)
            splits[row["split"]] += 1

    if not records or not splits["train"] or not splits["validation"]:
        raise RuntimeError("BLOCKED: both non-empty train and validation splits are required")
    return records, raw_hash


def main() -> int:
    data_path = Path(os.environ.get("DAISY_TRAIN_FILE", "data/daisy_train.jsonl"))
    output_dir = Path(os.environ.get("DAISY_OUTPUT_DIR", "artifacts/daisy-smollm2-135m"))
    model_id = os.environ.get("DAISY_MODEL_ID", DEFAULT_MODEL)
    model_revision = os.environ.get("DAISY_MODEL_REVISION", DEFAULT_MODEL_REVISION)
    if not re.fullmatch(r"[a-fA-F0-9]{40}", model_revision):
        print("BLOCKED: DAISY_MODEL_REVISION must be an immutable 40-character commit SHA", file=sys.stderr)
        return 2
    max_length = int(os.environ.get("DAISY_MAX_LENGTH", "2048"))
    epochs = float(os.environ.get("DAISY_EPOCHS", "3"))
    batch_size = int(os.environ.get("DAISY_BATCH_SIZE", "4"))
    learning_rate = float(os.environ.get("DAISY_LEARNING_RATE", "0.00002"))

    try:
        records, dataset_hash = load_verified_records(data_path)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 2

    gate_path = Path(os.environ.get(
        "DAISY_LEARNING_GATE",
        "sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json",
    ))
    gate_block = block_reason_for_gate(gate_path, dataset_path=data_path)
    if gate_block:
        print(f"BLOCKED: {gate_block}", file=sys.stderr)
        return 2

    # Imports are delayed until after provenance checks so invalid/missing data
    # fails closed without downloading a model or allocating training resources.
    try:
        import torch
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
        from datasets import Dataset
    except ImportError as exc:
        print(f"BLOCKED: training dependencies unavailable: {exc}", file=sys.stderr)
        return 2

    require_cuda_raw = os.environ.get("DAISY_REQUIRE_CUDA", "true").lower()
    if require_cuda_raw not in {"true", "false"}:
        print("BLOCKED: DAISY_REQUIRE_CUDA must be 'true' or 'false'", file=sys.stderr)
        return 2
    require_cuda = require_cuda_raw == "true"
    if require_cuda and (not torch.cuda.is_available() or torch.cuda.device_count() < 1):
        print("BLOCKED: CUDA-capable training device is required; no model download or output creation performed", file=sys.stderr)
        return 2
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"

    output_dir.mkdir(parents=True, exist_ok=False)
    tokenizer = AutoTokenizer.from_pretrained(model_id, revision=model_revision)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    def render(row: dict[str, Any]) -> dict[str, str]:
        text = tokenizer.apply_chat_template(
            row["messages"], tokenize=False, add_generation_prompt=False
        )
        return {"text": text}

    rendered = [{"text": render(row)["text"], "split": row["split"]} for row in records]
    train_rows = [row for row in rendered if row["split"] == "train"]
    validation_rows = [row for row in rendered if row["split"] == "validation"]

    def tokenize_batch(batch: dict[str, list[str]]) -> dict[str, Any]:
        return tokenizer(batch["text"], truncation=True, max_length=max_length)

    train_ds = Dataset.from_list(train_rows).map(tokenize_batch, batched=True, remove_columns=["text", "split"])
    validation_ds = Dataset.from_list(validation_rows).map(tokenize_batch, batched=True, remove_columns=["text", "split"])
    model = AutoModelForCausalLM.from_pretrained(model_id, revision=model_revision)
    model.config.use_cache = False

    args = TrainingArguments(
        output_dir=str(output_dir / "trainer-state"),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="steps",
        logging_steps=10,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        fp16=bool(torch.cuda.is_available()),
        report_to=[],
        seed=420,
        data_seed=420,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=validation_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )
    install_trainer_step_boundary(trainer, lambda: fresh_step_authorization(gate_path, data_path))
    result = trainer.train()
    evaluation = trainer.evaluate()
    final_dir = output_dir / "checkpoint"
    trainer.save_model(str(final_dir))
    tokenizer.save_pretrained(str(final_dir))

    files = sorted(p for p in final_dir.rglob("*") if p.is_file())
    manifest = {
        "status": "TRAINING_COMPLETED",
        "model_id": model_id,
        "model_revision": model_revision,
        "dataset_path": str(data_path),
        "dataset_sha256": dataset_hash,
        "records": len(records),
        "train_records": len(train_rows),
        "validation_records": len(validation_rows),
        "max_length": max_length,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "seed": 420,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "device_name": device_name,
        "train_metrics": result.metrics,
        "evaluation_metrics": evaluation,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "checkpoint_files": [
            {"path": str(p.relative_to(final_dir)), "bytes": p.stat().st_size, "sha256": sha256_file(p)}
            for p in files
        ],
        "activation_authorized": False,
    }
    (output_dir / "run-manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": manifest["status"], "output_dir": str(output_dir), "eval_loss": evaluation.get("eval_loss"), "activation_authorized": False}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
