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

let inMemoryRecord: DaisyActivationGateRecord | null = null;

export class DaisyActivationGate {
  private static readonly RELATIVE_PATH = 'artifacts/daisy-brain-activation-gate.json';

  public static setRecord(record: DaisyActivationGateRecord | null) {
    inMemoryRecord = record;
  }

  public static read(): DaisyActivationGateRecord | null {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && typeof process.cwd === 'function') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fsMod = typeof require === 'function' ? require('fs') : null;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pathMod = typeof require === 'function' ? require('path') : null;
        if (fsMod && pathMod) {
          const file = pathMod.resolve(process.cwd(), this.RELATIVE_PATH);
          if (fsMod.existsSync(file)) {
            const data = JSON.parse(fsMod.readFileSync(file, 'utf8')) as DaisyActivationGateRecord;
            inMemoryRecord = data;
            return data;
          }
        }
      } catch {
        // Fall back to inMemoryRecord
      }
    }
    return inMemoryRecord;
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
