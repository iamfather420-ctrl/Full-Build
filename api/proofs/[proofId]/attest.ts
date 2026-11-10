import { createHash } from 'node:crypto';
import { AuthService } from '../../../src/auth/AuthService';
import { PersistentProofStore } from '../../../src/security/PersistentProofStore';
import { IndependentModelOracle, type OracleAttestation } from '../../../src/security/IndependentModelOracle';

type VercelRequest = {
  method?: string;
  headers: { authorization?: string; [key: string]: string | string[] | undefined };
  query: { proofId?: string | string[] };
};
type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;
  const jwksUrl = process.env.AUTH_JWKS_URL;
  const oracleUrl = process.env.SOLVEX_ORACLE_URL;
  const oracleSecret = process.env.SOLVEX_ORACLE_SHARED_SECRET;
  const publicKey = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY;
  const oracleId = process.env.SOLVEX_ORACLE_ID;
  if (!issuer || !audience || !jwksUrl || !oracleUrl || !oracleSecret || !publicKey || !oracleId) {
    res.status(503).json({ error: 'PROOF_ORACLE_NOT_CONFIGURED' });
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
    // Retrieve from durable object storage first; this verifies tenant binding,
    // payload digest and HMAC before the independent oracle sees the envelope.
    const proof = await new PersistentProofStore().get(proofId, identity.user.tenant_id);
    const input = {
      schema: proof.schema,
      proofId: proof.proofId,
      tenantId: proof.tenantId,
      createdAt: proof.createdAt,
      payload: proof.payload,
      payloadSha256: proof.payloadSha256,
      hmacSha256: proof.hmacSha256
    };
    const response = await fetch(oracleUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${oracleSecret}`
      },
      body: JSON.stringify({ protocol: 'solvex-independent-oracle-v1', input }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Oracle service rejected the verification request.');
    const attestation = await response.json() as OracleAttestation & { rationale?: string };
    const expectedInput = createHash('sha256')
      .update(JSON.stringify({ protocol: 'solvex-independent-oracle-v1', input }))
      .digest('hex');
    if (!IndependentModelOracle.verifyAttestation(attestation, oracleId, expectedInput, publicKey)) {
      throw new Error('Independent oracle signature verification failed.');
    }
    if (attestation.verdict !== 'ACCEPT') {
      res.status(422).json({ error: 'ORACLE_REJECTED_PROOF', attestation });
      return;
    }
    res.status(200).json({
      proof_id: proof.proofId,
      tenant_id: proof.tenantId,
      payload_sha256: proof.payloadSha256,
      attestation,
      signature_verified: true,
      oracle: oracleId
    });
  } catch {
    res.status(503).json({ error: 'INDEPENDENT_ORACLE_UNAVAILABLE_OR_INVALID' });
  }
}
