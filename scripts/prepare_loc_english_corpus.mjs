#!/usr/bin/env node
/**
 * Prepare the LOC English grammar collection for human review.
 *
 * This is a quarantine/preprocessing stage only. It NEVER marks sources
 * training-eligible and NEVER invokes a model trainer.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const submoduleRoot = path.join(root, "data/training_sources/public_domain/english");
const collectionDir = path.join(submoduleRoot, "data/training_sources/public_domain/english");
const manifestPath = path.join(collectionDir, "provenance-manifest.json");
const outputDir = path.join(root, "artifacts/training/loc-english");
const chunkLimit = 1800;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message) => { throw new Error(message); };

function safeRepoPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) fail("Manifest contains an empty file path.");
  const resolved = path.resolve(submoduleRoot, relativePath);
  if (resolved !== submoduleRoot && !resolved.startsWith(submoduleRoot + path.sep)) fail(`Path escapes source submodule: ${relativePath}`);
  return resolved;
}

function splitLongParagraph(paragraph, limit) {
  const pieces = [];
  let remaining = paragraph.trim();
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf(" ", limit);
    if (cut < Math.floor(limit * 0.6)) cut = limit;
    pieces.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}

function makeChunks(text, limit) {
  const paragraphs = text.replace(/\r\n?/g, "\n").normalize("NFC")
    .split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    for (const part of splitLongParagraph(paragraph, limit)) {
      if (!current) current = part;
      else if ((current.length + 2 + part.length) <= limit) current += "\n\n" + part;
      else { chunks.push(current); current = part; }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function main() {
  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);
  if (!Array.isArray(manifest.sources) || manifest.sources.length !== 6) {
    fail("Expected exactly six LOC source records; refusing an incomplete or unexpected collection.");
  }
  if (manifest.training_eligible !== false || manifest.rights_status !== "PENDING_REVIEW") {
    fail("Source collection governance flags changed. This preparer only accepts the original pending-review state.");
  }

  const records = [];
  const sourceAudit = [];
  let totalCharacters = 0;

  for (const source of manifest.sources) {
    if (source.status !== "VERIFIED") fail(`Source ${source.item_id} is not marked VERIFIED.`);
    if (source.training_eligible !== false || source.rights_status !== "PENDING_REVIEW" || source.rights_review !== "PENDING_REVIEW") {
      fail(`Source ${source.item_id} is not in the required pending-review state.`);
    }
    if (!/^[a-f0-9]{64}$/i.test(source.text_sha256 ?? "")) fail(`Source ${source.item_id} has no valid text SHA-256.`);

    const textPath = safeRepoPath(source.text_file);
    const textBytes = await readFile(textPath);
    const actualHash = sha256(textBytes);
    if (actualHash.toLowerCase() !== source.text_sha256.toLowerCase()) {
      fail(`OCR checksum mismatch for ${source.item_id}: expected ${source.text_sha256}, got ${actualHash}`);
    }
    if (Number.isInteger(source.text_bytes) && textBytes.length !== source.text_bytes) {
      fail(`OCR byte-count mismatch for ${source.item_id}: expected ${source.text_bytes}, got ${textBytes.length}`);
    }

    const normalizedText = textBytes.toString("utf8").replace(/^\uFEFF/, "").normalize("NFC");
    if (!normalizedText.trim()) fail(`OCR text is empty for ${source.item_id}`);
    const chunks = makeChunks(normalizedText, chunkLimit);
    if (!chunks.length) fail(`No usable paragraphs found for ${source.item_id}`);

    chunks.forEach((content, index) => {
      const recordId = `loc-${source.item_id}-chunk-${String(index + 1).padStart(5, "0")}`;
      records.push({
        schema: "daisy-quarantined-language-chunk/v1",
        record_id: recordId,
        source_id: source.item_id,
        source_title: source.title,
        author: source.author,
        publication_date: source.publication_date,
        source_url: source.source_url,
        source_text_path: source.text_file,
        source_text_sha256: actualHash,
        chunk_index: index,
        chunk_count: chunks.length,
        normalized_content_sha256: sha256(content),
        content,
        provenance_status: "SOURCE_HASH_VERIFIED",
        rights_status: "PENDING_REVIEW",
        training_eligible: false,
        disposition: "QUARANTINED_NOT_FOR_TRAINING"
      });
      totalCharacters += content.length;
    });

    sourceAudit.push({
      source_id: source.item_id,
      title: source.title,
      text_path: source.text_file,
      expected_sha256: source.text_sha256,
      actual_sha256: actualHash,
      byte_count: textBytes.length,
      chunks: chunks.length,
      rights_status: "PENDING_REVIEW",
      training_eligible: false,
      disposition: "QUARANTINED_NOT_FOR_TRAINING"
    });
  }

  await mkdir(outputDir, { recursive: true });
  const jsonl = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  const datasetPath = path.join(outputDir, "quarantined-corpus.jsonl");
  await writeFile(datasetPath, jsonl, { encoding: "utf8", flag: "w" });

  const audit = {
    schema: "daisy-loc-corpus-preparation-audit/v1",
    collection: manifest.collection,
    source_manifest_sha256: sha256(rawManifest),
    created_at: new Date().toISOString(),
    source_count: sourceAudit.length,
    chunk_count: records.length,
    total_characters: totalCharacters,
    output: "artifacts/training/loc-english/quarantined-corpus.jsonl",
    output_sha256: sha256(jsonl),
    source_results: sourceAudit,
    governance: {
      rights_status: "PENDING_REVIEW",
      training_eligible: false,
      trainer_invoked: false,
      model_weights_created: false,
      required_next_step: "Human rights review and explicit source-level approval"
    }
  };
  await writeFile(path.join(outputDir, "preparation-audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({
    status: "PREPARED_QUARANTINED",
    sources_verified: sourceAudit.length,
    chunks_written: records.length,
    total_characters: totalCharacters,
    dataset_sha256: audit.output_sha256,
    training_eligible: false,
    trainer_invoked: false,
    output: datasetPath
  }, null, 2));
}

main().catch((error) => {
  console.error(`CORPUS_PREPARATION_BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
