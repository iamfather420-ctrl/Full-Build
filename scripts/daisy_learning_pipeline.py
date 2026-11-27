#!/usr/bin/env python3
"""Fail-closed preflight for Daisy's canonical-source-to-model learning pipeline.

This command validates the canonical source inventory and emits an eight-stage
execution manifest. It never upgrades source rights status, invents approvals,
or claims training occurred.
"""
from __future__ import annotations
import argparse, hashlib, json, pathlib, subprocess, sys
from datetime import datetime, timezone

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source-root", required=True, type=pathlib.Path)
    p.add_argument("--expected-commit", required=True)
    p.add_argument("--learning-engine-gate", default="manifests/learning-engine-gate-2026-11-27.json", type=pathlib.Path)
    p.add_argument("--output", required=True, type=pathlib.Path)
    args = p.parse_args()
    root = args.source_root.resolve()
    actual = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    if actual != args.expected_commit:
        raise SystemExit(f"BLOCKED: source commit mismatch: {actual} != {args.expected_commit}")
    inventory_path = root / "manifests/source-inventory.json"
    if not inventory_path.is_file():
        raise SystemExit("BLOCKED: canonical source inventory is missing")
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    gate_path = (root / args.learning_engine_gate).resolve()
    if not gate_path.is_relative_to(root) or not gate_path.is_file():
        raise SystemExit("BLOCKED: canonical learning-engine gate is missing or outside the source repository")
    learning_gate = json.loads(gate_path.read_text(encoding="utf-8"))
    gate_status = learning_gate.get("status", {})
    if learning_gate.get("repository") != "Solvex-Paradox-Box/loc-english-grammar-source-collection":
        raise SystemExit("BLOCKED: learning-engine gate repository identity mismatch")
    training_authorized = (
        gate_status.get("model_training_authorized_by_this_manifest") is True and
        gate_status.get("training_pipeline_enabled") is True
    )
    source_inventory_sha256 = sha256_file(inventory_path)
    learning_engine_gate_sha256 = sha256_file(gate_path)
    policy = inventory.get("policy", {})
    if policy.get("no_automatic_training") is not True:
        raise SystemExit("BLOCKED: canonical no-automatic-training policy missing")
    if policy.get("source_specific_license_assessment_required") is not True:
        raise SystemExit("BLOCKED: source-specific license assessment policy missing")

    validator = root / "scripts/validate_sources.py"
    if not validator.is_file():
        raise SystemExit("BLOCKED: canonical source validator missing")
    validation = subprocess.run([sys.executable, str(validator)], cwd=root, text=True, capture_output=True)
    if validation.returncode:
        raise SystemExit("BLOCKED: canonical source validation failed: " + validation.stderr[-2000:])

    eligible = []
    quarantined = []
    for source in inventory.get("acquired_sources", []):
        license_info = source.get("license", {})
        if (training_authorized and source.get("training_status") == "approved" and
                source.get("training_pipeline_enabled") is True and
                license_info.get("assessment_status") == "approved_for_training"):
            eligible.append(source.get("source_id"))
        else:
            reason = "learning_engine_gate_not_authorized" if not training_authorized else "source_not_explicitly_approved_for_training"
            quarantined.append({"source_id": source.get("source_id"), "reason": reason})
    for collection in inventory.get("preserved_collections", []):
        source_items = collection.get("sources", [])
        all_items_approved = bool(source_items) and all(
            item.get("rights_status") == "APPROVED_FOR_TRAINING" and item.get("training_eligible") is True
            for item in source_items
        )
        if (not training_authorized or collection.get("training_eligible") is not True or
                collection.get("rights_status") != "APPROVED_FOR_TRAINING" or not all_items_approved):
            reason = "learning_engine_gate_not_authorized" if not training_authorized else "collection_or_source_rights_not_approved_for_training"
            quarantined.append({"source_id": collection.get("collection_id"), "reason": reason})
        else:
            eligible.append(collection.get("collection_id"))
    if not training_authorized:
        quarantined.append({"source_id": "learning-engine-gate", "reason": "model_training_authorization_or_pipeline_enablement_is_false"})

    approved_count = len(eligible) if training_authorized else 0
    stages = [
      {"stage": 1, "name": "canonical_source_sync", "status": "PASS", "evidence": {"repository": inventory.get("repository"), "commit": actual}},
      {"stage": 2, "name": "provenance_and_checksum_validation", "status": "PASS", "evidence": {"validator": "PASS", "stdout": validation.stdout[-3000:]}},
      {"stage": 3, "name": "rights_and_training_eligibility_gate", "status": "PASS" if approved_count and training_authorized else "BLOCKED", "evidence": {"training_authorized": training_authorized, "learning_engine_gate_sha256": learning_engine_gate_sha256, "approved_sources": eligible, "quarantined_sources": quarantined}},
      {"stage": 4, "name": "approved_corpus_construction", "status": "READY" if approved_count and training_authorized else "BLOCKED", "reason": None if approved_count and training_authorized else "No source and canonical learning-engine gate currently authorize training."},
      {"stage": 5, "name": "tokenizer_and_dataset_validation", "status": "BLOCKED", "reason": "Requires a non-empty approved corpus and pinned tokenizer configuration."},
      {"stage": 6, "name": "first_party_model_weight_training", "status": "BLOCKED", "reason": "Requires approved corpus, pinned training recipe, and a verified GPU-capable first-party runner. No training was started."},
      {"stage": 7, "name": "held_out_evaluation_and_model_integrity", "status": "BLOCKED", "reason": "Requires a genuinely trained checkpoint and held-out evaluation corpus."},
      {"stage": 8, "name": "artifact_packaging_and_local_inference_compatibility", "status": "BLOCKED", "reason": "Requires an evaluated checkpoint, model manifest, checksum, and compatible local inference format."}
    ]
    result = {
      "schema": "solvex-daisy-learning-pipeline-run/v1",
      "status": "BLOCKED" if not approved_count or not training_authorized else "PRETRAINING_READY_REQUIRES_TRAINING_BACKEND",
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "source_repository": inventory.get("repository"),
      "source_commit": actual,
      "source_inventory_sha256": source_inventory_sha256,
      "learning_engine_gate": args.learning_engine_gate.as_posix(),
      "learning_engine_gate_sha256": learning_engine_gate_sha256,
      "training_authorized": training_authorized,
      "eligible_source_ids": eligible,
      "consumer_repository": "iamfather420-ctrl/Full-Build",
      "training_started": False,
      "model_weights_created": False,
      "approved_source_count": approved_count,
      "stages": stages,
      "safety_note": "A successful preflight is not a training run, a model evaluation, or production authorization."
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f"PIPELINE_PREFLIGHT_FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
