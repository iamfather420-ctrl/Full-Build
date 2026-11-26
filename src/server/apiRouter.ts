import express from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import authRouter from '../../artifacts/api-server/src/routes/auth_native';
import { authMiddleware } from '../../artifacts/api-server/src/middlewares/authMiddleware';
import { logger } from '../../artifacts/api-server/src/lib/logger';
import { SovereignApiRouter } from '../api/ApiRouter';
import { readLiveRegistry } from '../registry/liveRegistry.mjs';
import daisyVercelProxyRouter from '../api/DaisyVercelProxyRouter';
import daisyBackendRouter from '../api/DaisyBackendRouter';
import daisyInternalProxyRouter from '../api/DaisyInternalProxyRouter';

const router = express.Router();
const authBoundary: express.RequestHandler = (req, res, next) => {
  Promise.resolve(authMiddleware(req, res, next)).catch(next);
};

// Vercel serves the authenticated proxy. Render keeps the local runtime and the
// service-to-service entry. The same file must not make Render proxy to itself.
const onVercel = process.env.VERCEL === '1';
if (!onVercel) {
  router.use('/daisy-internal', daisyInternalProxyRouter);
}

// Keep the same-origin OIDC boundary shared by the Node server and Vercel functions.
// Daisy endpoints are mounted only after the shared middleware has resolved the session.
router.use('/', pinoHttp({ logger }), cookieParser(), authBoundary, authRouter);
router.use('/daisy', onVercel ? daisyVercelProxyRouter : daisyBackendRouter);

const healthHandler: express.RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok', payments_enabled: false });
};
router.get('/healthz', healthHandler);

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
