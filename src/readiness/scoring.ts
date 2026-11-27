import type { CategoryScore, CheckStatus, EvidenceRecord } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  "repository-integrity": "Repository integrity",
  "code-completeness": "Code completeness",
  architecture: "Architecture",
  "dependency-integrity": "Dependency integrity",
  "integration-wiring": "Integration wiring",
  authentication: "Authentication",
  authorization: "Authorization",
  secrets: "Secrets configuration",
  database: "Database integrity",
  api: "API functionality",
  "build-reproducibility": "Build reproducibility",
  "unit-testing": "Unit testing",
  "integration-testing": "Integration testing",
  "end-to-end": "End-to-end testing",
  security: "Security",
  infrastructure: "Infrastructure",
  deployment: "Deployment",
  observability: "Observability",
  recovery: "Recovery and rollback",
  performance: "Performance",
  documentation: "Documentation",
  governance: "Governance",
  "ai-architecture": "AI architecture",
  "ai-training": "AI training readiness",
  "model-artifacts": "Model artifact integrity",
  "inference-readiness": "Inference readiness",
  "proprietary-ai": "Proprietary AI completion",
  "ecosystem-operation": "Complete ecosystem operation",
};

export function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

export function countStatus(records: EvidenceRecord[], status: CheckStatus): number {
  return records.filter((record) => record.status === status).length;
}

/** Blocked and unverified stay in the denominator and never add to the numerator. */
export function completionOf(records: EvidenceRecord[]): { weighted: number; raw: number } {
  const applicable = records.filter((record) => record.status !== "NOT_APPLICABLE");
  const weightTotal = applicable.reduce((sum, record) => sum + record.weight, 0);
  const weightPassed = applicable
    .filter((record) => record.status === "PASSED")
    .reduce((sum, record) => sum + record.weight, 0);
  return {
    weighted: weightTotal === 0 ? 0 : weightPassed / weightTotal,
    raw: applicable.length === 0 ? 0 : applicable.filter((record) => record.status === "PASSED").length / applicable.length,
  };
}

export function scoreCategories(records: EvidenceRecord[]): CategoryScore[] {
  const ids = [...new Set(records.map((record) => record.category))];
  return ids.map((id) => {
    const rows = records.filter((record) => record.category === id);
    const applicable = rows.filter((record) => record.status !== "NOT_APPLICABLE");
    const { weighted, raw } = completionOf(rows);
    return {
      id,
      label: categoryLabel(id),
      weight: rows.reduce((sum, record) => sum + record.weight, 0),
      total: rows.length,
      passed: countStatus(rows, "PASSED"),
      failed: countStatus(rows, "FAILED"),
      blocked: countStatus(rows, "BLOCKED"),
      unverified: countStatus(rows, "UNVERIFIED"),
      notApplicable: countStatus(rows, "NOT_APPLICABLE"),
      weightedCompletion: weighted,
      rawCompletion: raw,
      // applicable is retained so an all-N/A category cannot report 100 via an empty denominator surprise
      ...(applicable.length === 0 ? { weightedCompletion: 0, rawCompletion: 0 } : {}),
    };
  });
}

export function countsOf(records: EvidenceRecord[]) {
  return {
    total: records.length,
    passed: countStatus(records, "PASSED"),
    failed: countStatus(records, "FAILED"),
    blocked: countStatus(records, "BLOCKED"),
    unverified: countStatus(records, "UNVERIFIED"),
    notApplicable: countStatus(records, "NOT_APPLICABLE"),
  };
}
