import express from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import authRouter from '../../artifacts/api-server/src/routes/auth_native';
import { authMiddleware } from '../../artifacts/api-server/src/middlewares/authMiddleware';
import { logger } from '../../artifacts/api-server/src/lib/logger';
import { SovereignApiRouter } from '../api/ApiRouter';
import { readLiveRegistry } from '../registry/liveRegistry.mjs';
import daisyVercelProxyRouter from '../api/DaisyVercelProxyRouter';
import daisyInternalProxyRouter from '../api/DaisyInternalProxyRouter';

const router = express.Router();
const authBoundary: express.RequestHandler = (req, res, next) => {
  Promise.resolve(authMiddleware(req, res, next)).catch(next);
};

// Public liveness endpoint: deliberately mounted before OIDC/session middleware.
// It reports only process health and never exposes configuration or secrets.
router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', payments_enabled: false });
});

// Internal Vercel-to-Render calls require a service secret and a freshly verified signed tenant token.
router.use('/daisy-internal', daisyInternalProxyRouter);

// Keep the same-origin OIDC boundary shared by the Node server and Vercel functions.
// Daisy endpoints are mounted only after the shared middleware has resolved the session.
router.use('/', pinoHttp({ logger }), cookieParser(), authBoundary, authRouter);
router.use('/daisy', daisyVercelProxyRouter);

router.get('/registry', async (_req, res, next) => {
  try {
    const registry = await readLiveRegistry();
    res.status(registry.connected ? 200 : 503).json(registry);
  } catch (error) {
    next(error);
  }
});

const api = SovereignApiRouter.getInstance();
router.get('/system/health', async (_req, res, next) => {
  try {
    const result = await api.handleRequest('/api/system/health', 'GET');
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});
router.get('/system/status', async (_req, res, next) => {
  try {
    const result = await api.handleRequest('/api/system/status', 'GET');
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
