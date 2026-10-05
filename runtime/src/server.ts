import http from 'node:http';
import { AIOSRuntime } from './core.js';

const runtime = new AIOSRuntime();
const port = Number(process.env.AI_OS_PORT || 8787);
const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/runtime/status') return res.end(JSON.stringify(runtime.status()));
    if (req.method === 'GET' && url.pathname === '/runtime/system') return res.end(JSON.stringify(await runtime.tools.call({ name: 'system.info', input: {} })));
    if (req.method === 'POST' && url.pathname === '/runtime/ask') {
      let body = ''; for await (const chunk of req) body += chunk;
      const result = await runtime.ask(String((JSON.parse(body || '{}') as any).prompt || ''));
      return res.end(JSON.stringify(result));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); }
});
server.listen(port, '0.0.0.0', () => console.log(`Daisy AI OS Runtime listening on http://0.0.0.0:${port}`));
