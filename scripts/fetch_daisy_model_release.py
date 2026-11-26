#!/usr/bin/env python3
"""Fetch the pinned Daisy model release and verify its manifest and model digests."""
import hashlib
import json
import os
import pathlib
import re
import sys
import tempfile
import urllib.parse
import urllib.request

REPOSITORY = os.environ.get("DAISY_MODEL_RELEASE_REPOSITORY", "iamfather420-ctrl/Full-Build")
RELEASE_TAG = os.environ.get("DAISY_MODEL_RELEASE_TAG", "daisy-model-45661493760")
EXPECTED_MANIFEST_SHA256 = os.environ.get(
    "DAISY_MODEL_MANIFEST_SHA256",
    "2df0edee400b7c5dce5f8ad2062de60a63876228c23edb3f42b4a331fbf4fc64",
).lower()
EXPECTED_MODEL_SHA256 = os.environ.get(
    "DAISY_MODEL_SHA256",
    "d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd",
).lower()
EXPECTED_MODEL_BYTES = int(os.environ.get("DAISY_MODEL_BYTES", "105454176"))
EXPECTED_DATASET_SHA256 = "79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7"
EXPECTED_MODEL_ID = "HuggingFaceTB/SmolLM2-135M-Instruct"
EXPECTED_LLAMA_CPP_COMMIT = "c74c71a6f7a0b06df30f979520e5d9a86a4d60ad"
DESTINATION = pathlib.Path(os.environ.get("DAISY_MODEL_PATH", "/opt/daisy/model.gguf"))
API = f"https://api.github.com/repos/{REPOSITORY}/releases/tags/{urllib.parse.quote(RELEASE_TAG, safe='')}"


def request(url: str):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "Daisy-First-Party-Model-Loader/1",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    return urllib.request.urlopen(req, timeout=60)


def main() -> int:
    if not re.fullmatch(r"[a-f0-9]{64}", EXPECTED_MANIFEST_SHA256):
        raise RuntimeError("BLOCKED: Daisy manifest SHA-256 pin is missing or invalid")
    if not re.fullmatch(r"[a-f0-9]{64}", EXPECTED_MODEL_SHA256):
        raise RuntimeError("BLOCKED: Daisy model SHA-256 pin is missing or invalid")

    with request(API) as response:
        release = json.load(response)
    if release.get("tag_name") != RELEASE_TAG or release.get("draft") or release.get("prerelease"):
        raise RuntimeError("BLOCKED: requested Daisy release is not the exact published release")
    if release.get("immutable") is not True and not EXPECTED_MANIFEST_SHA256:
        raise RuntimeError("BLOCKED: release is not GitHub-immutable and has no manifest digest pin")

    assets = {asset["name"]: asset for asset in release.get("assets", [])}
    if "daisy-model.gguf" not in assets or "daisy-model-manifest.json" not in assets:
        raise RuntimeError("BLOCKED: Daisy release is missing the model or manifest asset")
    manifest_asset = assets["daisy-model-manifest.json"]
    model_asset = assets["daisy-model.gguf"]

    with request(manifest_asset["browser_download_url"]) as response:
        manifest_bytes = response.read()
    manifest_digest = hashlib.sha256(manifest_bytes).hexdigest()
    if manifest_digest != EXPECTED_MANIFEST_SHA256:
        raise RuntimeError("BLOCKED: Daisy release manifest does not match the pinned SHA-256")
    if manifest_asset.get("digest") not in (None, f"sha256:{manifest_digest}"):
        raise RuntimeError("BLOCKED: GitHub manifest asset digest does not match downloaded manifest")
    manifest = json.loads(manifest_bytes)

    expected_source_run = RELEASE_TAG.removeprefix("daisy-model-")
    checks = {
        "schema": "daisy-gguf-release/v1",
        "status": "CONVERTED_AND_GENERATION_OBSERVED",
        "model_id": EXPECTED_MODEL_ID,
        "source_training_run_id": expected_source_run,
        "dataset_sha256": EXPECTED_DATASET_SHA256,
        "llama_cpp_commit": EXPECTED_LLAMA_CPP_COMMIT,
        "format": "GGUF",
        "quantization": "Q4_K_M",
        "file": "daisy-model.gguf",
        "sha256": EXPECTED_MODEL_SHA256,
        "bytes": EXPECTED_MODEL_BYTES,
        "generation_observed": True,
        "activation_authorized": False,
    }
    for key, expected in checks.items():
        if manifest.get(key) != expected:
            raise RuntimeError(f"BLOCKED: Daisy release manifest field {key!r} failed verification")
    if model_asset.get("digest") not in (None, f"sha256:{EXPECTED_MODEL_SHA256}"):
        raise RuntimeError("BLOCKED: GitHub model asset digest does not match the pinned model SHA-256")
    if model_asset.get("size") != EXPECTED_MODEL_BYTES:
        raise RuntimeError("BLOCKED: GitHub model asset size does not match the pinned manifest")

    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="daisy-model-", suffix=".gguf", dir=str(DESTINATION.parent))
    os.close(fd)
    try:
        digest = hashlib.sha256()
        size = 0
        with request(model_asset["browser_download_url"]) as response, open(temporary, "wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                digest.update(chunk)
                size += len(chunk)
        if digest.hexdigest() != EXPECTED_MODEL_SHA256 or size != EXPECTED_MODEL_BYTES:
            raise RuntimeError("BLOCKED: downloaded Daisy model failed pinned SHA-256/size verification")
        os.replace(temporary, DESTINATION)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

    integrity_mode = "GITHUB_IMMUTABLE" if release.get("immutable") is True else "MANIFEST_AND_MODEL_SHA256_PINNED"
    print(json.dumps({
        "status": "MODEL_FILE_VERIFIED",
        "release_tag": RELEASE_TAG,
        "release_integrity": integrity_mode,
        "manifest_sha256": manifest_digest,
        "model_path": str(DESTINATION),
        "bytes": size,
        "sha256": digest.hexdigest(),
        "activation_authorized": False,
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
