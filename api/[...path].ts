import express from 'express';
import apiRouter from '../src/server/apiRouter';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb', strict: true }));

// Vercel catch-all receives /api/*; normalize to the shared router's root paths.
app.use((req, _res, next) => {
  if (req.url?.startsWith('/api/')) req.url = req.url.slice(4);
  else if (req.url === '/api') req.url = '/';
  next();
});
app.use(apiRouter);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log?.error({ err }, 'SolveX API request failed');
  if (!res.headersSent) res.status(500).json({ error: 'API_REQUEST_FAILED' });
});

export default app;
