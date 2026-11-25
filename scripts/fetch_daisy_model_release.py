#!/usr/bin/env python3
"""Fetch the newest immutable Daisy model release and verify its SHA-256."""
import hashlib
import json
import os
import pathlib
import sys
import tempfile
import urllib.request

REPOSITORY = os.environ.get("DAISY_MODEL_RELEASE_REPOSITORY", "iamfather420-ctrl/Full-Build")
DESTINATION = pathlib.Path(os.environ.get("DAISY_MODEL_PATH", "/opt/daisy/model.gguf"))
API = f"https://api.github.com/repos/{REPOSITORY}/releases?per_page=100"


def request(url: str):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "Daisy-First-Party-Model-Loader/1",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    return urllib.request.urlopen(req, timeout=60)


def main() -> int:
    with request(API) as response:
        releases = json.load(response)
    candidates = [
        release for release in releases
        if str(release.get("tag_name", "")).startswith("daisy-model-")
        and not release.get("draft") and not release.get("prerelease")
    ]
    candidates.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    if not candidates:
        raise RuntimeError("BLOCKED: no published daisy-model-* release exists")

    assets = {asset["name"]: asset["browser_download_url"] for asset in candidates[0].get("assets", [])}
    if "daisy-model.gguf" not in assets or "daisy-model-manifest.json" not in assets:
        raise RuntimeError("BLOCKED: latest Daisy release is missing model or manifest asset")

    with request(assets["daisy-model-manifest.json"]) as response:
        manifest = json.load(response)
    if manifest.get("schema") != "daisy-gguf-release/v1" or manifest.get("status") != "CONVERTED_AND_GENERATION_TESTED":
        raise RuntimeError("BLOCKED: Daisy release manifest is not validated")
    if manifest.get("activation_authorized") is not False:
        raise RuntimeError("BLOCKED: unexpected activation authorization state")

    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="daisy-model-", suffix=".gguf", dir=str(DESTINATION.parent))
    os.close(fd)
    try:
        digest = hashlib.sha256()
        size = 0
        with request(assets["daisy-model.gguf"]) as response, open(temporary, "wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                digest.update(chunk)
                size += len(chunk)
        if digest.hexdigest() != manifest.get("sha256") or size != manifest.get("bytes"):
            raise RuntimeError("BLOCKED: downloaded Daisy model failed SHA-256/size verification")
        os.replace(temporary, DESTINATION)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

    print(json.dumps({
        "status": "MODEL_FILE_VERIFIED",
        "release_tag": candidates[0]["tag_name"],
        "model_path": str(DESTINATION),
        "bytes": size,
        "sha256": digest.hexdigest(),
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
