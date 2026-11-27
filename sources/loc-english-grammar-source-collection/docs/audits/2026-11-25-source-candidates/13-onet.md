# O*NET Database (occupational vocabulary) — assessment

**Assessment date:** 2026-11-25. **Decision: ACQUIRE_SUBSET.** Use the occupation and title tables from O*NET 31.0 as a bounded U.S. occupational-vocabulary source, not the full occupational ratings database. O*NET’s archive identifies 31.0 (August 2026) as the current production release; 30.3 (May 2026) is the preceding release. [1]

## Version, scope, and acquisition

The recommended snapshot is **O*NET 31.0**, using `Occupation Data`, `Job Titles`, and `Sample of Reported Titles` in CSV form. The official dictionary documents 1,016 occupation records, 54,269 alternate/job titles, and 8,189 incumbent/expert-reported titles. That is approximately 63,474 rows before any deduplication; the two title tables are independently useful and should not be silently merged. [2] [3] [4]

Direct component files: [Occupation Data CSV](https://www.onetcenter.org/dl_files/database/db_31_0_csv/occupation_data.csv), [Job Titles CSV](https://www.onetcenter.org/dl_files/database/db_31_0_csv/job_titles.csv), and [Sample of Reported Titles CSV](https://www.onetcenter.org/dl_files/database/db_31_0_csv/sample_of_reported_titles.csv). The fixed-version [full CSV snapshot ZIP](https://www.onetcenter.org/dl_files/database/db_31_0_csv.zip) is an alternative acquisition source, but contains the broader database and is not the recommended repository subset. [1] [5]

On 2026-11-25, HTTP HEAD responses from the official host reported component sizes of 268,030, 4,504,432, and 601,127 bytes respectively (total **5,373,589 bytes, about 5.1 MiB**); the full CSV ZIP reported 16,237,378 bytes (about 15.5 MiB). The three component files reported `Last-Modified: Tue, 25 Aug 2026 03:51:10 GMT`. These are server metadata observations, not checksums or a downloaded-file verification. [5]

`Occupation Data` provides each O*NET-SOC code, official title, and description. Both title tables carry the O*NET-SOC code and occupation title for joining; Job Titles also has title-source codes, and Sample of Reported Titles identifies titles from incumbents or occupational experts. Preserve those codes and source fields, the table/column definitions, and source row distinctions. Keep the version, source URLs, retrieval date, and locally computed file checksums with any imported copy. [2] [3] [4]

## Rights and conditions

The **O*NET 31.0 Database Content License** expressly applies to the downloadable files linked from the database page and release archive, and licenses the database content under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. It permits copying and adaptation with credit to the O*NET 31.0 Database and USDOL/ETA, a link to the license, and an indication of changes. CC BY 4.0 expressly permits sharing and adaptation for commercial purposes. Thus, for these specified downloadable table files, commercial use, redistribution, and modifications are permitted subject to the license conditions. [6] [7]

This is not a blanket license for every O*NET-branded source: the database license limits its scope to named downloadable database/archive/Spanish-resource pages and sends career-exploration tools and other site content to separate licenses. The Job Titles documentation says records draw from multiple origins—including occupational classification systems, professional associations, government sources, user/web input, and employer postings—and preserves source codes. The database page nevertheless applies its CC BY license to the specified downloadable files; retain source codes and do not extend that conclusion to separate websites, tools, web-service responses, or unlisted materials. O*NET® is a USDOL/ETA trademark; follow its stated naming/display guidance and avoid implying endorsement. These are documented terms, not legal advice; any concern about individual third-party underlying material beyond the publisher’s stated database license remains for human review. [3] [6] [8]

## Suitability and risks

This is a useful, reproducible, small occupational terminology resource, especially alternate titles linked to stable occupational identifiers. It is U.S.-specific and employment-domain-specific rather than a general-purpose English dictionary; descriptions and reported titles are not simply a cleaned lexicon. Prefer only the named title/occupation tables, preserve O*NET-SOC identifiers and title-source provenance, and retain attribution and version/change notices. Do not import unrelated O*NET components under this table-level assessment. [2] [3] [4] [6]

## References

[1]: https://www.onetcenter.org/db_releases.html "O*NET Database Releases Archive"
[2]: https://www.onetcenter.org/dictionary/31.0/excel/occupation_data.html "Occupation Data — O*NET 31.0 Data Dictionary"
[3]: https://www.onetcenter.org/dictionary/31.0/excel/job_titles.html "Job Titles — O*NET 31.0 Data Dictionary"
[4]: https://www.onetcenter.org/dictionary/31.0/excel/sample_of_reported_titles.html "Sample of Reported Titles — O*NET 31.0 Data Dictionary"
[5]: https://www.onetcenter.org/database.html "O*NET Database"
[6]: https://www.onetcenter.org/license_db.html "O*NET 31.0 Database Content License"
[7]: https://creativecommons.org/licenses/by/4.0/ "Attribution 4.0 International — Creative Commons"
[8]: https://www.onetcenter.org/license_agreements.html "O*NET License Agreements"
