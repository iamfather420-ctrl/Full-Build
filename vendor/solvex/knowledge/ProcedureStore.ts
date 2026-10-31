import { computeSha256 } from '../database/DatabaseSchema';

export type KnowledgeKind = 'INFORMATION' | 'EVIDENCE' | 'VALIDATED_PROCEDURE';

export interface KnowledgeRecord {
  id: string;
  kind: KnowledgeKind;
  version: number;
  body: string;
  content_sha256: string;
  validated: boolean;
  executable: false;
}

export class ProcedureStore {
  private readonly rows = new Map<string, KnowledgeRecord>();

  public add(kind: KnowledgeKind, body: string): KnowledgeRecord {
    const content_sha256 = computeSha256(body);
    const id = `know_${content_sha256.slice(0, 12)}`;
    const prior = this.rows.get(id);
    const record: KnowledgeRecord = {
      id,
      kind,
      version: prior ? prior.version + 1 : 1,
      body,
      content_sha256,
      validated: false,
      executable: false,
    };
    this.rows.set(id, record);
    return { ...record };
  }

  public get(id: string): KnowledgeRecord | null {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  public list(): KnowledgeRecord[] {
    return [...this.rows.values()].map((row) => ({ ...row }));
  }

  /** Recompute the hash. A stored flag is not accepted as proof. */
  public review(id: string): { ok: boolean; sha256: string; independent: true; reason?: string } {
    const row = this.rows.get(id);
    if (!row) return { ok: false, sha256: '', independent: true, reason: 'BLOCKED: unknown record.' };
    const sha256 = computeSha256(row.body);
    if (sha256 !== row.content_sha256) {
      row.validated = false;
      return { ok: false, sha256, independent: true, reason: 'BLOCKED: stored hash does not match the body.' };
    }
    if (row.kind !== 'VALIDATED_PROCEDURE') {
      return { ok: false, sha256, independent: true, reason: 'Information and evidence are not procedures.' };
    }
    return { ok: true, sha256, independent: true };
  }

  public markValidated(id: string, evidenceSha256: string): { ok: true } | { ok: false; reason: string } {
    const review = this.review(id);
    if (!review.ok) return { ok: false, reason: review.reason ?? 'BLOCKED' };
    if (review.sha256 !== evidenceSha256) return { ok: false, reason: 'BLOCKED: independent hash mismatch.' };
    const row = this.rows.get(id)!;
    row.validated = true;
    row.executable = false;
    return { ok: true };
  }
}
