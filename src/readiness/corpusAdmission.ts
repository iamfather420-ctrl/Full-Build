import { createHash } from "node:crypto";

/** Licenses that can be considered only after every other gate is already open. CC-BY is not enough. */
const ADMITTABLE_LICENSES = new Set(["CC0-1.0", "PUBLIC_DOMAIN"]);

export interface ManifestGate {
  modelTrainingAuthorized: boolean;
  trainingPipelineEnabled: boolean;
  trainingCorpusGenerated: boolean;
}

export interface SourceDocument {
  id: string;
  path: string;
  license: string | null;
  reviewStatus: string;
  trainingEligible: boolean;
  trainingStatus: string;
  sha256: string | null;
  byteLength: number | null;
  observedSha256: string | null;
  text: string | null;
  extractionError: string | null;
}

export interface AdmissionResult {
  id: string;
  state: "ADMITTED" | "BLOCKED";
  reasons: string[];
}

export const REAL_MANIFEST_GATE: ManifestGate = {
  modelTrainingAuthorized: false,
  trainingPipelineEnabled: false,
  trainingCorpusGenerated: false,
};

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function extractionQuality(text: string | null): { ok: boolean; reason: string | null } {
  if (text === null) return { ok: false, reason: "No extracted text." };
  const trimmed = text.trim();
  if (trimmed.length < 40) return { ok: false, reason: "Extraction is too short to be usable text." };
  const broken = (trimmed.match(/\uFFFD/g) ?? []).length;
  if (broken / trimmed.length > 0.01) return { ok: false, reason: "Extraction contains replacement characters above 1%." };
  return { ok: true, reason: null };
}

export function duplicateIds(documents: readonly Pick<SourceDocument, "id" | "sha256">[]): Map<string, string> {
  const first = new Map<string, string>();
  const duplicates = new Map<string, string>();
  for (const document of documents) {
    if (!document.sha256) continue;
    const seen = first.get(document.sha256);
    if (seen && seen !== document.id) duplicates.set(document.id, seen);
    else first.set(document.sha256, document.id);
  }
  return duplicates;
}

export function admitDocument(document: SourceDocument, manifest: ManifestGate, duplicateOf: string | null): AdmissionResult {
  const reasons: string[] = [];
  if (!manifest.modelTrainingAuthorized) reasons.push("Repository manifest does not authorize model training.");
  if (document.reviewStatus === "PENDING_REVIEW") reasons.push("Review status is PENDING_REVIEW.");
  if (!document.trainingEligible) reasons.push("training_eligible is not true.");
  if (document.trainingStatus !== "approved") reasons.push(`training_status is ${document.trainingStatus}, not approved.`);
  if (!document.license || !ADMITTABLE_LICENSES.has(document.license)) {
    reasons.push(`License ${document.license ?? "missing"} is not an admitted CC0 or public-domain grant.`);
  }
  if (!document.sha256 || document.observedSha256 === null || document.observedSha256 !== document.sha256) {
    reasons.push("Integrity digest is missing or does not match the recorded SHA-256.");
  }
  if (duplicateOf) reasons.push(`Duplicate of ${duplicateOf}.`);
  const quality = extractionQuality(document.text);
  if (document.extractionError) reasons.push(document.extractionError);
  else if (!quality.ok && quality.reason) reasons.push(quality.reason);
  if (reasons.length > 0) return { id: document.id, state: "BLOCKED", reasons };
  return { id: document.id, state: "ADMITTED", reasons: [] };
}

export function selectTrainingDocuments(documents: readonly SourceDocument[], manifest: ManifestGate): {
  admitted: SourceDocument[];
  results: AdmissionResult[];
} {
  const duplicates = duplicateIds(documents);
  const results = documents.map((document) => admitDocument(document, manifest, duplicates.get(document.id) ?? null));
  const admittedIds = new Set(results.filter((result) => result.state === "ADMITTED").map((result) => result.id));
  return { admitted: documents.filter((document) => admittedIds.has(document.id)), results };
}
