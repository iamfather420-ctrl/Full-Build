import { Router, type Request, type Response } from 'express';
import { PersistentProofStore } from '../security/PersistentProofStore';
import { verifyNeonTenantSession, type VerifiedTenantSession } from '../auth/NeonSignedSession';

interface AuthenticatedRequest extends Request {
  solvexSession?: VerifiedTenantSession;
}

const router = Router();
let store: PersistentProofStore | null = null;

function proofStore(): PersistentProofStore {
  if (!store) store = new PersistentProofStore();
  return store;
}

async function authenticate(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  const session = await verifyNeonTenantSession(req.header('authorization'));
  if (!session) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'A valid signed SolveX tenant token is required.' });
    return false;
  }
  req.solvexSession = session;
  return true;
}

router.put('/:proofId', async (req: AuthenticatedRequest, res: Response) => {
  if (!await authenticate(req, res)) return;
  const proofId = req.params.proofId;
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId)) {
    res.status(400).json({ error: 'INVALID_PROOF_ID' });
    return;
  }
  try {
    const saved = await proofStore().put(proofId, req.solvexSession!.tenant_id, req.body);
    res.status(201).json({
      proof_id: saved.proofId,
      tenant_id: saved.tenantId,
      created_at: saved.createdAt,
      payload: saved.payload,
      payload_sha256: saved.payloadSha256,
      persistence: 'DURABLE_READBACK_VERIFIED'
    });
  } catch (error) {
    // Never report a successful write if upload or independent readback failed.
    const message = error instanceof Error ? error.message : 'Proof persistence failed.';
    const unavailable = /environment|credentials|bucket|endpoint/i.test(message);
    res.status(unavailable ? 503 : 502).json({
      error: unavailable ? 'PROOF_STORAGE_UNAVAILABLE' : 'PROOF_PERSISTENCE_FAILED',
      message
    });
  }
});

router.get('/:proofId', async (req: AuthenticatedRequest, res: Response) => {
  if (!await authenticate(req, res)) return;
  const proofId = req.params.proofId;
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId)) {
    res.status(400).json({ error: 'INVALID_PROOF_ID' });
    return;
  }
  try {
    // Tenant is taken only from the database-verified signed token, never URL/body.
    const proof = await proofStore().get(proofId, req.solvexSession!.tenant_id);
    res.status(200).json({
      proof_id: proof.proofId,
      tenant_id: proof.tenantId,
      created_at: proof.createdAt,
      payload: proof.payload,
      payload_sha256: proof.payloadSha256,
      integrity: 'VERIFIED'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proof read failed.';
    const missing = /not found/i.test(message);
    res.status(missing ? 404 : 502).json({
      error: missing ? 'PROOF_NOT_FOUND' : 'PROOF_READ_FAILED',
      message
    });
  }
});

export default router;
