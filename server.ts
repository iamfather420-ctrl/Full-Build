import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SovereignApiRouter } from './src/api/ApiRouter';
import { readLiveRegistry } from './src/registry/liveRegistry.mjs';
import { AuthService, type UserContext } from './src/auth/AuthService';
import { PersistentProofStore } from './src/security/PersistentProofStore';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 8080);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb', strict: true }));

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', payments_enabled: false });
  });

  app.get('/api/registry', async (_req, res) => {
    const registry = await readLiveRegistry();
    res.status(registry.connected ? 200 : 503).json(registry);
  });

  // Proof API trusts only a signed OIDC tenant claim. Tenant IDs supplied by
  // callers are never accepted; the object namespace is derived from the JWT.
  const requireProofIdentity = async (req: express.Request, res: express.Response): Promise<UserContext | null> => {
    if (!process.env.AUTH_ISSUER || !process.env.AUTH_AUDIENCE || !process.env.AUTH_JWKS_URL) {
      res.status(503).json({ error: 'PROOF_AUTH_NOT_CONFIGURED' });
      return null;
    }
    const authorization = req.headers.authorization ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 16400) {
      res.status(401).json({ error: 'BEARER_TOKEN_REQUIRED' });
      return null;
    }
    const result = await AuthService.getInstance().verifyToken(authorization.slice(7));
    if (!result.valid || !result.user) {
      res.status(401).json({ error: 'INVALID_IDENTITY_TOKEN' });
      return null;
    }
    return result.user;
  };

  app.put('/api/proofs/:proofId', async (req, res) => {
    const user = await requireProofIdentity(req, res);
    if (!user) return;
    const proofId = req.params.proofId;
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId)) {
      res.status(400).json({ error: 'INVALID_PROOF_ID' });
      return;
    }
    if (!req.body || typeof req.body !== 'object' || !Object.prototype.hasOwnProperty.call(req.body, 'payload')) {
      res.status(400).json({ error: 'PAYLOAD_REQUIRED' });
      return;
    }
    try {
      const store = new PersistentProofStore();
      const proof = await store.put(proofId, user.tenant_id, req.body.payload);
      res.status(201).json({
        proof_id: proof.proofId,
        tenant_id: proof.tenantId,
        created_at: proof.createdAt,
        payload_sha256: proof.payloadSha256,
        persistence: 'DURABLE_READBACK_VERIFIED'
      });
    } catch {
      res.status(503).json({ error: 'DURABLE_PROOF_STORAGE_UNAVAILABLE' });
    }
  });

  app.get('/api/proofs/:proofId', async (req, res) => {
    const user = await requireProofIdentity(req, res);
    if (!user) return;
    const proofId = req.params.proofId;
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(proofId)) {
      res.status(400).json({ error: 'INVALID_PROOF_ID' });
      return;
    }
    try {
      const store = new PersistentProofStore();
      const proof = await store.get(proofId, user.tenant_id);
      res.status(200).json({
        proof_id: proof.proofId,
        tenant_id: proof.tenantId,
        created_at: proof.createdAt,
        payload: proof.payload,
        payload_sha256: proof.payloadSha256,
        integrity: 'VERIFIED'
      });
    } catch {
      res.status(404).json({ error: 'PROOF_NOT_FOUND_OR_NOT_AUTHORIZED' });
    }
  });

  const api = SovereignApiRouter.getInstance();
  app.get('/api/system/health', async (_req, res) => {
    const result = await api.handleRequest('/api/system/health', 'GET');
    res.status(result.status).json(result.data);
  });
  app.get('/api/system/status', async (_req, res) => {
    const result = await api.handleRequest('/api/system/status', 'GET');
    res.status(result.status).json(result.data);
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false, fallthrough: true }));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SOLVEX] listening on ${port}; payments disabled`);
  });
}

startServer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
