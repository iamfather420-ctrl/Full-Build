# NASA Systems Engineering Handbook — resource audit

**Checked:** 2026-11-25. **Recommendation: `HUMAN_LICENSE_REVIEW`; do not ingest the handbook text pending review.** The NASA Technical Reports Server (NTRS) record labels this exact publication “Public Use Permitted,” but NASA’s own terms warn that a NASA-released document may contain third-party copyrighted contributions, and that a government-purpose license or permission to NASA does not automatically transfer to others. Since this record lists contractor-affiliated coauthors, the metadata label alone does not settle whether the complete PDF is commercially redistributable or usable in commercial language-model development. This is a rights-screening recommendation, not legal advice. [2] [5]

## Identity, version, and scope

The resource is **NASA Systems Engineering Handbook**, NASA/SP-2016-6105 Rev. 2, NTRS Document ID **20170001761**. NTRS gives its publication date as **2017-02-17**, document type Special Publication, and authors Steven R. Hirshorn, Linda D. Voss, and Linda K. Bromley; the latter two affiliations are contractor organizations. Its copyright field says “Public Use Permitted.” [2]

Rev. 2 is the latest stable revision located in official NASA sources as of the check date: the NASA handbook page was updated 2024-03-27 and continues to present the six-chapter handbook, and NASA’s current program library, last updated 2025-01-31, still identifies it as NASA/SP-2016-6105 Rev. 2. These page-update dates are not evidence of a new numbered revision. [1] [3] The handbook covers broad systems-engineering processes, including technical requirements definition, requirements management, product implementation (including software), verification, and validation; it is not a dedicated software-engineering textbook. [4] [7] [8]

**Acquisition/snapshot:** [Official NTRS PDF](https://ntrs.nasa.gov/api/citations/20170001761/downloads/20170001761.pdf). An HTTP header check returned **4,122,125 bytes** (about 4.12 MB / 3.93 MiB); the table of contents reaches at least printed page 245, plus front matter and appendices. This is a small, technically straightforward single-document download; no acquisition or training script was run. The NASA handbook landing page also exposes chapter-by-chapter HTML, but NTRS is the stronger fixed-version snapshot. [1] [2] [4]

## Rights and repository decision

“Public Use Permitted” is favorable evidence that NASA released the report for public use, but it is not an SPDX or Creative Commons license and does not itself state a commercial-use grant for every embedded contribution. NASA STI’s general terms say documents are not protected by copyright unless noted and may then be reproduced and distributed; in the same notice, NASA cautions that some documents or portions are privately contributed or copyrighted, and that NASA’s government-purpose permission may not extend to other users. The handbook’s contractor coauthors make that caveat material for the complete document. I therefore rate **commercial use, redistribution, and modifications as unclear or conditional**, not explicitly allowed or prohibited. [2] [5]

There is an additional current-use issue for a language-source collection: NASA’s media/brand guidance contains an “SI Applications” section saying attribution of information directly to NASA in SI outputs is not permitted, while NASA STI’s general terms say NASA should be acknowledged as the source. The guidance permits a factual source disclosure but bars output language implying NASA review or endorsement. Whether this applies to this handbook and the repository’s required provenance/attribution practices needs human interpretation; this report does not resolve it or treat the guidance as a license. [5] [6]

**Disposition:** catalog metadata only while review is pending; do not import the PDF or extracted text until a reviewer resolves the exact contributor rights and commercial/AI-use conditions, and reconciles source provenance with NASA’s current SI guidance. Preserve the exact identifier `20170001761`, title, report number `NASA/SP-2016-6105 Rev. 2`, publication date, authors, official NTRS record/PDF URLs, and retrieval date. There is no Wikidata component in this candidate, so no Wikidata dump or subset is applicable. No repository changes were made; the existing six Library of Congress books remain untouched.

## References

[1]: https://www.nasa.gov/reference/systems-engineering-handbook/ "NASA Systems Engineering Handbook landing page"
[2]: https://ntrs.nasa.gov/citations/20170001761 "NASA NTRS record 20170001761"
[3]: https://soma.larc.nasa.gov/stp/dynamic/programlibrary.html "NASA DYNAMIC Program Library"
[4]: https://ntrs.nasa.gov/api/citations/20170001761/downloads/20170001761.pdf "NASA Systems Engineering Handbook Rev. 2 PDF"
[5]: https://sti.nasa.gov/disclaimers/ "NASA STI Disclaimers, Copyright Notice, and Terms of Use"
[6]: https://www.nasa.gov/nasa-brand-center/images-and-media/ "NASA Images and Media Usage Guidelines"
[7]: https://www.nasa.gov/reference/5-0-product-realization/ "NASA Systems Engineering Handbook chapter 5 Product Realization"
[8]: https://www.nasa.gov/reference/6-2-requirements-management/ "NASA Systems Engineering Handbook chapter 6.2 Requirements Management"
