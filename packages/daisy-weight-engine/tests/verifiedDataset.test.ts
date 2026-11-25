import { test } from "node:test";
import assert from "node:assert/strict";
import { loadVerifiedDatasetJsonl, type VerifiedTrainingRecord } from "../src/verifiedDataset.js";

const digest = "a".repeat(64);
const record = (recordId: string, split: "train" | "validation"): VerifiedTrainingRecord => ({
  recordId, split, input: [0.2, -0.1], target: [0.4],
  sourceId: "daisy-corpus-v1", sourceSha256: digest,
  evidenceRefs: ["evidence://record/" + recordId],
  verification: "VERIFIED", licenseStatus: "APPROVED", trainingEligible: true,
});

test("loads only provenance-backed train and validation records", () => {
  const content = [record("r1", "train"), record("r2", "validation")].map(JSON.stringify).join("\n");
  const result = loadVerifiedDatasetJsonl(content, { inputSize: 2, outputSize: 1 });
  assert.equal(result.manifest.records, 2);
  assert.equal(result.manifest.trainRecords, 1);
  assert.equal(result.manifest.validationRecords, 1);
  assert.match(result.manifest.datasetSha256, /^[a-f0-9]{64}$/);
});

test("rejects unverified, unlicensed, or ineligible records", () => {
  const bad = { ...record("r1", "train"), verification: "UNREVIEWED" };
  const content = [bad, record("r2", "validation")].map(JSON.stringify).join("\n");
  assert.throws(() => loadVerifiedDatasetJsonl(content, { inputSize: 2, outputSize: 1 }), /not VERIFIED/);
});

test("rejects missing evidence and malformed source hashes", () => {
  const noEvidence = { ...record("r1", "train"), evidenceRefs: [] };
  const content = [noEvidence, record("r2", "validation")].map(JSON.stringify).join("\n");
  assert.throws(() => loadVerifiedDatasetJsonl(content, { inputSize: 2, outputSize: 1 }), /evidence reference/);
});

test("rejects duplicate ids, bad dimensions, and missing validation split", () => {
  const duplicate = [record("r1", "train"), record("r1", "validation")].map(JSON.stringify).join("\n");
  assert.throws(() => loadVerifiedDatasetJsonl(duplicate, { inputSize: 2, outputSize: 1 }), /duplicate recordId/);
  const noValidation = JSON.stringify(record("r1", "train"));
  assert.throws(() => loadVerifiedDatasetJsonl(noValidation, { inputSize: 2, outputSize: 1 }), /validation record/);
  const wrongShape = { ...record("r2", "validation"), input: [1] };
  assert.throws(() => loadVerifiedDatasetJsonl([record("r1", "train"), wrongShape].map(JSON.stringify).join("\n"), { inputSize: 2, outputSize: 1 }), /dimensions or values/);
});
