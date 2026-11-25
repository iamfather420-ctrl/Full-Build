import { createHash } from "node:crypto";
import type { Sample } from "./training.js";

export type DatasetSplit = "train" | "validation";

export interface VerifiedTrainingRecord {
  recordId: string;
  split: DatasetSplit;
  input: number[];
  target: number[];
  sourceId: string;
  sourceSha256: string;
  evidenceRefs: string[];
  verification: "VERIFIED";
  licenseStatus: "APPROVED";
  trainingEligible: true;
}

export interface VerifiedDataset {
  samples: Sample[];
  train: Sample[];
  validation: Sample[];
  manifest: {
    format: "daisy-verified-jsonl-v1";
    records: number;
    trainRecords: number;
    validationRecords: number;
    sourceIds: string[];
    datasetSha256: string;
  };
}

/**
 * Loads only explicitly verified, licensed, provenance-backed numerical examples.
 * This adapter does not convert natural language into features and never invents labels.
 */
export function loadVerifiedDatasetJsonl(
  content: string,
  dimensions: { inputSize: number; outputSize: number },
): VerifiedDataset {
  if (!content.trim()) throw new Error("Dataset is empty");
  if (!Number.isInteger(dimensions.inputSize) || dimensions.inputSize < 1 ||
      !Number.isInteger(dimensions.outputSize) || dimensions.outputSize < 1) {
    throw new Error("Dataset dimensions must be positive integers");
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  const train: Sample[] = [];
  const validation: Sample[] = [];

  for (let index = 0; index < lines.length; index++) {
    let value: unknown;
    try {
      value = JSON.parse(lines[index]);
    } catch {
      throw new Error(`Invalid JSON on dataset line ${index + 1}`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Dataset line ${index + 1} must be an object`);
    }
    const record = value as Partial<VerifiedTrainingRecord>;
    const fail = (reason: string): never => {
      throw new Error(`Dataset line ${index + 1}: ${reason}`);
    };

    if (typeof record.recordId !== "string" || !record.recordId.trim()) fail("recordId is required");
    if (ids.has(record.recordId)) fail("duplicate recordId");
    ids.add(record.recordId);
    if (record.split !== "train" && record.split !== "validation") fail("split must be train or validation");
    if (!Array.isArray(record.input) || record.input.length !== dimensions.inputSize ||
        !record.input.every((n) => typeof n === "number" && Number.isFinite(n))) fail("input dimensions or values are invalid");
    if (!Array.isArray(record.target) || record.target.length !== dimensions.outputSize ||
        !record.target.every((n) => typeof n === "number" && Number.isFinite(n))) fail("target dimensions or values are invalid");
    if (typeof record.sourceId !== "string" || !record.sourceId.trim()) fail("sourceId is required");
    if (typeof record.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(record.sourceSha256)) fail("sourceSha256 must be a SHA-256 digest");
    if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0 ||
        !record.evidenceRefs.every((ref) => typeof ref === "string" && ref.trim())) fail("at least one evidence reference is required");
    if (record.verification !== "VERIFIED") fail("record is not VERIFIED");
    if (record.licenseStatus !== "APPROVED") fail("license is not APPROVED");
    if (record.trainingEligible !== true) fail("record is not training eligible");

    sourceIds.add(record.sourceId);
    const sample = { input: [...record.input], target: [...record.target] };
    (record.split === "train" ? train : validation).push(sample);
  }

  if (!train.length) throw new Error("Dataset requires at least one train record");
  if (!validation.length) throw new Error("Dataset requires at least one validation record");

  const samples = [...train, ...validation];
  return {
    samples,
    train,
    validation,
    manifest: {
      format: "daisy-verified-jsonl-v1",
      records: samples.length,
      trainRecords: train.length,
      validationRecords: validation.length,
      sourceIds: [...sourceIds].sort(),
      datasetSha256: createHash("sha256").update(content).digest("hex"),
    },
  };
}
