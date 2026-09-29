import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SovereignApiRouter } from './src/api/ApiRouter';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const production = process.env.NODE_ENV === 'production';
  const apiRouter = SovereignApiRouter.getInstance();

  // Webhooks require the original body representation; all other API routes use JSON parsing.
  app.post('/api/payments/paypal/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => apiRouter.handleHttpRequest(req, res));
  app.use(express.json({ limit: '1mb' }));
  app.all('/api/*', (req, res) => apiRouter.handleHttpRequest(req, res));

  if (!production) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  app.listen(port, '0.0.0.0', () => console.log(`[SOLVEX] listening on http://0.0.0.0:${port}`));
}

startServer().catch(error => { console.error('Server startup error:', error); process.exit(1); });
