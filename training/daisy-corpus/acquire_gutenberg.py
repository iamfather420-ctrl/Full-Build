#!/usr/bin/env python3
"""Acquire the first Daisy public-domain grammar-book batch from Project Gutenberg.

Downloads are stored outside Git. Every text must contain the Gutenberg
public-domain notice for the United States; failures stop the batch.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

WORKS = [
    {"id": "PG-14006", "ebook": 14006, "title": "An English Grammar", "authors": ["William Malone Baskervill", "James Witt Sewell"]},
    {"id": "PG-11615", "ebook": 11615, "title": "The Grammar of English Grammars", "authors": ["Goold Brown"]},
    {"id": "PG-14070", "ebook": 14070, "title": "English Grammar in Familiar Lectures", "authors": ["Samuel Kirkham"]},
    {"id": "PG-22577", "ebook": 22577, "title": "Practical Grammar and Composition", "authors": ["Thomas Wood"]},
    {"id": "PG-7188", "ebook": 7188, "title": "Higher Lessons in English", "authors": ["Alonzo Reed", "Brainerd Kellogg"]},
    {"id": "PG-15097", "ebook": 15097, "title": "A Grammar of the English Tongue", "authors": ["Samuel Johnson"]},
    {"id": "PG-30036", "ebook": 30036, "title": "Word Study and English Grammar", "authors": ["Frederick W. Hamilton"]},
    {"id": "PG-37134", "ebook": 37134, "title": "The Elements of Style", "authors": ["William Strunk"]},
]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "daisy-gutenberg-batch")
USER_AGENT = "DaisyOpenLanguageCorpus/1.0 (rights-reviewed public-domain acquisition)"


def acquire(work: dict) -> dict:
    ebook = work["ebook"]
    url = f"https://www.gutenberg.org/cache/epub/{ebook}/pg{ebook}.txt"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = response.read()
                final_url = response.geturl()
            break
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = str(exc)
            if attempt == 2:
                raise RuntimeError(f"{work['id']}: download failed: {last_error}") from exc
            time.sleep(2 ** attempt)

    if len(payload) < 2_000:
        raise RuntimeError(f"{work['id']}: payload unexpectedly small ({len(payload)} bytes)")
    text = payload.decode("utf-8-sig", errors="strict")
    if not re.search(r"public domain in the USA", text, re.IGNORECASE):
        raise RuntimeError(f"{work['id']}: required Project Gutenberg USA public-domain notice not found")
    if "START OF THE PROJECT GUTENBERG" not in text.upper():
        raise RuntimeError(f"{work['id']}: Gutenberg start marker missing")

    filename = f"{work['id'].lower()}-{ebook}.txt"
    path = OUT / filename
    path.write_bytes(payload)
    return {
        **work,
        "source": "Project Gutenberg",
        "sourceUrl": f"https://www.gutenberg.org/ebooks/{ebook}",
        "downloadUrl": final_url,
        "licenseEvidence": "Project Gutenberg text includes its public-domain-in-the-USA notice; preserve complete notice with this file.",
        "rightsScope": "USA_ONLY_UNLESS_INDEPENDENTLY_VERIFIED",
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "filename": filename,
        "acquiredAt": datetime.now(timezone.utc).isoformat(),
        "acquisitionStatus": "DOWNLOADED_LICENSE_NOTICE_PRESENT_PENDING_CONTENT_REVIEW",
    }


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "corpus": "DAISY_OPEN_LANGUAGE_CORPUS",
        "batch": "PROJECT_GUTENBERG_GRAMMAR_BOOKS_001",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "works": [],
        "status": "INCOMPLETE",
    }
    for work in WORKS:
        print(f"Acquiring {work['id']} — {work['title']}", flush=True)
        manifest["works"].append(acquire(work))
        time.sleep(1)
    manifest["status"] = "ACQUIRED_PENDING_DOCUMENT_REVIEW"
    manifest_path = OUT / "acquisition-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Acquired {len(manifest['works'])} works; manifest: {manifest_path}")
    print("NOTICE: this is not a blanket rights clearance or an approved SFT corpus.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        raise SystemExit(1)
