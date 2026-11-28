# UD English-EWT language-resource assessment

**Audit date:** 2026-11-25  
**Item:** Universal Dependencies English Web Treebank (English-EWT), grammar and annotation  
**Decision:** **HUMAN_LICENSE_REVIEW** — record the resource and provenance, but do not import or redistribute the corpus files until the underlying-text rights are clarified.

## Version, source, and scope

The latest stable release verified is **UD v2.19, issued 2026-11-15**. The LINDAT/CLARIAH-CZ release record identifies the version and issue date; the EWT repository README changelog independently lists v2.19 dated 2026-11-15. The treebank web page still points to UD 2.18, and the GitHub Releases page lists only its historical r1.0 release, so those two pages are stale for latest-version identification. Use the dated release archive rather than a moving branch for reproducibility. [1] [2] [3] [4]

The canonical acquisition/snapshot record is [UD 2.19 at LINDAT, handle 11234/1-6316](https://hdl.handle.net/11234/1-6316). It offers `ud-treebanks-v2.19.tgz` (661.26 MB; MD5 `b17a48b52be561010470f8c5c2146809`) containing all treebanks. Extract only `UD_English-EWT/` if subsequently approved; the archive preview lists EWT train/dev/test CoNLL-U and text files, README, license, and stats. EWT itself is small: 16,622 sentences and about 254,820 words; its train CoNLL-U is listed as 14 MB, dev/test files about 1 MB each, and accompanying plain-text splits about 1.2 MB combined. This is feasible to store and review. [1] [2] [3]

Preserve the exact dataset name and release, EWT sentence IDs, the included README/LICENSE/stats, and the source and version identifiers. EWT documentation says sentence IDs include genre and the original LDC2012T13 filename; cite the treebank contributors and the original LDC resource rather than detaching rows from their provenance. [2] [3] [5]

## Licensing and rights assessment

The EWT README and LICENSE specify **CC BY-SA 4.0** for the treebank’s annotations and database rights. CC BY-SA 4.0 permits commercial sharing and adaptations of material actually covered by the license, subject to attribution and ShareAlike terms. The UD release license independently lists English-EWT as CC BY-SA 4.0 and explicitly warns that each treebank has its own terms; it is not a blanket license for all items in the archive. [2] [6] [7]

That license statement does **not** resolve rights in the underlying text. The README notes texts from multiple sources, identifies some possible third-party copyrights, and only says some parts are public domain. In the treebank’s own licensing discussion, the Stanford faculty member who coordinated the work said the annotations/database are licensed, the text status is “murky,” LDC gave a “no objection” without guaranteeing source-text status, and Stanford had made no official legal statement. The LDC catalog lists the source product under its LDC User Agreement for Non-Members; it does not provide a grant for unrestricted onward republication of EWT texts. Consequently, commercial reuse, redistribution, and modifications are clear for the licensed annotation/database component only, but **unclear or conditional for the complete CoNLL-U/text-bearing corpus**. This is an unresolved rights question, not legal advice. [2] [5] [8] [9]

**Recommendation:** retain METADATA_ONLY pending **human license review** of the text-bearing component and the distinction between annotations and source text. Do not import the files based solely on a repository-wide label or on the existence of a publicly downloadable archive. If cleared, pin the LINDAT v2.19 handle, retain its checksum and release README/LICENSE files, and record attribution plus ShareAlike obligations. The Wikidata CC0/full-dump issue is not applicable to this candidate.

## References

[1]: https://hdl.handle.net/11234/1-6316 "LINDAT Universal Dependencies 2.19 release record"
[2]: https://github.com/UniversalDependencies/UD_English-EWT "Official UD English-EWT repository and README"
[3]: https://universaldependencies.org/treebanks/en_ewt/index.html "Official UD English-EWT treebank documentation"
[4]: https://github.com/UniversalDependencies/UD_English-EWT/releases "Official English-EWT GitHub Releases page"
[5]: https://catalog.ldc.upenn.edu/LDC2012T13 "LDC English Web Treebank LDC2012T13 catalog record"
[6]: https://github.com/UniversalDependencies/UD_English-EWT/blob/master/LICENSE.txt "English-EWT LICENSE file"
[7]: https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons Attribution-ShareAlike 4.0 deed"
[8]: https://lindat.mff.cuni.cz/repository/static/license-ud-2.19.html "UD 2.19 collection license and treebank-specific license table"
[9]: https://github.com/UniversalDependencies/UD_English-EWT/issues/58 "English-EWT maintainers discussion of licensing and underlying-text status"
