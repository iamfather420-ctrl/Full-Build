import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import authRouter from './artifacts/api-server/src/routes/auth_native';
import { authMiddleware } from './artifacts/api-server/src/middlewares/authMiddleware';
import { logger } from './artifacts/api-server/src/lib/logger';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SovereignApiRouter } from './src/api/ApiRouter';
import { readLiveRegistry } from './src/registry/liveRegistry.mjs';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 8080);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb', strict: true }));
  // Mount the production OIDC endpoints on the same origin as the SPA.
  app.use('/api', pinoHttp({ logger }), cookieParser(), authMiddleware, authRouter);

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', payments_enabled: false });
  });

  app.get('/api/registry', async (_req, res) => {
    const registry = await readLiveRegistry();
    res.status(registry.connected ? 200 : 503).json(registry);
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
