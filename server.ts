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
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Liveness must not depend on external services.
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness is intentionally fail-closed: never test with an arbitrary
  // owner DATABASE_URL. The deployment must provide the restricted runtime URL.
  app.get('/readyz', async (_req, res) => {
    const runtimeUrl = process.env.NEON_RUNTIME_DATABASE_URL;
    if (!runtimeUrl || !/^postgres(?:ql)?:\\/\\//i.test(runtimeUrl)) {
      res.status(503).json({
        status: 'not_ready',
        reason: 'NEON_RUNTIME_DATABASE_URL is not configured with a PostgreSQL URL'
      });
      return;
    }

    let pool: import('@neondatabase/serverless').Pool | undefined;
    try {
      const { Pool } = await import('@neondatabase/serverless');
      pool = new Pool({ connectionString: runtimeUrl });
      const result = await pool.query(
        'SELECT current_user AS role_name, COALESCE(rolbypassrls, false) AS bypass_rls FROM pg_roles WHERE rolname = current_user'
      );
      const role = result.rows?.[0];
      if (!role || role.role_name !== 'solvex_app_runtime' || role.bypass_rls !== false) {
        res.status(503).json({
          status: 'not_ready',
          reason: 'Database connection did not authenticate as the restricted solvex_app_runtime role'
        });
        return;
      }
      res.status(200).json({ status: 'ready', database: 'connected', runtime_role: role.role_name });
    } catch {
      // Do not return driver messages, connection strings, or provider details.
      res.status(503).json({ status: 'not_ready', reason: 'Restricted runtime database check failed' });
    } finally {
      if (pool) {
        try { await pool.end(); } catch {}
      }
    }
  });

  // Mount Sovereign API router on /api/*
  const apiRouter = SovereignApiRouter.getInstance();

  app.use('/api', (req, res) => {
    apiRouter.handleHttpRequest(req, res);
  });

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Project AGATE Sovereign Core] Running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
