# Federal Plain Language Guidelines — resource assessment

**Decision: ACQUIRE_SUBSET.** Use only the official GSA `plainlanguage.gov` repository’s guideline Markdown at the pinned snapshot below. Do not import the historical PDF or media assets on the basis of the repository license alone. This is a small, useful communication/writing reference corpus; six existing Library of Congress books are unaffected.

## Version and acquisition

For the specifically titled publication, the latest identifiable numbered edition is **March 2011, Revision 1 (May 2011)**. The May 2011 label is visible in extant copies of the original PDF, but the accessible copy reviewed is hosted by a non-government mirror, not by the official publisher [6]. The official legacy PDF address, `https://www.plainlanguage.gov/media/FederalPLGuidelines.pdf`, now redirects to Digital.gov’s newer “Plain language guide series” rather than serving the old PDF [1]. The old title is not versioned in the archived repository; its index calls these the official Plain Writing Act guidelines and says they have been revised “every few years,” without identifying an edition [2]. Thus, do not treat the repository tree as a verified facsimile of the May 2011 PDF or as a formally versioned replacement.

A reproducible, directly browsable snapshot of the official archived guideline material is [`_pages/guidelines/` at commit `49d50c968f46e5218f7ee0313b313fd44de2bd73`](https://github.com/GSA/plainlanguage.gov/tree/49d50c968f46e5218f7ee0313b313fd44de2bd73/_pages/guidelines). The GSA repository is now read-only/archived (29 December 2025) [3]. This snapshot provides eight subject folders and 49 Markdown files within them; including the parent index, the tree is about **50 files / 171 KB of source text** (Git object byte counts), excluding repository build code and visual assets [4]. Acquisition is technically trivial and needs no paid infrastructure. Preserve the snapshot commit SHA, original relative paths, page titles/metadata, source URL, retrieval date, and license notice as provenance.

## Rights and scope

The exact recommended subcomponent is the guideline Markdown in the archived GSA repository—not a generic assumption about every item on the live or archived websites. The repository’s own `LICENSE.md` states that the project is public domain in the United States and waives worldwide copyright and related rights through **CC0 1.0 Universal**, expressly permitting copying, modification, distribution, and commercial use [5]. Its contributing policy says contributions to the project are released under the same dedication [7]. On that documented repository scope, commercial use, redistribution, and modifications of this Markdown subset are explicitly allowed. Keep a source citation and CC0/provenance note even though CC0 does not require attribution; do not imply GSA endorsement.

This does **not** establish that every component of Digital.gov, every third-party mirror, or the standalone 2011 PDF and embedded/linked graphics carry the same rights. Digital.gov says selected material was adapted from PlainLanguage.gov and warns that some photos/graphics are licensed or restricted [8]. The exact PDF’s separate rights statement was not verifiable from its now-redirecting official URL. Accordingly, the PDF and graphics are outside this recommendation; obtain human license review before importing either. This is a rights-screening assessment, not legal advice.

## References

[1]: https://www.plainlanguage.gov/media/FederalPLGuidelines.pdf "Legacy Federal Plain Language Guidelines PDF URL"
[2]: https://raw.githubusercontent.com/GSA/plainlanguage.gov/main/_pages/guidelines/index.md "Official archived guidelines index"
[3]: https://github.com/GSA/plainlanguage.gov/commit/49d50c968f46e5218f7ee0313b313fd44de2bd73 "GSA repository archive and guideline change history"
[4]: https://api.github.com/repos/GSA/plainlanguage.gov/contents/_pages/guidelines?ref=main "Official guideline-tree inventory"
[5]: https://github.com/GSA/plainlanguage.gov/blob/main/LICENSE.md "GSA plainlanguage.gov project license"
[6]: https://wid.org/wp-content/uploads/2022/03/FederalPLGuidelines.pdf "Hosted copy showing March 2011 and Revision 1, May 2011"
[7]: https://raw.githubusercontent.com/GSA/plainlanguage.gov/main/CONTRIBUTING.md "GSA plainlanguage.gov contribution policy"
[8]: https://digital.gov/guides/plain-language "Digital.gov plain language guide series and adaptation statement"
