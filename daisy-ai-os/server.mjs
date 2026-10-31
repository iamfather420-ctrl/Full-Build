import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DaisyRuntime } from './src/native-os/runtime/DaisyRuntime.ts';
import { ProcessLayer } from './src/native-os/process/ProcessLayer.ts';
import { PermissionKernel } from './src/native-os/permissions/PermissionKernel.ts';
import { SystemTools } from './src/native-os/system-tools/SystemTools.ts';
import { LocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 3090);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_PROMPT_CHARS = 20_000;
const STATIC_FILES = new Map([
  ['/','daisy-os.html'],
  ['/index.html','daisy-os.html'],
  ['/app.js','daisy-os.js'],
  ['/styles.css','daisy-os.css'],
]);

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error('PORT must be an integer from 1024 through 65535.');
}

process.env.DAISY_ACTIVATION_EVIDENCE_PATH ??= path.join(ROOT,'..','artifacts','daisy-brain-activation-gate.json');
const runtime = DaisyRuntime.getInstance('linux');
const processes = new ProcessLayer();
const permissions = new PermissionKernel();
const tools = new SystemTools(permissions, processes);
runtime.boot();
const inference = new LocalInferenceRuntime();

class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
}

function sendJson(res, statusCode, body) {
  applySecurityHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve,reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on('data',(chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        chunks.length = 0;
        reject(new HttpError(413,'REQUEST_TOO_LARGE','Request body exceeds 64 KiB.'));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end',() => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        reject(new HttpError(400,'EMPTY_REQUEST_BODY','A JSON request body is required.'));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400,'INVALID_JSON','Request body must be valid JSON.'));
      }
    });
    req.on('error',(error) => {
      if (!settled) reject(error);
    });
    req.on('aborted',() => {
      if (!settled) reject(new HttpError(400,'REQUEST_ABORTED','Request was aborted.'));
    });
  });
}

function publicInferenceInfo(info) {
  return {
    runtimeId: info.runtimeId,
    modelId: info.modelId,
    modelVersion: info.modelVersion,
    ready: info.ready,
    offlineCapable: info.offlineCapable,
    notes: info.notes,
  };
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new HttpError(400,'INVALID_MESSAGES',`messages must contain between 1 and ${MAX_MESSAGES} entries.`);
  }
  let total = 0;
  for (const message of messages) {
    if (!message || !['user','assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim()) {
      throw new HttpError(400,'INVALID_MESSAGE','Each message must have role user or assistant and non-empty text.');
    }
    if (message.content.length > MAX_MESSAGE_CHARS) {
      throw new HttpError(413,'MESSAGE_TOO_LARGE','A message exceeds 8,000 characters.');
    }
    total += message.content.length;
  }
  if (total > MAX_PROMPT_CHARS) {
    throw new HttpError(413,'PROMPT_TOO_LARGE','Combined conversation exceeds 20,000 characters.');
  }
  return messages.map(({role,content}) => ({role,content:content.trim()}));
}

function isHumanAuthorization(value) {
  return !!value && typeof value === 'object' &&
    typeof value.authorizationId === 'string' && typeof value.actor === 'string' &&
    value.actorType === 'human' && typeof value.subject === 'string' &&
    typeof value.resource === 'string' && ['read','write','execute','admin'].includes(value.action) &&
    Number.isSafeInteger(value.issuedAtMs) && Number.isSafeInteger(value.expiresAtMs) &&
    typeof value.signatureHex === 'string';
}

