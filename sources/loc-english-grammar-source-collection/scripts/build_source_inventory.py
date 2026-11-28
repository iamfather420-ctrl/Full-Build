#!/usr/bin/env python3
"""Build the canonical inventory and SHA-256 list for the reviewed source subsets."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = "2026-11-25"
RELEASE_FILE = "wikidata-20261118-lexemes.json.bz2"
RELEASE_SIZE = 494_932_541
RELEASE_SHA256 = "75499b8ce9ff7d9e8c2d9a0f6403301170dad053d1547d14fc87ac18f185ea00"


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def file_records(rel_dir: str) -> list[dict[str, object]]:
    folder = ROOT / rel_dir
    if not folder.is_dir():
        raise FileNotFoundError(folder)
    result = []
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        result.append({
            "path": path.relative_to(ROOT).as_posix(),
            "size_bytes": path.stat().st_size,
            "sha256": digest(path),
        })
    return result


def source(source_id: str, name: str, revision: str, upstream_urls: list[str],
           rel_dir: str, license_id: str, license_name: str, license_url: str,
           evidence_url: str, scope: str, conditions: list[str], **extra: object) -> dict[str, object]:
    return {
        "source_id": source_id,
        "name": name,
        "revision": revision,
        "acquired_on": DATE,
        "upstream_urls": upstream_urls,
        "license": {
            "identifier": license_id,
            "name": license_name,
            "license_url": license_url,
            "evidence_url": evidence_url,
            "assessment_status": "assessed_for_named_subset",
            "redistribution_scope": scope,
            "conditions_and_caveats": conditions,
        },
        "local_files": file_records(rel_dir),
        "training_status": "not_evaluated",
        "training_pipeline_enabled": False,
        **extra,
    }


def main() -> None:
    manifests = ROOT / "manifests"
    manifests.mkdir(parents=True, exist_ok=True)
    loc_path = ROOT / "data/training_sources/public_domain/english/provenance-manifest.json"
    loc_raw = loc_path.read_bytes()
    loc_manifest = json.loads(loc_raw)
    loc_sources = []
    for item in loc_manifest["sources"]:
        loc_sources.append({
            "item_id": item["item_id"],
            "slug": item["slug"],
            "title": item["title"],
            "author": item["author"],
            "publication_date": item["publication_date"],
            "source_url": item["source_url"],
            "pdf_path": item["pdf_file"],
            "pdf_size_bytes": item["pdf_bytes"],
            "pdf_sha256": item["pdf_sha256"],
            "text_path": item["text_file"],
            "text_size_bytes": item["text_bytes"],
            "text_sha256": item["text_sha256"],
            "rights_status": item["rights_status"],
            "training_eligible": item["training_eligible"],
        })

    onet = source(
        "onet-database-31.0-selected-tables",
        "O*NET Database 31.0 selected CSV tables",
        "Database 31.0 (August 2026)",
        [
            "https://www.onetcenter.org/dl_files/database/db_31_0_csv/occupation_data.csv",
            "https://www.onetcenter.org/dl_files/database/db_31_0_csv/job_titles.csv",
            "https://www.onetcenter.org/dl_files/database/db_31_0_csv/sample_of_reported_titles.csv",
        ],
        "data/industry/onet/31.0",
        "CC-BY-4.0",
        "Creative Commons Attribution 4.0 International",
        "https://creativecommons.org/licenses/by/4.0/",
        "https://www.onetcenter.org/license_db.html",
        "Three named downloadable Database 31.0 tables only; no broader O*NET content is covered by this record.",
        [
            "Provide O*NET attribution and indicate changes.",
            "Do not imply O*NET endorsement; observe O*NET trademark guidance.",
            "Title-source heterogeneity and underlying individual-content claims remain caveats in the assessment.",
        ],
        row_counts_excluding_header={
            "occupation_data.csv": 1016,
            "job_titles.csv": 54269,
            "sample_of_reported_titles.csv": 8189,
        },
    )
    gsa = source(
        "gsa-plain-language-guidelines-markdown",
        "Federal Plain Language Guidelines Markdown subset",
        "GSA/plainlanguage.gov commit 49d50c968f46e5218f7ee0313b313fd44de2bd73",
        [
            "https://github.com/GSA/plainlanguage.gov/tree/49d50c968f46e5218f7ee0313b313fd44de2bd73/_pages/guidelines",
            "https://github.com/GSA/plainlanguage.gov/blob/49d50c968f46e5218f7ee0313b313fd44de2bd73/LICENSE.md",
        ],
        "data/communication/plain-language/gsa-plainlanguage-49d50c9",
        "CC0-1.0",
        "Creative Commons CC0 1.0 Universal",
        "https://creativecommons.org/publicdomain/zero/1.0/",
        "https://github.com/GSA/plainlanguage.gov/blob/49d50c968f46e5218f7ee0313b313fd44de2bd73/LICENSE.md",
        "Markdown under the pinned _pages/guidelines/ subtree only; the historical PDF and media were excluded.",
        [
            "Keep the upstream repository commit, paths, and license notice.",
            "The Markdown snapshot is not asserted to be a separately verified publisher-hosted edition.",
        ],
        guideline_markdown_files=50,
    )
    glossary = source(
        "fankserver-llm-glossary-markdown",
        "LLM Technical Glossary Markdown subset",
        "fankserver/llm-glossary commit c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44",
        [
            "https://github.com/fankserver/llm-glossary/tree/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/src/content/docs",
            "https://github.com/fankserver/llm-glossary/blob/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/LICENSE",
        ],
        "data/technical-language/llm-glossary-c8483b3",
        "CC0-1.0",
        "Creative Commons CC0 1.0 Universal",
        "https://creativecommons.org/publicdomain/zero/1.0/",
        "https://github.com/fankserver/llm-glossary/blob/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/LICENSE",
        "Markdown under src/content/docs/ at the pinned commit only; site code and dependencies were excluded.",
        [
            "Keep original paths and inline source URLs.",
            "The assessment notes possible third-party verbatim material and recommends source-specific review if identified.",
            "The pinned commit was reported unsigned/unverified.",
        ],
        markdown_files=16,
    )
    wikidata = source(
        "wikidata-lexemes-2026-11-18",
        "Wikidata Lexemes JSON snapshot",
        "2026-11-18 Wikidata entities dump; Lexemes component",
        ["https://dumps.wikimedia.org/wikidatawiki/entities/20261118/wikidata-20261118-lexemes.json.bz2"],
        "data/semantic-knowledge/wikidata/lexemes-2026-11-18",
        "CC0-1.0",
        "Creative Commons CC0 1.0 Universal",
        "https://creativecommons.org/publicdomain/zero/1.0/",
        "https://www.wikidata.org/wiki/Wikidata:Licensing",
        "Structured data in the Wikidata Lexeme namespace; this does not generalize to media, arbitrary text, privacy/publicity rights, or every upstream contribution.",
        [
            "Preserve Lexeme, Form, and Sense IDs, language codes, statements, and source references.",
            "A concrete third-party claim must be escalated rather than assumed clear.",
            "Publisher checksum-listing endpoint returned HTTP 403; the local SHA-256 is not cross-checked against that listing.",
        ],
        release_asset={
            "filename": RELEASE_FILE,
            "download_url": "https://github.com/Solvex-Paradox-Box/loc-english-grammar-source-collection/releases/download/wikidata-lexemes-2026-11-18/" + RELEASE_FILE,
            "upstream_url": "https://dumps.wikimedia.org/wikidatawiki/entities/20261118/wikidata-20261118-lexemes.json.bz2",
            "size_bytes": RELEASE_SIZE,
            "sha256": RELEASE_SHA256,
            "compression_integrity": "bzip2 -t passed before release",
            "publisher_checksum_crosscheck": "unavailable; checksum-listing request returned HTTP 403",
        },
    )

    blocked = [
        ("princeton-wordnet-3.1", "Princeton WordNet 3.1", "blocked_pending_human_license_review", "Exact 3.1 database archive license attachment and obligations unclear."),
        ("ud-english-ewt", "Universal Dependencies English-EWT", "blocked_pending_human_license_review", "Underlying source-text redistribution rights unresolved despite annotation/database licensing."),
        ("cmudict", "CMU Pronouncing Dictionary", "blocked_pending_human_license_review", "README data-use statement and repository license mapping to the exact data file is unclear."),
        ("berkeley-framenet-1.7", "Berkeley FrameNet", "blocked_pending_human_license_review", "Berkeley licensing workflow conflicts with a third-party catalog label; no written clearance."),
        ("nist-ai-rmf-glossary", "NIST AI RMF terminology glossary", "blocked_pending_human_license_review", "Mutable, mixed-source glossary lacks a spreadsheet-specific blanket license and per-definition review."),
        ("openstax-principles-management", "OpenStax Principles of Management", "metadata_only", "Noncommercial terms and title-specific written-permission requirement for LLM ingestion."),
        ("openstax-principles-accounting", "OpenStax Principles of Accounting, Volume 1", "blocked_pending_human_license_review", "Noncommercial terms and title-specific written-permission requirement for LLM ingestion."),
        ("sba-business-guide", "SBA Business Guide", "blocked_pending_human_license_review", "Live-page text boundaries and third-party contributed/licensed components need human review."),
        ("nasa-systems-engineering-handbook", "NASA Systems Engineering Handbook", "blocked_pending_human_license_review", "Contractor authorship, third-party components, and exact commercial reuse scope unresolved."),
        ("nist-ssdf-sp-800-218", "NIST SP 800-218 SSDF v1.1", "blocked_pending_human_license_review", "Worldwide commercial reuse and possible non-NIST/third-party rights require human review."),
        ("openstax-introductory-statistics-2e", "OpenStax Introductory Statistics 2e", "blocked_pending_human_license_review", "Noncommercial terms and title-specific written-permission requirement for LLM ingestion."),
    ]
    candidate_reports = {
        "princeton-wordnet-3.1": "01-wordnet.md",
        "ud-english-ewt": "02-ud-english-ewt.md",
        "cmudict": "04-cmudict.md",
        "berkeley-framenet-1.7": "05-framenet.md",
        "nist-ai-rmf-glossary": "06-nist-ai-rmf.md",
        "openstax-principles-management": "08-openstax-management.md",
        "openstax-principles-accounting": "09-openstax-accounting.md",
        "sba-business-guide": "10-sba-business-guide.md",
        "nasa-systems-engineering-handbook": "11-nasa-se-handbook.md",
        "nist-ssdf-sp-800-218": "12-nist-ssdf.md",
        "openstax-introductory-statistics-2e": "14-openstax-statistics.md",
    }
    candidates = [
        {
            "candidate_id": key,
            "name": name,
            "decision": decision,
            "reason": reason,
            "assessment": f"docs/audits/2026-11-25-source-candidates/{candidate_reports[key]}",
        }
        for key, name, decision, reason in blocked
    ]
    acquired_candidates = [
        ("onet-database-31.0-selected-tables", "O*NET Database 31.0 selected tables", "acquired_named_subset", "13-onet.md"),
        ("gsa-plain-language-guidelines-markdown", "GSA Plain Language Guidelines Markdown", "acquired_named_subset", "15-plain-language.md"),
        ("fankserver-llm-glossary-markdown", "fankserver LLM glossary Markdown", "acquired_named_subset", "07-llm-glossary.md"),
        ("wikidata-lexemes-2026-11-18", "Wikidata Lexemes 2026-11-18 snapshot", "acquired_named_subset", "03-wikidata.md"),
    ]
    for key, name, decision, assessment in acquired_candidates:
        candidates.append({
            "candidate_id": key,
            "name": name,
            "decision": decision,
            "reason": "See acquired source record, pinned source assessment, scope, and license caveats.",
            "assessment": f"docs/audits/2026-11-25-source-candidates/{assessment}",
        })

    inventory = {
        "schema_version": "1.0",
        "generated_on": DATE,
        "repository": "Solvex-Paradox-Box/loc-english-grammar-source-collection",
        "purpose": "Inventory of preserved source records and newly acquired, scope-limited reference resources; not a training corpus.",
        "policy": {
            "no_automatic_training": True,
            "source_specific_license_assessment_required": True,
            "redistribution_permission_is_not_training_approval": True,
            "synthetic_records_added": 0,
            "generated_term_records_added": 0,
        },
        "preserved_collections": [{
            "collection_id": "loc-english-grammar-six-books",
            "path": "data/training_sources/public_domain/english",
            "source_provider": loc_manifest["source_provider"],
            "source_count": len(loc_sources),
            "provenance_manifest": "data/training_sources/public_domain/english/provenance-manifest.json",
            "provenance_manifest_sha256": hashlib.sha256(loc_raw).hexdigest(),
            "checksum_manifest": "data/training_sources/public_domain/english/SHA256SUMS.txt",
            "rights_status": loc_manifest["rights_status"],
            "training_eligible": loc_manifest["training_eligible"],
            "sources": loc_sources,
        }],
        "acquired_sources": [onet, gsa, glossary, wikidata],
        "candidate_assessments": candidates,
        "downstream_compatibility": {
            "consumer_repository": "iamfather420-ctrl/Full-Build",
            "audited_commit": "133cd82c23563e7b13ab636ef12d117db05ccf16",
            "submodule_path": "data/training_sources/public_domain/english",
            "pinned_source_commit": "8d1710185c9a5bb393d699f05195eea453dcf926",
            "active_training_run_id": 45661493760,
            "active_training_run_status_at_audit": "in_progress",
            "status_at_publication_check": "completed",
            "conclusion_at_publication_check": "success",
            "status_checked_at_utc": "2026-11-25T19:26:41Z",
            "consumer_files_or_inputs_changed": False,
            "new_sources_wired_into_training": False,
            "compatibility_decision": "reference-only; no direct training/runtime adapter validated",
        },
        "notes": [
            "The inventory is a source index, not an endorsement of every upstream assertion or a legal opinion.",
            "Content quality, duplicate resolution, definition normalization, semantic indexing, and training suitability remain unreviewed.",
            "The Wikidata archive is distributed as a GitHub Release asset; its local metadata and checksum sidecar are version-controlled.",
        ],
    }

    # Hash every local file in the acquired-source snapshots. Keep the release archive
    # separately represented in the source record and its .sha256 sidecar.
    local_paths = sorted({
        item["path"]
        for src in inventory["acquired_sources"]
        for item in src["local_files"]
    })
    sums_path = manifests / "SHA256SUMS-acquired.txt"
    sums_path.write_text(
        "".join(f"{digest(ROOT / rel)}  {rel}\n" for rel in local_paths),
        encoding="utf-8",
    )
    inv_path = manifests / "source-inventory.json"
    inv_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "inventory": str(inv_path),
        "sha256_manifest": str(sums_path),
        "local_acquired_files": len(local_paths),
        "preserved_loc_sources": len(loc_sources),
        "acquired_sources": len(inventory["acquired_sources"]),
        "blocked_or_metadata_only_candidates": len(blocked),
        "wikidata_asset_bytes": RELEASE_SIZE,
        "wikidata_sha256": RELEASE_SHA256,
    }, indent=2))


if __name__ == "__main__":
    main()
