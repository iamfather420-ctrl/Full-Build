import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface PersistedProofEnvelope {
  schema: 1;
  proofId: string;
  tenantId: string;
  createdAt: string;
  payload: unknown;
  payloadSha256: string;
  hmacSha256: string;
}

/**
 * Durable proof persistence backed by the branch-scoped Neon S3-compatible bucket.
 * The server-side AWS credentials and integrity key must never be exposed to clients.
 * Every write is read back and cryptographically checked before it is acknowledged.
 */
export class PersistentProofStore {
  private readonly endpoint: URL;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly key: string;

  constructor(_legacyDirectory?: string, key = process.env.SOLVEX_PROOF_HMAC_KEY ?? '') {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 ?? '';
    this.bucket = process.env.SOLVEX_PROOF_BUCKET ?? '';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
    this.region = process.env.AWS_REGION ?? '';
    this.key = key;

    if (!endpoint || !this.bucket || !this.accessKeyId || !this.secretAccessKey || !this.region) {
      throw new Error('Durable proof storage requires the branch-scoped Neon S3 environment.');
    }
    if (Buffer.byteLength(this.key) < 32) {
      throw new Error('Durable proof storage requires a 32-byte SOLVEX_PROOF_HMAC_KEY.');
    }
    this.endpoint = new URL(endpoint);
    if (this.endpoint.protocol !== 'https:' || this.endpoint.username || this.endpoint.password ||
        this.endpoint.search || this.endpoint.hash) {
      throw new Error('Proof storage endpoint must be a clean HTTPS origin.');
    }
  }

  async put(proofId: string, tenantId: string, payload: unknown): Promise<PersistedProofEnvelope> {
    this.assertIds(proofId, tenantId);
    const payloadJson = JSON.stringify(payload);
    if (typeof payloadJson !== 'string') throw new Error('Proof payload is not JSON serializable.');

    const unsigned = {
      schema: 1 as const,
      proofId,
      tenantId,
      createdAt: new Date().toISOString(),
      payload,
      payloadSha256: createHash('sha256').update(payloadJson).digest('hex')
    };
    const envelope: PersistedProofEnvelope = {
      ...unsigned,
      hmacSha256: createHmac('sha256', this.key).update(JSON.stringify(unsigned)).digest('hex')
    };

    const objectKey = this.objectKey(tenantId, proofId);
    const bytes = Buffer.from(JSON.stringify(envelope), 'utf8');
    const uploaded = await this.s3Request('PUT', objectKey, bytes, 'application/json');
    if (!uploaded.ok) throw new Error(`Proof object upload failed with HTTP ${uploaded.status}.`);

    // Do not acknowledge persistence until a separate GET returns the exact bytes
    // and the envelope passes both digest and tenant-binding verification.
    const persisted = await this.get(proofId, tenantId);
    if (JSON.stringify(persisted) !== JSON.stringify(envelope)) {
      throw new Error('Proof object readback did not match the committed envelope.');
    }
    return persisted;
  }

  async get(proofId: string, tenantId: string): Promise<PersistedProofEnvelope> {
    this.assertIds(proofId, tenantId);
    const response = await this.s3Request('GET', this.objectKey(tenantId, proofId));
    if (!response.ok) {
      if (response.status === 404) throw new Error('Proof object was not found.');
      throw new Error(`Proof object read failed with HTTP ${response.status}.`);
    }

    const envelope = JSON.parse(Buffer.from(await response.arrayBuffer()).toString('utf8')) as PersistedProofEnvelope;
    if (!envelope || envelope.schema !== 1 || envelope.proofId !== proofId || envelope.tenantId !== tenantId) {
      throw new Error('Proof envelope identity or tenant binding is invalid.');
    }

    const { hmacSha256, ...unsigned } = envelope;
    const payloadJson = JSON.stringify(envelope.payload);
    const payloadDigest = createHash('sha256').update(payloadJson).digest('hex');
    const expectedHmac = createHmac('sha256', this.key).update(JSON.stringify(unsigned)).digest();
    const suppliedHmac = /^[a-f0-9]{64}$/.test(hmacSha256 ?? '') ? Buffer.from(hmacSha256, 'hex') : Buffer.alloc(0);

    if (payloadDigest !== envelope.payloadSha256 || suppliedHmac.length !== expectedHmac.length ||
        !timingSafeEqual(expectedHmac, suppliedHmac)) {
      throw new Error('Proof integrity verification failed.');
    }
    return envelope;
  }

  private assertIds(proofId: string, tenantId: string): void {
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId) || !/^[a-zA-Z0-9._-]{1,128}$/.test(tenantId)) {
      throw new Error('Invalid proof or tenant identifier.');
    }
  }

  private objectKey(tenantId: string, proofId: string): string {
    return `proofs/${tenantId}/${proofId}.proof.json`;
  }

  private encodePath(value: string): string {
    return value.split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g,
      char => '%' + char.charCodeAt(0).toString(16).toUpperCase())).join('/');
  }

  private hmac(key: Buffer | string, value: string): Buffer {
    return createHmac('sha256', key).update(value, 'utf8').digest();
  }

  private async s3Request(method: 'GET' | 'PUT', objectKey: string, body?: Buffer, contentType?: string): Promise<Response> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body ?? Buffer.alloc(0)).digest('hex');
    const canonicalUri = `${this.endpoint.pathname.replace(/\/$/, '')}/${this.encodePath(this.bucket)}/${this.encodePath(objectKey)}`;
    const url = new URL(this.endpoint.origin + canonicalUri);

    const canonicalHeaders: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    };
    if (contentType) canonicalHeaders['content-type'] = contentType;
    const signedHeaders = Object.keys(canonicalHeaders).sort().join(';');
    const headerBlock = Object.keys(canonicalHeaders).sort()
      .map(name => `${name}:${canonicalHeaders[name].trim()}\n`).join('');
    const canonicalRequest = [
      method, canonicalUri, '', headerBlock, signedHeaders, payloadHash
    ].join('\n');
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256', amzDate, scope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    const dateKey = this.hmac('AWS4' + this.secretAccessKey, dateStamp);
    const regionKey = this.hmac(dateKey, this.region);
    const serviceKey = this.hmac(regionKey, 's3');
    const signingKey = this.hmac(serviceKey, 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization
    };
    if (contentType) headers['content-type'] = contentType;
    return fetch(url, { method, headers, ...(body ? { body } : {}) });
  }
}
