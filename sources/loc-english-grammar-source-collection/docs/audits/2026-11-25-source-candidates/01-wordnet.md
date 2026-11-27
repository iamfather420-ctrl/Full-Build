# Princeton WordNet — inclusion assessment

**Assessment date:** 2026-11-25  
**Candidate:** Princeton WordNet, lexical semantics  
**Decision:** **HUMAN_LICENSE_REVIEW**; do not import the dataset until the license-to-3.1 scope is confirmed.

## Release and acquisition

Princeton’s current-version page identifies WordNet 3.1 as available as **database files only**; it calls 3.0 the Unix/Linux release and dates that release to December 2006. The 3.1 news item is marked “6/11” but does not state a year. A HEAD request to Princeton’s direct 3.1 archive URL on the assessment date returned HTTP 200 and `Last-Modified: Mon, 27 Feb 2012 16:17:37 GMT`; this is server metadata, not an explicit release date. Princeton says the project is no longer developed and that it has no current plans for future releases. These records support 3.1 as the latest stable Princeton database revision identified on its site, while not establishing a precise 3.1 publication date. [1] [2] [3] [4]

**Direct snapshot:** [WordNet 3.1 database archive](https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz). HEAD metadata reports 16,358,468 bytes (about 16.36 MB / 15.60 MiB compressed). Princeton describes this as a tar archive of 3.1 database files, not a complete application package or source-code bundle. Its overview describes WordNet as having 117,000 synsets. This is a small, technically feasible acquisition; size is not the limiting factor. [2] [1] [4]

## Rights and conditions

Princeton’s license page says WordNet may be used in commercial applications subject to its license, and its download/citation guidance says commercial users may use WordNet free of charge when the license and attribution requirements are followed. The linked license text grants permission to use, copy, modify, and distribute the **software and database** for any purpose without fee or royalty, provided the copyright notice, license statements, and disclaimer are included on all copies, including modified copies. It also prohibits using Princeton’s name in advertising or publicity about distribution. The license disclaims warranties; WordNet is identified as a registered tradename. [5] [6] [7]

**Material scope uncertainty:** the text actually linked as the “WordNet 3.0 license” is headed “WordNet Release 3.0” and names WordNet 3.0 copyright 2006. Princeton’s page says the license is included as `LICENSE` in any downloaded version and gives general commercial-use language, but the 3.1 database-only download page does not separately identify or link a 3.1 license text. Therefore, although the published terms expressly authorize commercial use, redistribution, and modification for the named 3.0 release, the exact license attachment and obligations for the 3.1 database-only archive are not conclusively established by the cited release page. Treat all three rights for this exact candidate as **unclear or conditional** and obtain human license review before copying it into a public canonical repository. This is an operational risk assessment, not legal advice. [1] [5] [6]

## Preservation requirements if cleared

Preserve the exact source URL, revision `3.1`, retrieval date, archive checksum, and the original license/attribution text. Do not replace WordNet-native identifiers with locally generated IDs: retain part of speech and synset offsets, and preserve sense keys. Princeton documents that offsets vary across database versions and recommends sense keys as the best representation for systems referring to WordNet senses. Cite Princeton WordNet as requested by its citation page. [8] [9] [7]

## References

[1]: https://wordnet.princeton.edu/download/current-version "Princeton WordNet current version and downloads"
[2]: https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz "Princeton WordNet 3.1 database archive"
[3]: https://wordnet.princeton.edu/news-0 "Princeton WordNet news"
[4]: https://wordnet.princeton.edu/ "Princeton WordNet project status and overview"
[5]: https://wordnet.princeton.edu/license-and-commercial-use "Princeton WordNet license and commercial use page"
[6]: https://wordnetcode.princeton.edu/3.0/LICENSE "Princeton University WordNet Release 3.0 license text"
[7]: https://wordnet.princeton.edu/citing-wordnet "Princeton WordNet citation and attribution guidance"
[8]: https://wordnet.princeton.edu/documentation/senseidx5wn "Princeton WordNet sense index and sense-key documentation"
[9]: https://wordnet.princeton.edu/documentation/wndb5wn "Princeton WordNet database format documentation"
