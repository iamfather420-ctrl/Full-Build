"""Fail closed unless a trusted Ed25519 authorization is valid at the optimizer."""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

SCRIPT = Path(__file__).resolve().parent / "verify-authorization.mjs"
TRUST = Path(__file__).resolve().parent / "trust-root"


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


def cryptographic_block(gate_path: Path) -> str:
    if not gate_path.is_file():
        return "Learning-engine gate is missing."
    if not SCRIPT.is_file():
        return "Trusted verifier is unavailable."
    process = subprocess.run(
        ["node", str(SCRIPT), "gate", "--gate", str(gate_path), "--trust", str(TRUST)],
        capture_output=True, text=True,
    )
    if process.returncode == 0:
        return "Verifier accepted without a trusted production key."
    return (process.stderr or process.stdout or "Authorization failed.").strip()


def block_reason_for_gate(path: Path, now: datetime | None = None) -> str | None:
    del now
    return cryptographic_block(path)


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
