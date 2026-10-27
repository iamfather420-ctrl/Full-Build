export type DaisyActivationStatus = 'INACTIVE' | 'ACTIVE' | 'BLOCKED';

export interface DaisyActivationGateRecord {
  schema_version: '1.0.0';
  status: DaisyActivationStatus;
  reason: string;
  corpus: {
    total_required: 120;
    dfrl_required: 88;
    dh_required: 32;
    executed: number;
    deterministic_replays: number;
    unknown: number;
    errors: number;
  };
  mandatory_gates: { total: number; passed: number; failed: number };
  verification_root_sha256: string;
  source_commit_sha: string;
  generated_at: string;
}

/**
 * No embedded/default activation is permitted.
 * The OS remains inactive until a future implementation loads and validates
 * a real, commit-bound verification record produced by the authoritative
 * verification pipeline.
 */
export class DaisyActivationGate {
  public static read(): DaisyActivationGateRecord | null {
    return null;
  }

  public static assertActive(): DaisyActivationGateRecord {
    const record = this.read();
    if (!record || record.status !== 'ACTIVE') {
      throw new Error('DAISY_BRAIN_FAIL_CLOSED: no verified activation record is available');
    }
    return record;
  }

  public static isActive(): boolean {
    return this.read()?.status === 'ACTIVE';
  }
}
