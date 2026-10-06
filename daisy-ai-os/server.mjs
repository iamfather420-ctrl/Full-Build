/**
 * UNIFIED DAISY AI OS — pure Node server
 * node --experimental-strip-types server.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SovereignApiRouter } from './src/api/ApiRouter.ts';
import { UnifiedDaisyAIOS } from './src/native-os/UnifiedDaisyAIOS.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const api = SovereignApiRouter.getInstance();
const os = new UnifiedDaisyAIOS('linux');
const boot = os.activate();
console.log(`[Daisy AI OS] ${boot.os} · act=${boot.runtime.activation} · procs=${boot.processes.length}`);

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  if (url.pathname.startsWith('/api')) {
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : undefined;
    try {
      const result = await api.handleRequest(url.pathname, method, body);
      return sendJson(res, result.status, result);
    } catch (e) {
      return sendJson(res, 500, { status: 500, error: String(e?.message || e), timestamp: Date.now() });
    }
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const file = path.join(__dirname, 'public', 'daisy-os.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(file, 'utf8'));
  }

  const rel = url.pathname.replace(/^\/+/, '');
  const candidate = path.join(__dirname, 'public', rel);
  if (rel && !rel.includes('..') && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    return res.end(fs.readFileSync(candidate));
  }

  sendJson(res, 404, { status: 404, error: 'not found', path: url.pathname, timestamp: Date.now() });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Daisy AI OS] listening http://127.0.0.1:${PORT}`);
});
