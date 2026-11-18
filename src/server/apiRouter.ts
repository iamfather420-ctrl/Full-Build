import express from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import authRouter from '../../artifacts/api-server/src/routes/auth_native';
import { authMiddleware } from '../../artifacts/api-server/src/middlewares/authMiddleware';
import { logger } from '../../artifacts/api-server/src/lib/logger';
import { SovereignApiRouter } from '../api/ApiRouter';
import { readLiveRegistry } from '../registry/liveRegistry.mjs';

const router = express.Router();

// Keep the same-origin OIDC boundary shared by the Node server and Vercel functions.
router.use('/api', pinoHttp({ logger }), cookieParser(), authMiddleware, authRouter);

const healthHandler: express.RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok', payments_enabled: false });
};
router.get(['/healthz', '/api/healthz'], healthHandler);

router.get('/api/registry', async (_req, res, next) => {
  try {
    const registry = await readLiveRegistry();
    res.status(registry.connected ? 200 : 503).json(registry);
  } catch (error) {
    next(error);
  }
});

const api = SovereignApiRouter.getInstance();
router.get('/api/system/health', async (_req, res, next) => {
  try {
    const result = await api.handleRequest('/api/system/health', 'GET');
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});
router.get('/api/system/status', async (_req, res, next) => {
  try {
    const result = await api.handleRequest('/api/system/status', 'GET');
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
