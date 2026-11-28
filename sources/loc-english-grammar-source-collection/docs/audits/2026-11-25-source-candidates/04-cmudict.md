# CMU Pronouncing Dictionary (CMUdict) — assessment

**Decision: HUMAN_LICENSE_REVIEW.** Keep a metadata record only until a qualified reviewer resolves the scope and interaction of CMUdict’s data-specific README statement and the repository LICENSE. This is a rights-uncertainty flag, not legal advice.

## Version, source and feasibility

The official CMU dictionary page identifies the current dictionary as **version 0.7b** and describes more than 134,000 North American English words and pronunciations, represented with ARPAbet phones and lexical stress. CMU Sphinx’s dated announcement reports the 0.7b update on **November 20, 2014**. The official GitHub repository has no releases and no tags, so 0.7b is the latest stable dictionary version evidenced by CMU’s current page, not a release tag. The repository’s latest `master` commit is **74790861f652b15e4ac49015a90074ad62a27690**, dated **October 24, 2025**; treat this as a reproducible repository snapshot, not a newly versioned dictionary release. [1] [2] [3] [4]

The exact dictionary file is available at the immutable direct URL below. GitHub’s Contents API reports **3,618,488 bytes** for `cmudict.dict` (about 3.6 MB decimal; roughly 3.45 MiB). A pinned full repository archive is also directly accessible. This is modest and technically feasible to ingest; no training, dataset download, or acquisition script was run for this assessment. [5] [6]

**Recommended bounded record:** If the repository accepts a metadata-only entry, identify the resource as “CMU Pronouncing Dictionary (CMUdict),” version `0.7b`, and separately record snapshot commit `74790861f652b15e4ac49015a90074ad62a27690`, file `cmudict.dict`, the file’s Git blob SHA `2c0411740cce3e2026a80b90b650d5f6a7258164`, source URL, and retrieval/verification date **2026-11-25**. Preserve the upstream README and LICENSE alongside any future authorized copy, plus the requested origin acknowledgment. Do not treat the repo HEAD SHA as the dictionary’s own version identifier. [1] [5] [6]

## Rights assessment and limits

The data-specific README says use for “any research or commercial purpose is completely unrestricted,” and requests acknowledgment if the material is used or redistributed. The repository also has a separate LICENSE that permits source and binary redistribution and modification subject to retaining the copyright, conditions, and disclaimer. However, the repository’s API reports `NOASSERTION` for SPDX licensing; the README and LICENSE give different copyright end years (2014 and 2015), and neither page explicitly maps the LICENSE clauses to each data file versus the repository’s accompanying code. The source therefore supports a permissive-use reading, but the precise license identity and applicable obligations for redistributing this exact dataset are not sufficiently unambiguous to approve importing it without human license review. [1] [2] [7]

CMU warns the dictionary may contain errors, omissions, and inconsistencies. Its published scope is North American English; it should not be treated as a comprehensive or language-neutral pronunciation source. [1] [3]

## References

[1]: https://raw.githubusercontent.com/cmusphinx/cmudict/master/README "Official CMUdict README"
[2]: https://github.com/cmusphinx/cmudict/blob/master/LICENSE "Official CMUdict repository LICENSE"
[3]: https://www.speech.cs.cmu.edu/cgi-bin/cmudict "CMU dictionary lookup and description"
[4]: https://cmusphinx.github.io/2014/11/cmudict-0-7b-update/ "CMU Sphinx announcement of CMUdict 0.7b"
[5]: https://api.github.com/repos/cmusphinx/cmudict/commits/master "Official GitHub API current-branch commit record"
[6]: https://api.github.com/repos/cmusphinx/cmudict/contents/cmudict.dict "Official GitHub API dictionary-file metadata"
[7]: https://api.github.com/repos/cmusphinx/cmudict "Official GitHub API repository metadata and SPDX status"
[8]: https://github.com/cmusphinx/cmudict/releases "Official CMUdict GitHub releases page"
[9]: https://api.github.com/repos/cmusphinx/cmudict/tags "Official CMUdict GitHub tags API"
[10]: https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict "Pinned direct CMUdict data file"
[11]: https://codeload.github.com/cmusphinx/cmudict/tar.gz/74790861f652b15e4ac49015a90074ad62a27690 "Pinned CMUdict repository snapshot archive"
