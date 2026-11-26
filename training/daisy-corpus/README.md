# Daisy Open Language Corpus

This directory establishes the source-controlled acquisition and review process for Daisy's language-learning corpus. It does **not** claim that source books have already been downloaded or that model weights have been trained.

## Acquisition principles

1. Prefer U.S. federal-government works created by government employees in the course of official duties, explicitly public-domain collections, and openly licensed educational works.
2. Verify rights at the work or document level. A site's general openness, free access, or a dataset's umbrella license is not enough.
3. Exclude embedded third-party material unless its rights are independently verified (for example, wire-service photographs, articles, illustrations, or audio).
4. Preserve the original source, retrieval date, exact license statement, author/publisher, publication date, URL, and SHA-256 for every acquired document.
5. Keep raw source text separate from derived instruction examples. A public-domain book is source material, not automatically a conversational training record.
6. Derived question/answer or dialogue examples require evidence references to exact source passages and human review before they can enter the supervised fine-tuning corpus.
7. Exclude non-commercial-only, no-derivatives, unclear, disputed, or missing licenses from commercial model training unless separately cleared.
8. Never use the formal 120-case verification corpus, synthetic MLP samples, or generated examples as a substitute for source material.

## Initial source registry

See [sources.json](./sources.json). Entries are acquisition candidates, not claims that the contents have been downloaded or approved in bulk. The registry intentionally distinguishes source-level guidance from per-document approval.

Priority order:

- VOA Learning English: its own Learning English texts/audio are public domain with attribution; exclude AP, Reuters, AFP, and other third-party content.
- U.S. Foreign Service Institute language courses: government-produced course materials; verify each file and any third-party components.
- Project Gutenberg: individual works marked public domain in the United States; retain title-level rights metadata and exclude works with uncertain territorial status.
- OpenStax and LibreTexts: admit only individual textbooks/sections whose displayed license explicitly permits adaptation and commercial use (for example CC BY or CC BY-SA); preserve attribution and share-alike obligations.
- PleIAs Common Corpus / English-PD: optional source-discovery pools only. Inspect document-level provenance and license metadata before admission; do not accept an aggregate dataset label as blanket clearance.

## Intended pipeline

`sources.json` → source acquisition → immutable raw archive → text extraction/OCR → document-level rights review → deduplication/quality screening → language-skill segmentation → evidence-linked human-reviewed instruction examples → split assignment → existing Daisy trainer validation.

Recommended skill tags: vocabulary, morphology, syntax, grammar, punctuation, reading-comprehension, writing, composition, semantics, pragmatics, discourse, phonetics, multilingual-comparison, translation, and language-teaching.

## Data boundaries

- Raw documents belong in a separately managed corpus store, not Git history.
- Do not commit copyrighted book text or large downloaded corpora to this repository.
- Commit only manifests, scripts, source hashes, review decisions, and small non-infringing test fixtures.
- A source document is not training-eligible until its exact license and components are reviewed.
- A derived example is not training-eligible until its evidence references resolve and a reviewer approves its content and split.
- Keep train and validation sources disjoint where practical; do not split near-duplicate passages across them.

## Next execution gate

The source registry and policy must be reviewed, then an acquisition worker with network access can fetch only the approved source subsets. The worker must write a manifest and hashes before any extraction. The existing trainer's required JSONL records are a later supervised fine-tuning stage; this acquisition stage must not fabricate those records.

## First identified book set

Eight Project Gutenberg titles have been identified for the first acquisition batch. Project Gutenberg currently marks each of these individual works as public domain in the USA. That is a title-level source declaration, not a worldwide rights determination; retain the Project Gutenberg notice with each acquired copy.

| Work | Main language skills | Status |
|---|---|---|
| [An English Grammar](https://www.gutenberg.org/ebooks/14006) — Baskervill & Sewell | grammar, syntax, parts of speech | identified; not downloaded |
| [The Grammar of English Grammars](https://www.gutenberg.org/ebooks/11615) — Goold Brown | grammar, usage, teaching | identified; not downloaded |
| [English Grammar in Familiar Lectures](https://www.gutenberg.org/ebooks/14070) — Samuel Kirkham | grammar, punctuation, parsing, exercises | identified; not downloaded |
| [Practical Grammar and Composition](https://www.gutenberg.org/ebooks/22577) — Thomas Wood | grammar, composition, writing | identified; not downloaded |
| [Higher Lessons in English](https://www.gutenberg.org/ebooks/7188) — Reed & Kellogg | grammar, composition, sentence structure | identified; not downloaded |
| [A Grammar of the English Tongue](https://www.gutenberg.org/ebooks/15097) — Samuel Johnson | orthography, etymology, syntax, prosody | identified; not downloaded |
| [Word Study and English Grammar](https://www.gutenberg.org/ebooks/30036) — Frederick W. Hamilton | vocabulary, word relations, grammar | identified; not downloaded |
| [The Elements of Style](https://www.gutenberg.org/ebooks/37134) — William Strunk | rhetoric, style, composition, usage | identified; not downloaded |

The machine-readable work records, source IDs, subject tags, and acquisition states are in `sources.json`. The acquisition worker must download from the canonical source, preserve the license notice, calculate SHA-256, and update each status only after the bytes and metadata have been checked.
