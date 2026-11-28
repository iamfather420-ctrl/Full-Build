#!/usr/bin/env python3
"""Download and validate six English grammar books from the Library of Congress."""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/training_sources/public_domain/english"
RAW = DEST / "raw"
TEXT = DEST / "extracted_text"
META = DEST / "metadata"

BOOKS = [
    {
        "item_id": "24000690",
        "slug": "marks-english-grammar-1923",
        "title": "English Grammar",
        "author": "L. E. Marks",
        "publication_date": "1923",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/englishgrammar00mark/englishgrammar00mark.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/englishgrammar00mark/englishgrammar00mark.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.englishgrammar00mark/",
        "expected_pages": 100,
    },
    {
        "item_id": "10033634",
        "slug": "hart-elementary-grammar-1878",
        "title": "An Elementary Grammar of the English Language",
        "author": "John S. Hart",
        "publication_date": "1878",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/elementarygramma00hart/elementarygramma00hart.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/elementarygramma00hart/elementarygramma00hart.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.elementarygramma00hart/",
        "expected_pages": 140,
    },
    {
        "item_id": "tmp96027691",
        "slug": "lewis-applied-grammar-1902",
        "title": "A Text-Book of Applied English Grammar",
        "author": "Edwin Herbert Lewis",
        "publication_date": "1902",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/textbookofapplie00lewi/textbookofapplie00lewi.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/textbookofapplie00lewi/textbookofapplie00lewi.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.textbookofapplie00lewi/",
        "expected_pages": 392,
    },
    {
        "item_id": "11018039",
        "slug": "vickroy-english-grammar-beginners-1870",
        "title": "An Introduction to the Study of English Grammar, for Beginners",
        "author": "Thomas Rhys Vickroy",
        "publication_date": "1870",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/introductiontost00vick/introductiontost00vick.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/introductiontost00vick/introductiontost00vick.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.introductiontost00vick/",
        "expected_pages": 108,
    },
    {
        "item_id": "40017591",
        "slug": "harvey-english-grammar-1870",
        "title": "Harvey's English Grammar",
        "author": "Thomas W. Harvey",
        "publication_date": "1870",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/harveysenglishgr00harv/harveysenglishgr00harv.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/harveysenglishgr00harv/harveysenglishgr00harv.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.harveysenglishgr00harv/",
        "expected_pages": 266,
    },
    {
        "item_id": "31022301",
        "slug": "bullions-principles-grammar-1862",
        "title": "The Principles of English Grammar",
        "author": "Peter Bullions",
        "publication_date": "1862",
        "pdf": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/principlesofeng00bull/principlesofeng00bull.pdf",
        "text": "https://tile.loc.gov/storage-services/public/gdcmassbookdig/principlesofeng00bull/principlesofeng00bull.text.txt",
        "resource": "https://www.loc.gov/resource/gdcmassbookdig.principlesofeng00bull/",
        "expected_pages": 260,
    },
]


def fetch(url: str, output: Path, *, attempts: int = 3, resume: bool = False) -> None:
    if output.exists() and output.stat().st_size > 0 and not resume:
        return
    if output.exists() and output.stat().st_size > 0 and resume:
        try:
            pdf_pages(output)
            return
        except Exception:
            pass
    if resume:
        command = [
            "curl", "-fL", "--retry", str(attempts), "--retry-all-errors",
            "--retry-delay", "2", "--connect-timeout", "30", "--max-time", "900",
            "-C", "-", "-A", "DaisyFullBuild/1.0", "-o", str(output), url,
        ]
        try:
            subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if not output.exists() or output.stat().st_size == 0:
                raise ValueError("empty response")
            return
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"resumable download failed: {exc.stderr.decode(errors='replace')[-500:]}") from exc
    last = None
    for attempt in range(1, attempts + 1):
        try:
            req = Request(url, headers={"User-Agent": "DaisyFullBuild/1.0"})
            with urlopen(req, timeout=90) as response:
                data = response.read()
            if not data or data.startswith(b"<!DOCTYPE html") or data.startswith(b"<html"):
                raise ValueError("empty or HTML error response")
            output.write_bytes(data)
            return
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            last = exc
            if attempt < attempts:
                time.sleep(2 * attempt)
    raise RuntimeError(f"download failed after {attempts} attempts: {last}")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def pdf_pages(path: Path) -> int:
    if not path.read_bytes().startswith(b"%PDF-"):
        raise ValueError("not a PDF file")
    try:
        output = subprocess.check_output(["pdfinfo", str(path)], text=True, stderr=subprocess.STDOUT)
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise ValueError(f"pdfinfo could not validate PDF: {exc}") from exc
    match = re.search(r"^Pages:\s+(\d+)$", output, re.MULTILINE)
    if not match:
        raise ValueError("PDF page count unavailable")
    return int(match.group(1))


