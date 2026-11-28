# Source review and learning-engine gate — 2026-11-27

The 17-source assessment run completed with no failed reviews. It did **not** clear 16 of the leads for acquisition under the requested public-domain/CC0-only rule. The NOAA National Weather Service glossary is a public-domain candidate for the observed official glossary text, but only its A page was sampled. It is excluded from acquisition and training until the remaining alphabet pages and possible exceptions are checked. The machine-readable decisions and source evidence are in [`manifests/source-candidate-register-2026-11-27.json`](../../manifests/source-candidate-register-2026-11-27.json).

No candidate text from this review was acquired or added to the repository's data folders. A source appearing in a metadata register is not cleared for training.

## Candidate decisions

The M11 reassessment keeps WordNet 3.1 out: the exact archive's license attachment was not established, and no PD/CC0 dedication was found. [1] UD English-EWT remains metadata-only because its CC BY-SA annotation rights do not resolve rights in the embedded mixed-source text. [2] CMUdict's own README permits research and commercial use, but it asserts copyright, so it is not public domain or CC0. [3]

FrameNet remains blocked because Berkeley's request page is not a published reuse license and the NLTK label does not clear the exact package or embedded text. [4] The NIST AI glossary remains metadata-only because its live spreadsheet is sourced from mixed third-party material without an all-components PD/CC0 grant. [5] OpenStax *Principles of Management*, *Principles of Accounting* Volumes 1 and 2, and *Introductory Statistics 2e* are excluded from content ingestion: their noncommercial license and/or title-specific prior-written-permission terms do not meet the stated use. [6] [7] [11]

The SBA Business Guide remains metadata-only because its general government-content policy does not resolve exact page boundaries and contributed material. [8] NASA's handbook record says “Public Use Permitted,” but that does not by itself establish the requested PD/CC0 status for contractor-authored and possible third-party components. [9] NIST SP 800-218 remains metadata-only because its U.S. copyright statement does not settle the identified contributor and broader rights questions. [10]

The six new official-source leads also remain out of content inputs except as metadata. Census NAICS 2022 is a trilateral classification resource without a verified PD/CC0 grant for the full manual. [12] The IRS lead is not one exact, bounded source; the IRS content policy must be applied to a specific publication and its components. [13] The Census glossary has no verified material-specific PD/CC0 statement or stable revision in the reviewed pages. [14] NIST's CSRC glossary is a mixed-source aggregate and its public export does not clear every definition. [15] The USGS Water Science Glossary includes credited material whose complete rights scope was not established. [18]

The NOAA NWS glossary is the only new PD candidate identified, but it is **not ready for acquisition**: the review saw the browse-by-letter index and sampled the A page only. The index links pages for numbers and A–Z. No conclusion is made about the remaining pages. It is not CC0; any future bounded capture must preserve NWS attribution and disclaimer constraints. [16] [17]

## What is available for an engine

The public repository already contains the six preserved LOC books and four previously acquired named subsets. Their local paths and SHA-256 records remain in `manifests/source-inventory.json` and `manifests/SHA256SUMS-acquired.txt`; the Wikidata Lexemes archive is a release asset. This update does not change those files or hashes, add a derived corpus, or change Full-Build.

The existing records distinguish licensing/acquisition from model-training approval. The four acquired subsets still have `training_status: not_evaluated`; the LOC inventory and provenance records still say `PENDING_REVIEW` for rights/training eligibility. The repository also says no direct training/runtime adapter has been validated. Therefore, this collection is accessible as a pinned source library for a downstream preflight or staging step, but it is **not marked as an approved training corpus**. The new [`manifests/learning-engine-gate-2026-11-27.json`](../../manifests/learning-engine-gate-2026-11-27.json) makes that distinction machine-readable and defaults training to off.

## References

[1]: https://wordnet.princeton.edu/download/current-version "WordNet Current Version and Downloads"
[2]: https://lindat.mff.cuni.cz/repository/static/license-ud-2.19.html "Universal Dependencies v2.19 License Agreement"
[3]: https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/README "CMUdict README at the assessed commit"
[4]: https://framenet.icsi.berkeley.edu/data-request "FrameNet Data Licensing Request"
[5]: https://airc.nist.gov/glossary/ "NIST AI Resource Center Glossary"
[6]: https://openstax.org/books/principles-management/pages/1-introduction "OpenStax Principles of Management reuse notice"
[7]: https://openstax.org/books/principles-financial-accounting/pages/1-why-it-matters "OpenStax Principles of Accounting reuse notice"
[8]: https://www.sba.gov/about-sba/open-government/about-the-sba-gov-website "SBA.gov reproduction policy"
[9]: https://ntrs.nasa.gov/citations/20170001761 "NASA Systems Engineering Handbook NTRS record"
[10]: https://www.nist.gov/open/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series-publications "NIST research-product rights policy"
[11]: https://openstax.org/books/introductory-statistics-2e/pages/1-introduction "OpenStax Introductory Statistics 2e reuse notice"
[12]: https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf "2022 NAICS Manual"
[13]: https://www.irs.gov/about-irs/use-of-content-from-irsgov "IRS use of content policy"
[14]: https://www.census.gov/glossary/ "Official Census Bureau Glossary"
[15]: https://csrc.nist.gov/glossary "NIST CSRC Glossary"
[16]: https://forecast.weather.gov/glossary.php?letter=a "NOAA NWS glossary A entries"
[17]: https://www.weather.gov/disclaimer "NOAA/NWS data and third-party data disclaimer"
[18]: https://www.usgs.gov/water-science-school/science/water-science-glossary "USGS Water Science Glossary"
