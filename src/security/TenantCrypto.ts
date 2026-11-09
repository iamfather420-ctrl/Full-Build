import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

export interface EncryptedTenantRecord { version: 1; tenantId: string; iv: string; tag: string; ciphertext: string; }
export class TenantCrypto {
  constructor(private readonly rootKey = process.env.SOLVEX_TENANT_ROOT_KEY ?? '') {
    if (Buffer.byteLength(rootKey) < 32) throw new Error('Tenant cryptography requires SOLVEX_TENANT_ROOT_KEY with at least 32 bytes.');
  }
  private keyFor(tenantId: string): Buffer {
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(tenantId)) throw new Error('Invalid tenant identifier.');
    return Buffer.from(hkdfSync('sha256', Buffer.from(this.rootKey), Buffer.from('solvex-tenant-v1'), Buffer.from(tenantId), 32));
  }
  encrypt(tenantId: string, plaintext: string): EncryptedTenantRecord {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.keyFor(tenantId), iv);
    cipher.setAAD(Buffer.from('solvex-record-v1:' + tenantId));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return { version: 1, tenantId, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('base64') };
  }
  decrypt(requestingTenantId: string, record: EncryptedTenantRecord): string {
    if (!record || record.version !== 1 || record.tenantId !== requestingTenantId) throw new Error('Cross-tenant access denied.');
    const decipher = createDecipheriv('aes-256-gcm', this.keyFor(requestingTenantId), Buffer.from(record.iv, 'hex'));
    decipher.setAAD(Buffer.from('solvex-record-v1:' + requestingTenantId));
    decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }
}