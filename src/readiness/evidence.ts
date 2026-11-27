import type { CheckStatus, EvidenceRecord, OperationalState } from "./types";

let sequence = 0;

export function resetEvidenceSequence(): void {
  sequence = 0;
}

export function evidence(input: {
  category: string;
  weight?: number;
  repository: string;
  branch?: string | null;
  commitSha?: string | null;
  filePath?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
  testExecuted: string;
  expected: string;
  actual: string;
  status: CheckStatus;
  state: OperationalState;
  artifact?: string | null;
  failure?: string | null;
  remediation?: string | null;
  timestamp?: string;
}): EvidenceRecord {
  sequence += 1;
  return {
    id: `RX-${String(sequence).padStart(4, "0")}`,
    category: input.category,
    weight: input.weight ?? 1,
    repository: input.repository,
    branch: input.branch ?? null,
    commitSha: input.commitSha ?? null,
    filePath: input.filePath ?? null,
    lineStart: input.lineStart ?? null,
    lineEnd: input.lineEnd ?? null,
    testExecuted: input.testExecuted,
    expected: input.expected,
    actual: input.actual,
    timestamp: input.timestamp ?? new Date().toISOString(),
    status: input.status,
    state: input.state,
    artifact: input.artifact ?? null,
    failure: input.failure ?? null,
    remediation: input.remediation ?? null,
  };
}

export interface AuditLog {
  append(record: EvidenceRecord): void;
  snapshot(): EvidenceRecord[];
  depth(): number;
}

export function createAuditLog(): AuditLog {
  const records: EvidenceRecord[] = [];
  return {
    append(record) {
      records.push(Object.freeze({ ...record }));
    },
    snapshot() {
      return records.map((record) => ({ ...record }));
    },
    depth() {
      return records.length;
    },
  };
}
