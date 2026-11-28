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
DEFAULT_PROVENANCE = ROOT / "sources/loc-english-grammar-source-collection/data/training_sources/public_domain/english/provenance-manifest.json"
DEFAULT_BOOK_APPROVALS = Path(__file__).resolve().parent / "book-approvals-2026-11-27.json"
BOOK_APPROVAL_VERIFIER = Path(__file__).resolve().parent / "verify-book-approvals.mjs"


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
    """Fail closed unless exactly one LOC six-book group has an explicit approval record."""
    if not gate_path.is_file():
        return "Learning-engine gate is missing; LOC source approval cannot be established."
    try:
        payload = json.loads(gate_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return "Learning-engine gate is unreadable or malformed; LOC source approval cannot be established."
    groups = payload.get("source_groups") if isinstance(payload, dict) else None
    if not isinstance(groups, list):
        return "Learning-engine gate has no valid source_groups list."
    matches = [
        group for group in groups
        if isinstance(group, dict) and group.get("source_id") == "loc-english-grammar-six-books"
    ]
    if len(matches) != 1:
        return "Learning-engine gate must contain exactly one LOC six-book source group."
    group = matches[0]
    status = group.get("training_status")
    review = str(group.get("rights_and_review_status") or "")
    if status != "approved" or "PENDING_REVIEW" in review:
        return "LOC six books remain PENDING_REVIEW / training_status not_approved. A signature cannot authorize them until that source review is resolved."
    if not BOOK_APPROVAL_VERIFIER.is_file():
        return "Per-book approval verifier is unavailable."
    checked = subprocess.run(
        ["node", str(BOOK_APPROVAL_VERIFIER), "--provenance", str(DEFAULT_PROVENANCE),
         "--approvals", str(DEFAULT_BOOK_APPROVALS), "--trust", str(TRUST)],
        capture_output=True, text=True,
    )
    if checked.returncode != 0:
        return (checked.stderr or checked.stdout or "Per-book source approval failed.").strip()
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
    current = optimizer.step
    if getattr(current, "_daisy_authorization_wrapper", False):
        return optimizer

    def step(*args: Any, **kwargs: Any) -> Any:
        reason = verify()
        if reason:
            raise AuthorizationBlocked(f"BLOCKED: {reason}")
        return current(*args, **kwargs)

    step._daisy_authorization_wrapper = True
    optimizer.step = step
    return optimizer


def bind_training_optimizer(optimizer: Any, dataset_path: Path | str, gate_path: Path | str | None = None) -> Any:
    gate = Path(gate_path) if gate_path else DEFAULT_GATE
    dataset = Path(dataset_path)
    return seal_optimizer(optimizer, lambda: fresh_step_authorization(gate, dataset))


def _refuse_unsealed_training_mode(trainer: Any) -> None:
    args = getattr(trainer, "args", None)
    if args is None:
        return
    if getattr(args, "deepspeed", None):
        raise AuthorizationBlocked("BLOCKED: DeepSpeed is not a sealed optimizer path.")
    fsdp = getattr(args, "fsdp", None)
    if fsdp not in (None, "", False, [], "false"):
        raise AuthorizationBlocked("BLOCKED: distributed FSDP training is not a sealed optimizer path.")


def install_trainer_step_boundary(trainer: Any, verify: Callable[[], str | None]) -> Any:
    def reseal() -> None:
        optimizer = getattr(trainer, "optimizer", None)
        if optimizer is not None:
            seal_optimizer(optimizer, verify)

    original_create = trainer.create_optimizer

    def create_optimizer(*args: Any, **kwargs: Any) -> Any:
        created = original_create(*args, **kwargs)
        if getattr(trainer, "optimizer", None) is None:
            raise AuthorizationBlocked("BLOCKED: trainer created no optimizer.")
        seal_optimizer(trainer.optimizer, verify)
        return created

    trainer.create_optimizer = create_optimizer

    if hasattr(trainer, "optimizer_step"):
        original_optimizer_step = trainer.optimizer_step

        def optimizer_step(*args: Any, **kwargs: Any) -> Any:
            reseal()
            reason = verify()
            if reason:
                raise AuthorizationBlocked(f"BLOCKED: {reason}")
            return original_optimizer_step(*args, **kwargs)

        trainer.optimizer_step = optimizer_step

    if hasattr(trainer, "training_step"):
        original_training_step = trainer.training_step

        def training_step(*args: Any, **kwargs: Any) -> Any:
            reseal()
            return original_training_step(*args, **kwargs)

        trainer.training_step = training_step

    class ResealBeforeUpdate:
        def on_pre_optimizer_step(self, trainer_or_args: Any = None, *args: Any, **kwargs: Any) -> None:
            optimizer = kwargs.get("optimizer")
            if optimizer is not None:
                seal_optimizer(optimizer, verify)
            host = trainer_or_args if hasattr(trainer_or_args, "optimizer") else trainer
            current = getattr(host, "optimizer", None)
            if current is not None:
                seal_optimizer(current, verify)

    if hasattr(trainer, "add_callback"):
        trainer.add_callback(ResealBeforeUpdate())

    original_train = trainer.train

    def train(*args: Any, **kwargs: Any) -> Any:
        _refuse_unsealed_training_mode(trainer)
        reseal()
        return original_train(*args, **kwargs)

    trainer.train = train
    reseal()
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
