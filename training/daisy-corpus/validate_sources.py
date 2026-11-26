#!/usr/bin/env python3
"""Fail-closed structural and policy checks for the Daisy source registry.

This validator does not grant copyright clearance. Every source remains subject
to document-level review before acquisition or training use.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REGISTRY = ROOT / "sources.json"
REQUIRED_SOURCE_FIELDS = {
    "id", "name", "url", "category", "status", "licenseBasis",
    "allowCommercialUse", "attributionRequired", "includeOnly", "exclude", "skills",
}
BLOCKED_LICENSE_MARKERS = ("CC BY-NC", "CC BY-ND", "non-commercial", "no derivatives")


def fail(message: str) -> None:
    print(f"BLOCKED: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read source registry: {exc}")

    if data.get("schemaVersion") != "1.0.0":
        fail("unsupported schemaVersion")
    if data.get("corpus") != "DAISY_OPEN_LANGUAGE_CORPUS":
        fail("unexpected corpus identifier")

    policy = data.get("policy", {})
    for key in (
        "requireExplicitLicenseEvidence",
        "requireDocumentLevelProvenance",
        "excludeUnclearRights",
        "excludeNonCommercial",
        "excludeNoDerivatives",
        "excludeThirdPartyEmbeddedContentUnlessSeparatelyCleared",
        "rawTextIsNotSftConversation",
        "derivedExamplesRequireHumanReview",
    ):
        if policy.get(key) is not True:
            fail(f"mandatory policy disabled: {key}")

    sources = data.get("sources")
    if not isinstance(sources, list) or not sources:
        fail("sources must be a non-empty array")

    seen = set()
    for index, source in enumerate(sources):
        missing = REQUIRED_SOURCE_FIELDS - source.keys()
        if missing:
            fail(f"source[{index}] missing fields: {sorted(missing)}")
        if source["id"] in seen:
            fail(f"duplicate source id: {source['id']}")
        seen.add(source["id"])
        if not source["url"].startswith("https://"):
            fail(f"{source['id']}: source URL must use HTTPS")
        if not source["licenseBasis"].strip():
            fail(f"{source['id']}: missing license basis")
        if not source["includeOnly"].strip() or not source["exclude"].strip():
            fail(f"{source['id']}: include/exclude rules must be explicit")
        if not isinstance(source["skills"], list) or not source["skills"]:
            fail(f"{source['id']}: skills must be a non-empty list")
        # A candidate may be structurally valid while not yet rights-approved.
        # This is intentional: discovery is not authorization.
        if source["allowCommercialUse"] is True and source["status"] not in (
            "PRIORITY_CANDIDATE", "APPROVED_DOCUMENTS_ONLY"
        ):
            fail(f"{source['id']}: inconsistent commercial-use approval status")
        if any(marker.lower() in source["licenseBasis"].lower()
               for marker in BLOCKED_LICENSE_MARKERS):
            fail(f"{source['id']}: incompatible license marker in approval basis")

    print(
        f"PASS: {len(sources)} source candidates structurally valid; "
        "0 sources granted blanket rights clearance."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
