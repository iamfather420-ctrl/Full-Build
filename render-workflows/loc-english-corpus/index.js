import { task } from "@renderinc/sdk/workflows";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "artifacts/training/loc-english");

const prepareLocEnglishCorpus = task(
  {
    name: "prepareLocEnglishCorpus",
    plan: "flex",
    timeoutSeconds: 1800
  },
  async function prepareLocEnglishCorpus(ctx) {
    // Fetch the pinned public source submodule; no Codespaces dependency.
    execFileSync("git", ["submodule", "update", "--init", "--recursive"], {
      cwd: repoRoot,
      stdio: "inherit"
    });

    // This stage only verifies hashes and writes quarantined review data.
    execFileSync(process.execPath, ["scripts/prepare_loc_english_corpus.mjs"], {
      cwd: repoRoot,
      stdio: "inherit"
    });

    const audit = JSON.parse(
      await readFile(path.join(outputDir, "preparation-audit.json"), "utf8")
    );
    const corpusJsonl = await readFile(
      path.join(outputDir, "quarantined-corpus.jsonl"),
      "utf8"
    );

    if (
      audit.source_count !== 6 ||
      audit.governance?.training_eligible !== false ||
      audit.governance?.trainer_invoked !== false ||
      audit.governance?.model_weights_created !== false
    ) {
      throw new Error("Corpus audit failed the required six-source quarantine governance checks.");
    }

    return {
      status: "PREPARED_QUARANTINED",
      audit,
      corpus_jsonl: corpusJsonl,
      corpus_bytes: Buffer.byteLength(corpusJsonl, "utf8")
    };
  }
);

// Importing this file registers the task with Render Workflows.
void prepareLocEnglishCorpus;
