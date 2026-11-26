import express from 'express';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import daisyVercelProxyRouter from '../src/api/DaisyVercelProxyRouter.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb', strict: true }));

app.get(['/healthz', '/api/healthz'], (_req, res) => {
  res.status(200).json({ status: 'ok', payments_enabled: false });
});

let prepared: Promise<void> | undefined;

async function prepare(): Promise<void> {
  try {
    const [{ authMiddleware }, authMod] = await Promise.all([
      import('../artifacts/api-server/src/middlewares/authMiddleware.js'),
      import('../artifacts/api-server/src/routes/auth_native.js'),
    ]);
    app.use(cookieParser());
    app.use((req, res, next) => {
      Promise.resolve(authMiddleware(req, res, next)).catch(next);
    });
    app.use(authMod.default);
  } catch {
    // Preview has no tenant database. Leave claims unset so the proxy fail-closes.
  }
  app.use('/daisy', daisyVercelProxyRouter);
  app.use('/api/daisy', daisyVercelProxyRouter);
  app.use((err: unknown, req: Request, res: Response, _next: express.NextFunction) => {
    req.log?.error({ err }, 'SolveX API request failed');
    if (!res.headersSent) res.status(500).json({ error: 'API_REQUEST_FAILED' });
  });
}

export default async function handler(req: Request, res: Response) {
  prepared ??= prepare();
  await prepared;
  return app(req, res);
}