async function handle(req, res) {
  let url;
  try {
    url = new URL(req.url ?? '/',`http://${HOST}`);
  } catch {
    sendJson(res,400,{ok:false,code:'INVALID_URL',error:'Invalid request URL.'});
    return;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    const local = await inference.probe();
    sendJson(res,200,{
      ok:true,
      server:'ready',
      runtime:runtime.snapshot(),
      claimScope:runtime.claimScope(),
      inference:publicInferenceInfo(local),
    });
    return;
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    const contentType = String(req.headers['content-type'] ?? '').split(';',1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      sendJson(res,415,{ok:false,code:'JSON_REQUIRED',error:'Send Content-Type: application/json.'});
      return;
    }
    const body = await readJsonBody(req);
    const messages = validateMessages(body?.messages);
    const systemPrompt = typeof process.env.DAISY_SYSTEM_PROMPT === 'string' && process.env.DAISY_SYSTEM_PROMPT.trim()
      ? process.env.DAISY_SYSTEM_PROMPT.trim()
      : 'You are Daisy Haminja, a locally running assistant. Be clear about uncertainty and do not claim to perform actions that were not actually completed.';
    const result = await inference.generate({
      messages:[{role:'system',content:systemPrompt},...messages],
      timeoutMs:60_000,
    });
    const statusCode = result.status === 'OK' ? 200 : result.status === 'MALFORMED_INPUT' ? 400 : result.status === 'TIMEOUT' ? 504 : 503;
    sendJson(res,statusCode,result.status === 'OK'
      ? {ok:true,text:result.text,source:'first_party_local',runtimeId:result.runtimeId,modelId:result.modelId,modelVersion:result.modelVersion,durationMs:result.durationMs}
      : {ok:false,status:result.status,code:result.code ?? result.status,error:result.error ?? 'Local inference is unavailable.',runtimeId:result.runtimeId,modelId:result.modelId,durationMs:result.durationMs});
    return;
  }

  if (url.pathname === '/api/tools/invoke' && req.method === 'POST') {
    const contentType = String(req.headers['content-type'] ?? '').split(';',1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      sendJson(res,415,{ok:false,code:'JSON_REQUIRED',error:'Send Content-Type: application/json.'});
      return;
    }
    const body = await readJsonBody(req);
    if (typeof body?.subject !== 'string' || body.subject.length < 1 || body.subject.length > 128) {
      sendJson(res,400,{ok:false,code:'INVALID_SUBJECT',error:'subject must be a string of 1–128 characters.'});
      return;
    }
    const toolIds = ['fs_list','proc_status','mem_summary','audit_tail','node_ping'];
    if (typeof body.tool !== 'string' || !toolIds.includes(body.tool)) {
      sendJson(res,400,{ok:false,code:'INVALID_TOOL',error:'Unknown native tool.'});
      return;
    }
    if (body.authorization !== undefined && !isHumanAuthorization(body.authorization)) {
      sendJson(res,400,{ok:false,code:'INVALID_AUTHORIZATION',error:'Malformed signed human authorization.'});
      return;
    }
    const args = body.args && typeof body.args === 'object' && !Array.isArray(body.args) ? body.args : {};
    const outcome = tools.invoke(body.subject,body.tool,args,body.authorization);
    const statusCode = outcome.status === 'EXECUTED' ? 200 : outcome.status === 'DENIED' ? 403 : 501;
    sendJson(res,statusCode,outcome);
    return;
  }

  if (req.method === 'GET' && STATIC_FILES.has(url.pathname)) {
    const name = STATIC_FILES.get(url.pathname);
    const file = path.join(ROOT,'public',name);
    try {
      const content = await fs.readFile(file);
      applySecurityHeaders(res);
      res.statusCode = 200;
      res.setHeader('Content-Type',name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8');
      res.end(content);
    } catch {
      sendJson(res,503,{ok:false,code:'LOCAL_UI_UNAVAILABLE',error:'The local Daisy UI asset is missing.'});
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    sendJson(res,405,{ok:false,code:'METHOD_NOT_ALLOWED',error:'Method not allowed.'});
    return;
  }
  sendJson(res,404,{ok:false,code:'NOT_FOUND',error:'Not found.'});
}

export function createDaisyNativeServer() {
  return createServer((req,res) => {
    void handle(req,res).catch((error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
      const message = error instanceof HttpError ? error.message : 'The local request could not be completed.';
      sendJson(res,statusCode,{ok:false,code,error:message});
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createDaisyNativeServer();
  server.listen(PORT,HOST,() => {
    console.log(`[Daisy AI OS] listening on ${HOST}:${PORT}; external AI providers are never called.`);
  });
}
