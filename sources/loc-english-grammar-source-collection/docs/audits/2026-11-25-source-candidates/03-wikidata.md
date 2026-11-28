# Wikidata structured knowledge — assessment

**Assessment date:** 2026-11-25  
**Decision:** `ACQUIRE_SUBSET` — only the Wikidata Lexemes entity component; do not mirror the full entity dump.

Wikidata’s official policy releases structured data in its main, Property, Lexeme, and EntitySchema namespaces under Creative Commons Zero 1.0 (CC0). CC0’s legal code expressly allows copying, modification, redistribution, and commercial purposes, to the extent of rights the affirmer can waive or license. Thus the structured-data license terms allow commercial use, redistribution, and modification. This conclusion is specific to structured data—not prose in other namespaces, images/media, or other components with their own terms. [1] [2]

There is an important rights qualification: Wikidata’s own licensing guidance says it tries to avoid data lacking CC0, but also acknowledges that imported-dataset copyright claims may be difficult to resolve and that community decisions do not establish whether such claims are valid. CC0 also does not waive trademark, patent, privacy, or publicity rights, and the license is not a warranty that every upstream contribution was rights-clear. This is an assessment of published terms, not legal advice; a specific disputed source or sensitive data warrants human review. [1] [2]

## Version, snapshot, and practical scope

There is no semantic version number for the changing dataset. The reproducible revision to record is the dated Wikimedia dump snapshot. As of 2026-11-25, the newest listed **Lexemes JSON** snapshot is `20261118`, published in its directory on 2026-11-18: [`wikidata-20261118-lexemes.json.bz2`](https://dumps.wikimedia.org/wikidatawiki/entities/20261118/wikidata-20261118-lexemes.json.bz2), 494,932,541 bytes (about 495 MB decimal / 472 MiB). The directory also lists a gzip version at 670,119,417 bytes and MD5/SHA-1 checksum manifests. [3]

The whole-entity JSON snapshot is substantially larger: the latest listed dated all-entities JSON in the inspected index is `20261116`, at 103,919,291,959 bytes (about 104 GB decimal / 96.8 GiB) as bzip2, or 157,184,992,349 bytes as gzip. The root index lists later dated folders, but the `20261120` folder did not contain the whole-entity JSON artifact; its listed files were lexeme and RDF-related exports. Wikidata describes its JSON and RDF dumps as stable interfaces and its database-download guidance calls the JSON dump recommended, but specifically warns against dumps when bandwidth, storage, or computing capacity is limited. A complete local query service is a substantial setup. No data were downloaded or scripts run for this audit. [3] [4] [5]

## Recommended bounded component and handling

Use only the dated Lexemes JSON snapshot above as the candidate language-source subset. Wikidata Lexemes represent words, phrases, and sentences across languages, with Lexeme, Form, and Sense entities; this is a directly bounded linguistic and lexical-semantic component and is small enough to acquire and process without paid infrastructure. It is not a replacement for Wikidata’s much larger Q-item knowledge graph, and it should be cataloged as Wikidata Lexemes rather than as a complete semantic graph. [6]

Make the source revision reproducible by pinning the date-specific URL, recording the retrieval date and checksum from the official manifest, and retaining the upstream entity IDs (`L…`, `F…`, `S…`), language codes, labels/gloss language tags, and available statement references/source snaks. The canonical JSON model identifies entities by stable IDs and carries labels/descriptions/aliases and claims; statements can include references that record provenance. Keep those references and identifiers in any derived subset instead of flattening away source information. CC0 does not require attribution, but preserving source provenance is important for auditability and later correction. [7] [8] [9]

Lexeme records are community-contributed and coverage, completeness, and quality vary by language; semantic links and source references may be missing. Keep the snapshot date explicit because Wikidata changes over time. The scope recommendation does not approve any separately sourced or embedded media, and any identified upstream rights dispute remains unresolved unless reviewed on its own facts. [1] [6] [9]

## References

[1]: https://www.wikidata.org/wiki/Wikidata:Licensing "Wikidata Licensing"
[2]: https://creativecommons.org/publicdomain/zero/1.0/legalcode "CC0 1.0 Universal Legal Code"
[3]: https://dumps.wikimedia.org/wikidatawiki/entities/20261118/ "Wikidata entity dump directory dated 2026-11-18"
[4]: https://dumps.wikimedia.org/wikidatawiki/entities/ "Wikidata entity dump index"
[5]: https://www.wikidata.org/wiki/Wikidata:Database_download "Wikidata Database Download"
[6]: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data "Wikidata Lexicographical Data"
[7]: https://doc.wikimedia.org/Wikibase/master/php/docs_topics_json.html "Wikibase JSON Structure Documentation"
[8]: https://www.wikidata.org/wiki/Wikidata:Data_access "Wikidata Data Access"
[9]: https://www.wikidata.org/wiki/Help:Sources "Wikidata Help Sources"
