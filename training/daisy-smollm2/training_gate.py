"""Fail closed unless the learning-engine gate actually authorizes training."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def block_reason(status: Any, now: datetime | None = None) -> str | None:
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
    signature = status.get("signature")
    if not isinstance(signature, str) or not signature.strip():
        return "Authorization is unsigned."
    return None


def block_reason_for_gate(path: Path, now: datetime | None = None) -> str | None:
    if not path.is_file():
        return "Learning-engine gate is missing."
    payload = json.loads(path.read_text(encoding="utf-8"))
    status = payload.get("status") if isinstance(payload, dict) else None
    return block_reason(status, now)


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
