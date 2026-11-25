#!/usr/bin/env node
/**
 * Build a plain-text causal-LM corpus from the six checksum-verified LOC books.
 * This does not synthesize conversations or alter the source manifest.
 * Eligibility is derived from LOC's explicit public-domain/free-reuse statement.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "data/training_sources/public_domain/english");
const collectionRoot = path.join(sourceRoot, "data/training_sources/public_domain/english");
const manifestPath = path.join(collectionRoot, "provenance-manifest.json");
const outputDir = path.join(root, "artifacts/training/loc-english");
const chunkLimit = 1800;
const validationSources = new Set(["24000690", "31022301"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message) => { throw new Error(message); };

function safeSourcePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) fail("Source manifest contains an empty path.");
  const resolved = path.resolve(sourceRoot, relativePath);
  if (resolved !== sourceRoot && !resolved.startsWith(sourceRoot + path.sep)) fail(`Source path escapes submodule: ${relativePath}`);
  return resolved;
}
function splitLongParagraph(paragraph) {
  const out = [];
  let rest = paragraph.trim();
  while (rest.length > chunkLimit) {
    let cut = rest.lastIndexOf(" ", chunkLimit);
    if (cut < Math.floor(chunkLimit * 0.6)) cut = chunkLimit;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}
function chunkText(value) {
  const paragraphs = value.replace(/\r\n?/g, "\n").normalize("NFC")
    .split(/\n\s*\n+/).map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) for (const part of splitLongParagraph(paragraph)) {
    if (!current) current = part;
    else if (current.length + 2 + part.length <= chunkLimit) current += "\n\n" + part;
    else { chunks.push(current); current = part; }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function main() {
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);
  if (!Array.isArray(manifest.sources) || manifest.sources.length !== 6) fail("Expected exactly six LOC source records.");
  const records = [];
  const auditSources = [];
  let characters = 0;

  for (const source of manifest.sources) {
    if (source.status !== "VERIFIED") fail(`LOC source ${source.item_id} is not checksum-verified.`);
    const rights = String(source.loc_rights ?? "");
    if (!/books in this collection are in the public domain and are free to use and reuse/i.test(rights)) {
      fail(`LOC does not explicitly declare public-domain/free-reuse status for ${source.item_id}.`);
    }
    if (!/^\d{4}$/.test(String(source.publication_date ?? ""))) fail(`Missing publication year for ${source.item_id}.`);
    if (!/^[a-f0-9]{64}$/i.test(source.text_sha256 ?? "")) fail(`Invalid source text SHA-256 for ${source.item_id}.`);

    const bytes = await readFile(safeSourcePath(source.text_file));
    const sourceHash = sha256(bytes);
    if (sourceHash.toLowerCase() !== source.text_sha256.toLowerCase()) fail(`OCR checksum mismatch for ${source.item_id}.`);
    if (Number.isInteger(source.text_bytes) && bytes.length !== source.text_bytes) fail(`OCR byte-count mismatch for ${source.item_id}.`);
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "").normalize("NFC");
    if (!text.trim()) fail(`Empty OCR text for ${source.item_id}.`);
    const chunks = chunkText(text);
    const split = validationSources.has(String(source.item_id)) ? "validation" : "train";
    if (!chunks.length) fail(`No text chunks for ${source.item_id}.`);

    chunks.forEach((content, index) => {
      records.push({
        schema: "daisy-plain-text-lm-record/v1",
        recordId: `loc-${source.item_id}-${String(index + 1).padStart(5, "0")}`,
        split,
        sourceId: String(source.item_id),
        sourceTitle: source.title,
        author: source.author,
        publicationYear: String(source.publication_date),
        sourceUrl: source.source_url,
        sourceSha256: sourceHash,
        textSha256: sha256(content),
        text: content,
        rightsEvidence: rights,
        rightsEvidenceUrl: source.source_url,
        licenseStatus: "PUBLIC_DOMAIN_DECLARED_BY_LIBRARY_OF_CONGRESS",
        trainingEligible: true
      });
      characters += content.length;
    });
    auditSources.push({
      sourceId: String(source.item_id),
      title: source.title,
      publicationYear: String(source.publication_date),
      sourceSha256: sourceHash,
      bytes: bytes.length,
      chunks: chunks.length,
      split,
      rightsEvidence: rights,
      rightsEvidenceUrl: source.source_url,
      eligibilityBasis: "Explicit LOC statement: public domain and free to use and reuse"
    });
  }

  const trainCount = records.filter(r => r.split === "train").length;
  const validationCount = records.filter(r => r.split === "validation").length;
  if (!trainCount || !validationCount) fail("Both source-disjoint train and validation splits are required.");
  const jsonl = records.map(r => JSON.stringify(r)).join("\n") + "\n";
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "language-model-corpus.jsonl"), jsonl, "utf8");
  const audit = {
    schema: "daisy-loc-language-model-corpus-audit/v1",
    sourceManifestSha256: sha256(rawManifest),
    datasetSha256: sha256(jsonl),
    sourceCount: auditSources.length,
    recordCount: records.length,
    trainRecords: trainCount,
    validationRecords: validationCount,
    totalCharacters: characters,
    splitPolicy: "Source-disjoint; validation sources are fixed by source ID",
    trainingMode: "Plain-text causal language modeling; no synthetic conversations",
    eligibilityPolicy: "Use explicit source-level LOC public-domain/free-reuse declaration; do not require conversational annotation or human rights-review workflow flags",
    sources: auditSources
  };
  await writeFile(path.join(outputDir, "language-model-audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({
    status: "LANGUAGE_MODEL_CORPUS_READY",
    sourceCount: audit.sourceCount,
    records: audit.recordCount,
    trainRecords: trainCount,
    validationRecords: validationCount,
    characters,
    datasetSha256: audit.datasetSha256,
    trainingMode: audit.trainingMode,
    output: "artifacts/training/loc-english/language-model-corpus.jsonl"
  }, null, 2));
}
main().catch(error => {
  console.error(`LANGUAGE_MODEL_CORPUS_BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
