import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { join } from 'node:path';
import { scanPublicRepository } from './scanner.js';
import { getScan, recordChoice, saveScan } from './store.js';
import { getIdentityHeader, publishScanToRegistry } from './registry.js';

const app = express();
app.disable('x-powered-by');
// Webdev Preview sits behind one trusted proxy; trust the nearest hop for IP-based rate limiting.
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'");
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use('/api/v1', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', capabilities: { publicReadOnlyScan: true, registryPublish: Boolean(process.env.SOLVEX_REGISTRY_API_ORIGIN), registryReadback: Boolean(process.env.SOLVEX_REGISTRY_API_ORIGIN), mongodb: !!process.env.MONGO_URL, githubOAuth: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET), isolatedRunner: false, githubWrites: false } }));

// Each scan can fan out to GitHub. Bound aggregate process-level work as well as per-scan work.
const maxConcurrentScans = 3;
let activeScans = 0;
app.post('/api/v1/scans', async (req, res) => {
  const parsed = z.object({ repository: z.string().url().max(500) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues.map(issue => issue.message) });
  if (activeScans >= maxConcurrentScans) return res.status(503).setHeader('Retry-After', '10').json({ error: 'Scan capacity is busy. Retry shortly.' });
  activeScans += 1;
  try {
    const report = await scanPublicRepository(parsed.data.repository);
    return res.status(201).json(await saveScan(report));
  } catch (err) {
    const error = err as Error & { status?: number };
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
    if (status === 500) console.error('Scan request failed:', err);
    return res.status(status).json({ error: status === 500 ? 'Scan failed due to a server error.' : error.message || 'Scan failed.', status });
  } finally {
    activeScans -= 1;
  }
});
app.get('/api/v1/scans/:id', async (req, res) => {
  try {
    const report = await getScan(req.params.id);
    if (!report) return res.status(404).json({ error: 'Scan not found or expired.' });
    return res.json(report);
  } catch (err) { console.error('Scan lookup failed:', err); return res.status(503).json({ error: 'Scan storage unavailable.' }); }
});

// Publishing is explicit. The signed gate identity is forwarded to the Registry;
// the Registry verifies it and scopes the immutable record to the signed tenant.
app.post('/api/v1/scans/:id/publish', async (req, res) => {
  const token = getIdentityHeader(req.headers['x-grok-identity']);
  const forwardedHost = getIdentityHeader(req.headers['x-forwarded-host']);
  if (!token) return res.status(401).json({ error: 'Authenticated gate identity is required before publishing.' });
  try {
    const report = await getScan(req.params.id);
    if (!report) return res.status(404).json({ error: 'Scan not found or expired.' });
    const result = await publishScanToRegistry(report, token, forwardedHost);
    return res.status(200).json({ ...result, verifiedReadback: true });
  } catch (err) {
    const error = err as Error & { status?: number };
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Registry publishing or readback failed.', verifiedReadback: false });
  }
});

app.post('/api/v1/scans/:id/choices', async (req, res) => {
  const parsed = z.object({ findingId: z.string().max(40), choice: z.string().min(1).max(200), rationale: z.string().min(10).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose an option and provide a rationale of at least 10 characters.' });
  try {
    const saved = await recordChoice(req.params.id, parsed.data);
    if (!saved) return res.status(404).json({ error: 'Scan or finding not found.' });
    return res.status(201).json({ status: 'RECORDED', ...saved });
  } catch (err) { console.error('Choice persistence failed:', err); return res.status(503).json({ error: 'Choice could not be stored.' }); }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
const root = join(process.cwd(), 'dist/client');
app.use(express.static(root, { etag: true, maxAge: '1h', index: false }));
app.get('/{*path}', (req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(join(root, 'index.html'), error => { if (error) next(error); });
});
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) return;
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const candidateStatus = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
  const status = typeof candidateStatus === 'number' && candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
  if (status >= 500) console.error('Unhandled HTTP error:', err);
  return res.status(status).json({ error: status === 400 ? 'Malformed or invalid request body.' : status === 413 ? 'Request body is too large.' : status >= 500 ? 'Internal server error.' : 'Request could not be processed.' });
});
const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => console.log(`GIT G.O.A.T. API listening on ${port}`));
