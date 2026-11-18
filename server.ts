import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './src/server/apiRouter';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 8080);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb', strict: true }));
  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok', payments_enabled: false }));
  app.use('/api', apiRouter);

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
