import http from 'node:http';
import crypto from 'node:crypto';
import { AIOSRuntime } from './core.js';

const runtime = new AIOSRuntime();
const port = Number(process.env.AI_OS_PORT || 8787);
const bind = process.env.AI_OS_BIND || '127.0.0.1';
const apiToken = process.env.AI_OS_API_TOKEN || '';
const allowedOrigin = process.env.AI_OS_ALLOWED_ORIGIN || '';
const maxBodyBytes = Number(process.env.AI_OS_MAX_BODY_BYTES || 1048576);
function authorized(req: http.IncomingMessage) {
  if (!apiToken) return true;
  const supplied = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  const a = Buffer.from(supplied); const b = Buffer.from(apiToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('cache-control', 'no-store');
  if (allowedOrigin) res.setHeader('access-control-allow-origin', allowedOrigin);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (!authorized(req)) { res.writeHead(401, { 'www-authenticate': 'Bearer' }); return res.end(JSON.stringify({ error: 'Unauthorized' })); }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/runtime/status') return res.end(JSON.stringify(runtime.status()));
    if (req.method === 'GET' && url.pathname === '/runtime/system') return res.end(JSON.stringify(await runtime.tools.call({ name: 'system.info', input: {} })));
    if (req.method === 'POST' && url.pathname === '/runtime/ask') {
      let body = ''; let bytes = 0;
      for await (const chunk of req) { bytes += Buffer.byteLength(chunk); if (bytes > maxBodyBytes) { res.writeHead(413); return res.end(JSON.stringify({ error: 'Request too large' })); } body += chunk; }
      const result = await runtime.ask(String((JSON.parse(body || '{}') as any).prompt || ''));
      return res.end(JSON.stringify(result));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); }
});
server.listen(port, bind, () => console.log(`Daisy AI OS Runtime listening on http://${bind}:${port}${apiToken ? ' (token protected)' : ''}`));
