import { AuthService } from '../../src/auth/AuthService';
import { PersistentProofStore } from '../../src/security/PersistentProofStore';

type VercelRequest = {
  method?: string;
  headers: { authorization?: string; [key: string]: string | string[] | undefined };
  query: { proofId?: string | string[] };
  body?: unknown;
};
type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;
  const jwksUrl = process.env.AUTH_JWKS_URL;
  if (!issuer || !audience || !jwksUrl) {
    res.status(503).json({ error: 'PROOF_AUTH_NOT_CONFIGURED' });
    return;
  }

  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 16400) {
    res.status(401).json({ error: 'BEARER_TOKEN_REQUIRED' });
    return;
  }

  const identity = await AuthService.getInstance().verifyToken(authorization.slice(7));
  if (!identity.valid || !identity.user) {
    res.status(401).json({ error: 'INVALID_IDENTITY_TOKEN' });
    return;
  }

  const proofId = Array.isArray(req.query.proofId) ? req.query.proofId[0] : req.query.proofId;
  if (!proofId || !/^[a-zA-Z0-9._-]{1,128}$/.test(proofId)) {
    res.status(400).json({ error: 'INVALID_PROOF_ID' });
    return;
  }

  try {
    const store = new PersistentProofStore();
    if (req.method === 'PUT') {
      const body = req.body as { payload?: unknown } | undefined;
      if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'payload')) {
        res.status(400).json({ error: 'PAYLOAD_REQUIRED' });
        return;
      }
      const proof = await store.put(proofId, identity.user.tenant_id, body.payload);
      res.status(201).json({
        proof_id: proof.proofId,
        tenant_id: proof.tenantId,
        created_at: proof.createdAt,
        payload_sha256: proof.payloadSha256,
        persistence: 'DURABLE_READBACK_VERIFIED'
      });
      return;
    }

    const proof = await store.get(proofId, identity.user.tenant_id);
    res.status(200).json({
      proof_id: proof.proofId,
      tenant_id: proof.tenantId,
      created_at: proof.createdAt,
      payload: proof.payload,
      payload_sha256: proof.payloadSha256,
      integrity: 'VERIFIED'
    });
  } catch (error) {
    // Avoid disclosing object keys, credentials, or provider internals.
    const notFound = error instanceof Error && error.message.includes('not found');
    res.status(notFound ? 404 : 503).json({
      error: notFound ? 'PROOF_NOT_FOUND_OR_NOT_AUTHORIZED' : 'DURABLE_PROOF_STORAGE_UNAVAILABLE'
    });
  }
}