def main() -> int:
    for directory in (RAW, TEXT, META):
        directory.mkdir(parents=True, exist_ok=True)
    results = []
    for book in BOOKS:
        print(f"Downloading {book['item_id']}: {book['title']}")
        result = {**book, "status": "FAILED", "rights_status": "PENDING_REVIEW", "training_eligible": False}
        pdf = RAW / f"{book['slug']}.pdf"
        text = TEXT / f"{book['slug']}.txt"
        try:
            metadata_url = f"https://www.loc.gov/item/{book['item_id']}/?fo=json"
            metadata_path = META / f"{book['item_id']}.json"
            fetch(metadata_url, metadata_path)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            item = metadata.get("item", {})
            rights = " ".join(re.sub(r"<[^>]+>", " ", x) for x in item.get("rights", []) or metadata.get("rights", []))
            result["loc_title"] = item.get("title")
            result["loc_date"] = item.get("date")
            result["loc_rights"] = html.unescape(" ".join(rights.split()))
            result["credit_line"] = "Library of Congress"
            fetch(book["pdf"], pdf, resume=True)
            fetch(book["text"], text)
            pages = pdf_pages(pdf)
            text_bytes = text.read_bytes()
            if not text_bytes.strip() or len(text_bytes.strip()) < 1000:
                raise ValueError("OCR/extracted text is empty or too short")
            result.update({
                "status": "VERIFIED",
                "pages": pages,
                "expected_pages_from_loc_resource": book["expected_pages"],
                "pdf_file": str(pdf.relative_to(ROOT)),
                "text_file": str(text.relative_to(ROOT)),
                "pdf_bytes": pdf.stat().st_size,
                "text_bytes": text.stat().st_size,
                "pdf_sha256": sha256(pdf),
                "text_sha256": sha256(text),
                "source_url": f"https://www.loc.gov/item/{book['item_id']}/",
                "actual_download_url": book["pdf"],
                "rights_review": "PENDING_REVIEW",
            })
            print(f"  VERIFIED pages={pages} pdf_bytes={pdf.stat().st_size}")
        except Exception as exc:
            result["error"] = str(exc)
            print(f"  FAILED: {exc}")
        results.append(result)

    verified = [r for r in results if r["status"] == "VERIFIED"]
    manifest = {
        "collection": "Daisy English Public-Domain Source Collection",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "repository_relative_path": "data/training_sources/public_domain/english",
        "source_provider": "Library of Congress",
        "training_eligible": False,
        "rights_status": "PENDING_REVIEW",
        "sources": results,
    }
    (DEST / "provenance-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sums = []
    for r in verified:
        sums += [f"{r['pdf_sha256']}  {r['pdf_file']}", f"{r['text_sha256']}  {r['text_file']}"]
    (DEST / "SHA256SUMS.txt").write_text("\n".join(sums) + ("\n" if sums else ""), encoding="utf-8")
    report = ["# Library of Congress English Grammar Download Report", "", f"Generated: {manifest['created_utc']}", "", f"Downloaded and fully verified: {len(verified)} / {len(results)}", "", "## Results", ""]
    for r in results:
        report.append(f"- **{r['status']}** — {r['item_id']} — {r['title']}")
        if r['status'] == 'VERIFIED':
            report.append(f"  - Pages: {r['pages']}; PDF: {r['pdf_bytes']} bytes; PDF SHA-256: `{r['pdf_sha256']}`")
        else:
            report.append(f"  - Error: {r.get('error')}")
    report += ["", "All records remain `rights_status: PENDING_REVIEW` and `training_eligible: false` until source and content review is complete."]
    (DEST / "DOWNLOAD_REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return 0 if len(verified) == len(results) else 2


if __name__ == "__main__":
    raise SystemExit(main())
