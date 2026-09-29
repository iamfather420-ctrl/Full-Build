import fs from 'fs';
import path from 'path';

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
  mandatory_gates: {
    total: number;
    passed: number;
    failed: number;
  };
  verification_root_sha256: string;
  source_commit_sha: string;
  generated_at: string;
}

export class DaisyActivationGate {
  private static readonly RELATIVE_PATH = path.join('artifacts', 'daisy-brain-activation-gate.json');

  public static read(): DaisyActivationGateRecord | null {
    const file = path.resolve(process.cwd(), this.RELATIVE_PATH);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as DaisyActivationGateRecord;
    } catch {
      return null;
    }
  }

  public static assertActive(): DaisyActivationGateRecord {
    const record = this.read();
    if (!record || record.status !== 'ACTIVE') {
      throw new Error('DAISY_BRAIN_FAIL_CLOSED: verification corpus activation gate is not ACTIVE');
    }
    return record;
  }

  public static isActive(): boolean {
    return this.read()?.status === 'ACTIVE';
  }
}
