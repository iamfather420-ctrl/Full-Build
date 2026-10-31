import { computeSha256 } from '../database/DatabaseSchema';

export interface DatasetVersion {
  dataset_id: string;
  version: string;
  content_sha256: string;
  bytes: number;
  license: string;
  parent_version: string | null;
  sealed: boolean;
  body: string;
}

export class DatasetRegistry {
  private readonly versions = new Map<string, DatasetVersion>();

  private key(datasetId: string, version: string): string {
    return `${datasetId}@${version}`;
  }

  public addVersion(input: {
    datasetId: string;
    version: string;
    body: string;
    license: string;
    parentVersion?: string | null;
  }): { ok: true; record: DatasetVersion } | { ok: false; reason: string } {
    const version = input.version.trim();
    const datasetId = input.datasetId.trim();
    if (!datasetId || !version) return { ok: false, reason: 'BLOCKED: dataset id and version are required.' };
    if (!input.license.trim()) return { ok: false, reason: 'BLOCKED: a dataset license notice is required.' };
    const key = this.key(datasetId, version);
    if (this.versions.has(key)) return { ok: false, reason: 'BLOCKED: that dataset version already exists.' };
    const parent = input.parentVersion ?? null;
    if (parent && !this.versions.has(this.key(datasetId, parent))) {
      return { ok: false, reason: 'BLOCKED: parent dataset version does not exist.' };
    }
    const record: DatasetVersion = {
      dataset_id: datasetId,
      version,
      content_sha256: computeSha256(input.body),
      bytes: Buffer.byteLength(input.body),
      license: input.license.trim(),
      parent_version: parent,
      sealed: false,
      body: input.body,
    };
    this.versions.set(key, record);
    return { ok: true, record: { ...record } };
  }

  public seal(datasetId: string, version: string): { ok: true; record: DatasetVersion } | { ok: false; reason: string } {
    const row = this.versions.get(this.key(datasetId, version));
    if (!row) return { ok: false, reason: 'BLOCKED: unknown dataset version.' };
    if (computeSha256(row.body) !== row.content_sha256) {
      return { ok: false, reason: 'BLOCKED: dataset hash does not match its body.' };
    }
    row.sealed = true;
    return { ok: true, record: { ...row } };
  }

  public replaceBody(datasetId: string, version: string, body: string): { ok: false; reason: string } | { ok: true; record: DatasetVersion } {
    const row = this.versions.get(this.key(datasetId, version));
    if (!row) return { ok: false, reason: 'BLOCKED: unknown dataset version.' };
    if (row.sealed) return { ok: false, reason: 'BLOCKED: a sealed dataset version is immutable.' };
    row.body = body;
    row.content_sha256 = computeSha256(body);
    row.bytes = Buffer.byteLength(body);
    return { ok: true, record: { ...row } };
  }

  public get(datasetId: string, version: string): DatasetVersion | null {
    const row = this.versions.get(this.key(datasetId, version));
    return row ? { ...row } : null;
  }
}
