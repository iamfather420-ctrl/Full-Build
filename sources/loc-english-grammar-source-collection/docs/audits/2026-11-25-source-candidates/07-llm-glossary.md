# 07 — fankserver LLM Technical Glossary

**Assessment date:** 2026-11-25. **Decision: ACQUIRE_SUBSET** — import only the glossary content under `src/content/docs/`, not the website/application code, package lockfile, or dependencies.

## Findings

The candidate is [fankserver/llm-glossary](https://github.com/fankserver/llm-glossary), described as a plain-language glossary focused on LLM inference and serving. Its Markdown pages cover model concepts, inference, quantization, GPU hardware, runtimes, deployment, monitoring, and related technical vocabulary. This is a useful specialist terminology supplement, not a general-purpose or balanced language corpus. The repository reports 305 KB in GitHub's size field. Its content tree contains 16 Markdown files (the 15 glossary categories plus the index), totaling 63,971 bytes by the tree's per-file sizes—about 62.5 KiB before any archive overhead.[1] [2]

There is no published release and the tags API returns an empty list. Therefore, there is no stable release/version to report; use the latest observed default-branch commit as the reproducible revision: `c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44`, committed 2026-07-29. GitHub marks the commit signature as unverified/unsigned. An immutable source snapshot is [this commit ZIP](https://github.com/fankserver/llm-glossary/archive/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44.zip); GitHub documents that archives can be pinned to a commit ID and retain that commit's file contents.[3] [4] [5]

The repository's `LICENSE` is CC0 1.0 Universal (GitHub SPDX: `CC0-1.0`). The README expressly says “Everything here” is CC0 and points to that license, so the declaration covers the glossary Markdown, not only code. CC0 permits copying, modification, redistribution, and commercial use without permission or attribution requirements. On that stated license basis, the exact Markdown subcomponent is redistributable and suitable for commercial use.[6] [7] [8]

Scope the import to `src/content/docs/*.md`. Preserve the source commit, each original relative file path, the term text and parenthetical aliases, and all inline source URLs. The entries do not appear to have dedicated stable record IDs; if the repository needs IDs, assign local deterministic IDs while retaining the original path and exact term as provenance. Sampled model-architecture and quantization entries are explanatory prose with links to papers, standards, and upstream documentation; serving-engine entries likewise link to upstream projects.[9] [10] [11]

## Limits and rights caveat

CC0's legal code applies only to rights the affirmer owns and expressly disclaims responsibility for rights held by others; it also makes no warranty of title, accuracy, or non-infringement. The repository license and README are affirmative evidence for the author's own glossary content, but they do not establish rights in any third-party text or protected marks that may appear in individual entries. The sampled definitions appear to be paraphrases rather than marked quotations, but this review did not establish provenance for every sentence. Do not import any discovered verbatim third-party material or other separately licensed asset under the blanket declaration without checking its rights. This is a rights caveat, not legal advice.[6] [7] [9] [10]

The glossary is recent and technically specialized; definitions may become outdated or be inaccurate. Keep provenance and source links, and treat this as terminology/reference text rather than validated authoritative definitions. No acquisition was performed for this assessment; neither GitHub repository was changed, no scripts were run, and the six Library of Congress books were left untouched.

## References

[1]: https://api.github.com/repos/fankserver/llm-glossary "Official GitHub repository metadata"
[2]: https://api.github.com/repos/fankserver/llm-glossary/git/trees/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44?recursive=1 "Official GitHub tree at the pinned commit"
[3]: https://github.com/fankserver/llm-glossary/releases "Repository releases page"
[4]: https://api.github.com/repos/fankserver/llm-glossary/tags?per_page=100 "Repository tags API"
[5]: https://api.github.com/repos/fankserver/llm-glossary/commits?per_page=1 "Latest default-branch commit evidence"
[6]: https://github.com/fankserver/llm-glossary/blob/main/README.md "Repository README and content-wide license statement"
[7]: https://github.com/fankserver/llm-glossary/blob/main/LICENSE "Repository CC0 1.0 license file"
[8]: https://creativecommons.org/publicdomain/zero/1.0/ "Creative Commons CC0 1.0 deed"
[9]: https://raw.githubusercontent.com/fankserver/llm-glossary/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/src/content/docs/model-architecture.md "Pinned model-architecture glossary source"
[10]: https://raw.githubusercontent.com/fankserver/llm-glossary/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/src/content/docs/quantization.md "Pinned quantization glossary source"
[11]: https://raw.githubusercontent.com/fankserver/llm-glossary/c8483b3c3f7fe6b02b8051bd6eb1238bd96c3c44/src/content/docs/serving-engines.md "Pinned serving-engines glossary source"
[12]: https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives "GitHub documentation for source code archives"
