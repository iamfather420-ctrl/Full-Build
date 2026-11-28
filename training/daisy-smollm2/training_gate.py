"""Fail closed unless a trusted Ed25519 authorization is valid at the optimizer."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

SCRIPT = Path(__file__).resolve().parent / "verify-authorization.mjs"
TRUST = Path(__file__).resolve().parent / "trust-root"
ROOT = Path(__file__).resolve().parents[2]
PINNED_DOCUMENT_ID = "loc-english-language-model-corpus"
PINNED_TENANT = "iamfather420-ctrl/Full-Build"
DEFAULT_GATE = ROOT / "sources/loc-english-grammar-source-collection/manifests/learning-engine-gate-2026-11-27.json"
DEFAULT_AUDIT = ROOT / "artifacts/training/loc-english/language-model-audit.json"
DEFAULT_DATASET = ROOT / "artifacts/training/loc-english/language-model-corpus.jsonl"
DEFAULT_TEXT_ROOT = ROOT / "sources/loc-english-grammar-source-collection/data/training_sources/public_domain/english/extracted_text"


class AuthorizationBlocked(RuntimeError):
    pass


def block_reason(status: Any, now: datetime | None = None) -> str | None:
    """Legacy field check. A passing result is not optimizer authorization."""
    if not isinstance(status, dict):
        return "Invalid authorization record."
    revoked = status.get("revokedAt")
    if isinstance(revoked, str) and revoked.strip():
        return "Authorization is revoked."
    expires = status.get("expiresAt")
    if expires not in (None, ""):
        try:
            expiry = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
        except ValueError:
            return "Authorization expiry is invalid."
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        current = now or datetime.now(timezone.utc)
        if expiry <= current:
            return "Authorization is expired."
    if status.get("valid") is False:
        return "Authorization is invalid."
    if status.get("model_training_authorized_by_this_manifest") is not True:
        return "model_training_authorized_by_this_manifest is not true."
    if status.get("training_pipeline_enabled") is not True:
        return "training_pipeline_enabled is not true."
    if not isinstance(status.get("signature"), str) or not str(status.get("signature")).strip():
        return "Authorization is unsigned."
    return "A nonempty signature is not cryptographic authorization."


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def independent_binding(dataset_path: Path, audit_path: Path = DEFAULT_AUDIT, text_root: Path = DEFAULT_TEXT_ROOT) -> dict[str, str] | str:
    """Expected identity comes from pinned configuration and recomputed files, never from an authorization record."""
    if not dataset_path.is_file():
        return "Dataset content is unavailable."
    if not audit_path.is_file():
        return "Dataset manifest is unavailable."
    content_hash = file_sha256(dataset_path)
    try:
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return "Dataset manifest is malformed."
    if not isinstance(audit, dict) or content_hash != audit.get("datasetSha256"):
        return "Dataset content hash does not match the manifest."
    sources = audit.get("sources")
    if not isinstance(sources, list) or not sources:
        return "Dataset manifest has no source content hashes."
    expected_hashes = {row.get("sourceSha256") for row in sources if isinstance(row, dict)}
    if any(not isinstance(item, str) or len(item) != 64 for item in expected_hashes):
        return "Dataset manifest source hashes are malformed."
    if not text_root.is_dir():
        return "Source content hashes are unavailable."
    found = {file_sha256(path) for path in sorted(text_root.glob("*.txt"))}
    if not found or found != expected_hashes:
        return "Source content hashes do not match the manifest."
    return {"documentId": PINNED_DOCUMENT_ID, "sourceSha256": content_hash, "tenant": PINNED_TENANT}


TRAINING_LINE = "smollm2-supervised-finetune"
PROPRIETARY_FROM_SCRATCH = False


def loc_books_review_block(gate_path: Path) -> str | None:
    """The six LOC books stay unauthorized until their own review record is approved."""
    if not gate_path.is_file():
        return None
    try:
        payload = json.loads(gate_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    groups = payload.get("source_groups") if isinstance(payload, dict) else None
    if not isinstance(groups, list):
        return None
    for group in groups:
        if not isinstance(group, dict) or group.get("source_id") != "loc-english-grammar-six-books":
            continue
        status = group.get("training_status")
        review = str(group.get("rights_and_review_status") or "")
        if status != "approved" or "PENDING_REVIEW" in review:
            return "LOC six books remain PENDING_REVIEW / training_status not_approved. A signature cannot authorize them until that source review is resolved."
    return None


def cryptographic_block(gate_path: Path, *, source_sha256: str, document_id: str, tenant: str, trust_dir: Path = TRUST) -> str | None:
    if not document_id.strip() or not tenant.strip() or len(source_sha256) != 64:
        return "Independent expected document, digest, or tenant is missing."
    if not gate_path.is_file():
        return "Learning-engine gate is missing."
    if not SCRIPT.is_file():
        return "Trusted verifier is unavailable."
    process = subprocess.run(
        ["node", str(SCRIPT), "gate", "--gate", str(gate_path), "--trust", str(trust_dir),
         "--document-id", document_id, "--source-sha256", source_sha256, "--tenant", tenant],
        capture_output=True, text=True,
    )
    if process.returncode == 0:
        return None
    return (process.stderr or process.stdout or "Authorization failed.").strip()


def fresh_step_authorization(gate_path: Path, dataset_path: Path, audit_path: Path = DEFAULT_AUDIT, text_root: Path = DEFAULT_TEXT_ROOT) -> str | None:
    binding = independent_binding(dataset_path, audit_path, text_root)
    if isinstance(binding, str):
        return binding
    review = loc_books_review_block(gate_path)
    if review:
        return review
    return cryptographic_block(
        gate_path,
        source_sha256=binding["sourceSha256"],
        document_id=binding["documentId"],
        tenant=binding["tenant"],
    )


def block_reason_for_gate(path: Path, now: datetime | None = None, dataset_path: Path = DEFAULT_DATASET) -> str | None:
    del now
    return fresh_step_authorization(path, dataset_path)


def seal_optimizer(optimizer: Any, verify: Callable[[], str | None]) -> Any:
    if getattr(optimizer, "_daisy_sealed", False):
        return optimizer
    inner = optimizer.step

    def step(*args: Any, **kwargs: Any) -> Any:
        reason = verify()
        if reason:
            raise AuthorizationBlocked(f"BLOCKED: {reason}")
        return inner(*args, **kwargs)

    optimizer.step = step
    optimizer._daisy_sealed = True
    return optimizer


def bind_training_optimizer(optimizer: Any, dataset_path: Path | str, gate_path: Path | str | None = None) -> Any:
    gate = Path(gate_path) if gate_path else DEFAULT_GATE
    dataset = Path(dataset_path)
    return seal_optimizer(optimizer, lambda: fresh_step_authorization(gate, dataset))


def install_trainer_step_boundary(trainer: Any, verify: Callable[[], str | None]) -> Any:
    original_create = trainer.create_optimizer

    def create_optimizer(*args: Any, **kwargs: Any) -> Any:
        created = original_create(*args, **kwargs)
        optimizer = getattr(trainer, "optimizer", None)
        if optimizer is None:
            raise AuthorizationBlocked("BLOCKED: trainer created no optimizer.")
        seal_optimizer(optimizer, verify)
        return created

    trainer.create_optimizer = create_optimizer
    if getattr(trainer, "optimizer", None) is not None:
        seal_optimizer(trainer.optimizer, verify)
    return trainer


def guarded_optimizer_step(check: Callable[[], str | None], optimize: Callable[[], None]) -> str | None:
    reason = check()
    if reason:
        return reason
    optimize()
    return None


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: training_gate.py GATE.json", file=sys.stderr)
        return 2
    reason = block_reason_for_gate(Path(sys.argv[1]))
    if reason:
        print(reason, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
