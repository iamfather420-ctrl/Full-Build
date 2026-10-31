import { computeSha256 } from '../database/DatabaseSchema';
import { HumanApprovalGate, productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { AuthService, type UserContext } from '../auth/AuthService';

export type CapabilityStatus = 'PROPOSED' | 'APPROVAL_REQUIRED' | 'BLOCKED' | 'DEPLOYED';

export interface CapabilityRecord {
  id: string;
  version: number;
  name: string;
  description: string;
  status: CapabilityStatus;
  authority: 'none';
  executable: false;
  evidence_sha256: string | null;
  block_reason: string | null;
}

export class CapabilityRegistry {
  private readonly rows = new Map<string, CapabilityRecord>();

  constructor(private readonly approvals: HumanApprovalGate) {}

  public propose(name: string, description: string): CapabilityRecord {
    const id = `cap_${computeSha256(name.trim().toLowerCase()).slice(0, 12)}`;
    const prior = this.rows.get(id);
    const record: CapabilityRecord = {
      id,
      version: prior ? prior.version + 1 : 1,
      name: name.trim(),
      description: description.trim(),
      status: 'PROPOSED',
      authority: 'none',
      executable: false,
      evidence_sha256: null,
      block_reason: null,
    };
    this.rows.set(id, record);
    return record;
  }

  public get(id: string): CapabilityRecord | null {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  public list(): CapabilityRecord[] {
    return [...this.rows.values()].map((row) => ({ ...row }));
  }

  public markVerified(id: string, evidenceSha256: string): { ok: true; record: CapabilityRecord } | { ok: false; reason: string } {
    const row = this.rows.get(id);
    if (!row) return { ok: false, reason: 'BLOCKED: unknown capability.' };
    if (!/^[a-f0-9]{64}$/.test(evidenceSha256)) return { ok: false, reason: 'BLOCKED: evidence hash is missing.' };
    row.status = 'APPROVAL_REQUIRED';
    row.evidence_sha256 = evidenceSha256;
    row.executable = false;
    row.authority = 'none';
    return { ok: true, record: { ...row } };
  }

  public block(id: string, reason: string): void {
    const row = this.rows.get(id);
    if (!row) return;
    row.status = 'BLOCKED';
    row.executable = false;
    row.block_reason = reason;
  }

  public deploy(id: string, user: UserContext | null, now = Date.now()): { deployed: false; reason: string } | { deployed: true; record: CapabilityRecord } {
    const row = this.rows.get(id);
    if (!row) return { deployed: false, reason: 'BLOCKED: unknown capability.' };
    if (row.status !== 'APPROVAL_REQUIRED') {
      return { deployed: false, reason: 'BLOCKED: capability has not passed independent sandbox verification.' };
    }
    const decision = this.approvals.assertDeployment(user, {
      kind: 'capability',
      id: row.id,
      version: row.version,
      contentSha256: row.evidence_sha256 ?? undefined,
    }, now);
    if (!decision.ok) return { deployed: false, reason: decision.reason };
    row.status = 'DEPLOYED';
    row.executable = false;
    return { deployed: true, record: { ...row } };
  }

  /**
   * Provisional integration is rolled back unless independent verification,
   * AuthService, and the production-integration switch all pass. The switch
   * is closed. Rejection therefore restores the prior capability row.
   */
  public attemptIntegration(id: string, user: UserContext | null, now = Date.now()): {
    deployed: false;
    rolled_back: boolean;
    reason: string;
    verification_ok: boolean;
    status_after: CapabilityStatus | null;
  } | {
    deployed: true;
    rolled_back: false;
    reason: string;
    verification_ok: true;
    status_after: CapabilityStatus;
  } {
    const row = this.rows.get(id);
    if (!row) {
      return { deployed: false, rolled_back: false, reason: 'BLOCKED: unknown capability.', verification_ok: false, status_after: null };
    }
    if (row.status !== 'APPROVAL_REQUIRED') {
      return { deployed: false, rolled_back: false, reason: 'BLOCKED: capability has not passed independent sandbox verification.', verification_ok: false, status_after: row.status };
    }
    const before = { ...row };
    row.status = 'DEPLOYED';
    try {
      const verdict = this.approvals.independentlyVerify({
        kind: 'capability',
        id: row.id,
        version: row.version,
        contentSha256: row.evidence_sha256 ?? undefined,
      }, now);
      if (verdict.ok && verdict.record) this.approvals.accountIntegrationUse(verdict.record.id);
      const auth = AuthService.getInstance().authorize(user, 'deploy', user?.tenant_id);
      const open = productionIntegrationPermitted();
      if (!verdict.ok || !auth.authorized || !open) {
        Object.assign(row, before);
        const reason = !verdict.ok
          ? verdict.reason
          : !auth.authorized
            ? auth.reason
            : 'BLOCKED: production integration is not permitted.';
        return { deployed: false, rolled_back: true, reason, verification_ok: verdict.ok, status_after: row.status };
      }
      row.executable = false;
      row.authority = 'none';
      return { deployed: true, rolled_back: false, reason: 'Integration committed.', verification_ok: true, status_after: row.status };
    } catch (error) {
      Object.assign(row, before);
      throw error;
    }
  }
}
