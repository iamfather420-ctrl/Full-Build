#!/usr/bin/env python3
"""Verify the pinned source files and repository manifests without training."""
from __future__ import annotations

import argparse
import bz2
import csv
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "manifests/source-inventory.json"
SCHEMA = ROOT / "schemas/term-record.schema.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wikidata-file", type=Path, help="Optionally verify a local copy of the release asset")
    args = parser.parse_args()

    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise SystemExit("Unexpected record-schema dialect")
    required = schema.get("required", [])
    if not {"record_id", "term", "language", "source", "rights", "review"}.issubset(required):
        raise SystemExit("Canonical schema is missing required provenance/review fields")

    checked_files = 0
    for source in inventory["acquired_sources"]:
        if source.get("training_status") != "not_evaluated":
            raise SystemExit(f"Source is not safely quarantined from training: {source['source_id']}")
        for record in source.get("local_files", []):
            path = ROOT / record["path"]
            if not path.is_file():
                raise SystemExit(f"Missing acquired source file: {record['path']}")
            actual_size = path.stat().st_size
            actual_hash = sha256(path)
            if actual_size != record["size_bytes"] or actual_hash != record["sha256"]:
                raise SystemExit(f"Size/hash mismatch: {record['path']}")
            checked_files += 1

    expected_rows = {
        "data/industry/onet/31.0/occupation_data.csv": 1016,
        "data/industry/onet/31.0/job_titles.csv": 54269,
        "data/industry/onet/31.0/sample_of_reported_titles.csv": 8189,
    }
    for rel, expected in expected_rows.items():
        with (ROOT / rel).open(encoding="utf-8-sig", newline="") as stream:
            actual = sum(1 for _ in csv.reader(stream)) - 1
        if actual != expected:
            raise SystemExit(f"Unexpected O*NET row count for {rel}: {actual} != {expected}")

    loc = inventory["preserved_collections"][0]
    loc_root = ROOT / loc["path"]
    sums = loc_root / "SHA256SUMS.txt"
    subprocess.run(["sha256sum", "-c", str(sums)], cwd=ROOT, check=True, capture_output=True, text=True)

    release = inventory["acquired_sources"][-1].get("release_asset")
    release_checked = False
    if args.wikidata_file:
        candidate = args.wikidata_file.resolve()
        if candidate.stat().st_size != release["size_bytes"] or sha256(candidate) != release["sha256"]:
            raise SystemExit("Wikidata release asset size/hash mismatch")
        with bz2.open(candidate, "rb") as stream:
            stream.read(1)
        release_checked = True

    print(json.dumps({
        "status": "PASS",
        "local_source_files_verified": checked_files,
        "onet_row_counts_verified": expected_rows,
        "loc_original_sha256_manifest": "PASS",
        "term_record_schema": "PASS",
        "all_acquired_sources_training_status": "not_evaluated",
        "wikidata_release_asset_verified_locally": release_checked,
        "training_or_inference_run": False
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f"VALIDATION_FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
