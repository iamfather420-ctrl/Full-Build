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

def _audio_ingestion(manifest: pathlib.Path | None) -> dict:
    if manifest is None:
        return {
            "status": "NOT_REQUESTED",
            "training_authorized": False,
            "optimizer_invocations": 0,
            "daisy_first_party_inference": "BLOCKED",
            "daisy_exchange_count": 0,
        }
    import importlib.util
    engine_path = pathlib.Path(__file__).resolve().parents[1] / "training" / "daisy-audio" / "engine.py"
    spec = importlib.util.spec_from_file_location("daisy_audio_engine", engine_path)
    if spec is None or spec.loader is None:
        raise SystemExit("BLOCKED: audio ingestion engine is missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    report = module.ingest_manifest(json.loads(manifest.read_text(encoding="utf-8")), root=manifest.parent)
    if report["training_started"] or report["optimizer_invocations"] or report["model_weights_changed"]:
        raise SystemExit("BLOCKED: audio ingestion attempted to train or change a checkpoint")
    return report


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source-root", required=True, type=pathlib.Path)
    p.add_argument("--expected-commit", required=True)
    p.add_argument("--output", required=True, type=pathlib.Path)
    p.add_argument("--audio-manifest", type=pathlib.Path)
    args = p.parse_args()
    root = args.source_root.resolve()
    actual = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    if actual != args.expected_commit:
        raise SystemExit(f"BLOCKED: source commit mismatch: {actual} != {args.expected_commit}")
    inventory_path = root / "manifests/source-inventory.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
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
        if source.get("training_status") == "approved" and source.get("training_pipeline_enabled") is True:
            license_info = source.get("license", {})
            if license_info.get("assessment_status") != "approved_for_training":
                quarantined.append({"source_id": source.get("source_id"), "reason": "training_license_approval_missing"})
            else:
                eligible.append(source.get("source_id"))
        else:
            quarantined.append({"source_id": source.get("source_id"), "reason": "not_explicitly_approved_for_training"})
    for collection in inventory.get("preserved_collections", []):
        if collection.get("training_eligible") is not True or collection.get("rights_status") != "APPROVED_FOR_TRAINING":
            quarantined.append({"source_id": collection.get("collection_id"), "reason": "collection_rights_or_training_eligibility_not_approved"})

    approved_count = len(eligible)
    stages = [
      {"stage": 1, "name": "canonical_source_sync", "status": "PASS", "evidence": {"repository": inventory.get("repository"), "commit": actual}},
      {"stage": 2, "name": "provenance_and_checksum_validation", "status": "PASS", "evidence": {"validator": "PASS", "stdout": validation.stdout[-3000:]}},
      {"stage": 3, "name": "rights_and_training_eligibility_gate", "status": "PASS" if approved_count else "BLOCKED", "evidence": {"approved_sources": eligible, "quarantined_sources": quarantined}},
      {"stage": 4, "name": "approved_corpus_construction", "status": "READY" if approved_count else "BLOCKED", "reason": None if approved_count else "No source currently has explicit training approval."},
      {"stage": 5, "name": "tokenizer_and_dataset_validation", "status": "BLOCKED", "reason": "Requires a non-empty approved corpus and pinned tokenizer configuration."},
      {"stage": 6, "name": "first_party_model_weight_training", "status": "BLOCKED", "reason": "Requires approved corpus, pinned training recipe, and a verified GPU-capable first-party runner. No training was started."},
      {"stage": 7, "name": "held_out_evaluation_and_model_integrity", "status": "BLOCKED", "reason": "Requires a genuinely trained checkpoint and held-out evaluation corpus."},
      {"stage": 8, "name": "artifact_packaging_and_local_inference_compatibility", "status": "BLOCKED", "reason": "Requires an evaluated checkpoint, model manifest, checksum, and compatible local inference format."}
    ]
    result = {
      "schema": "solvex-daisy-learning-pipeline-run/v1",
      "status": "BLOCKED" if not approved_count else "PRETRAINING_READY_REQUIRES_TRAINING_BACKEND",
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "source_repository": inventory.get("repository"),
      "source_commit": actual,
      "consumer_repository": "iamfather420-ctrl/Full-Build",
      "training_started": False,
      "model_weights_created": False,
      "optimizer_invocations": 0,
      "audio_ingestion": _audio_ingestion(args.audio_manifest),
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
