import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export type Permission = 'system.info' | 'memory.read' | 'memory.write' | 'files.read' | 'files.write' | 'process.exec';
export type Message = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };
export type ToolCall = { name: string; input: Record<string, unknown> };

const root = path.resolve(process.env.AI_OS_WORKSPACE || process.cwd());
const dataDir = path.join(root, 'runtime', 'data');
const memoryFile = path.join(dataDir, 'memory.jsonl');
const auditFile = path.join(dataDir, 'audit.jsonl');
fs.mkdirSync(dataDir, { recursive: true });

function hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function safePath(input: string) {
  const resolved = path.resolve(root, input || '.');
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Path is outside the AI OS workspace');
  return resolved;
}
function audit(event: string, detail: Record<string, unknown>) {
  const previous = fs.existsSync(auditFile) ? fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean).at(-1) : '';
  const record = { ts: new Date().toISOString(), event, detail, previous: previous ? JSON.parse(previous).hash : null };
  fs.appendFileSync(auditFile, JSON.stringify({ ...record, hash: hash(JSON.stringify(record)) }) + '\n');
}

export class PermissionGate {
  private grants = new Set<Permission>((process.env.AI_OS_PERMISSIONS || 'system.info,memory.read,memory.write,files.read').split(',').filter(Boolean) as Permission[]);
  has(permission: Permission) { return this.grants.has(permission); }
  require(permission: Permission) { if (!this.has(permission)) throw new Error(`Permission denied: ${permission}`); }
  grant(permission: Permission) { this.grants.add(permission); audit('permission.grant', { permission }); }
  list() { return [...this.grants]; }
}

export class MemoryStore {
  constructor(private gate: PermissionGate) {}
  recall(query = '', limit = 20) {
    this.gate.require('memory.read');
    if (!fs.existsSync(memoryFile)) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return fs.readFileSync(memoryFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(item => !terms.length || terms.every(t => item.text.toLowerCase().includes(t))).slice(-limit);
  }
  remember(text: string, tags: string[] = []) {
    this.gate.require('memory.write');
    const item = { id: crypto.randomUUID(), ts: new Date().toISOString(), text, tags };
    fs.appendFileSync(memoryFile, JSON.stringify(item) + '\n'); audit('memory.write', { id: item.id }); return item;
  }
}

export class ToolRegistry {
  constructor(private gate: PermissionGate, private memory: MemoryStore) {}
  async call(call: ToolCall): Promise<unknown> {
    audit('tool.request', call);
    if (call.name === 'system.info') {
      this.gate.require('system.info');
      return { platform: process.platform, arch: process.arch, release: os.release(), hostname: os.hostname(), cpus: os.cpus().length, memory: os.totalmem(), cwd: root, node: process.version };
    }
    if (call.name === 'memory.recall') return this.memory.recall(String(call.input.query || ''), Number(call.input.limit || 20));
    if (call.name === 'memory.remember') return this.memory.remember(String(call.input.text || ''), Array.isArray(call.input.tags) ? call.input.tags as string[] : []);
    if (call.name === 'files.list') { this.gate.require('files.read'); return fs.readdirSync(safePath(String(call.input.path || '.')), { withFileTypes: true }).map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })); }
    if (call.name === 'files.read') { this.gate.require('files.read'); return fs.readFileSync(safePath(String(call.input.path)), 'utf8').slice(0, 20000); }
    if (call.name === 'files.write') { this.gate.require('files.write'); const target = safePath(String(call.input.path)); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, String(call.input.content || '')); return { written: path.relative(root, target) }; }
    if (call.name === 'process.exec') { this.gate.require('process.exec'); const command = String(call.input.command || ''); if (!/^(node|npm|pnpm|python|git|echo|uname|whoami|pwd)\b/.test(command)) throw new Error('Command is not on the default allowlist'); const [bin, ...args] = command.split(/\s+/); const result = await execFileAsync(bin, args, { cwd: root, timeout: 15000, maxBuffer: 200000 }); return { stdout: result.stdout, stderr: result.stderr }; }
    throw new Error(`Unknown tool: ${call.name}`);
  }
}

export class ModelRouter {
  async complete(messages: Message[]): Promise<{ text: string; provider: string }> {
    const key = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    const base = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const model = process.env.AI_OS_MODEL || 'gpt-4o-mini';
    if (key && process.env.GEMINI_API_KEY === undefined) {
      const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages, temperature: 0.2 }) });
      if (!response.ok) throw new Error(`Model provider error ${response.status}: ${await response.text()}`);
      const json = await response.json() as any;
      const text = json.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return { text, provider: `openai-compatible:${model}` };
      return { provider: 'offline-fallback', text: `The configured model returned no usable text. Offline AI runtime received: ${messages.at(-1)?.content || ''}` };
    }
    const last = messages.at(-1)?.content || '';
    return { provider: 'offline-deterministic', text: `Offline AI runtime received: ${last}\n\nNo cloud model is configured. Set OPENAI_API_KEY and optionally OPENAI_API_BASE/AI_OS_MODEL to enable model-backed reasoning.` };
  }
}

export class AIOSRuntime {
  readonly permissions = new PermissionGate();
  readonly memory = new MemoryStore(this.permissions);
  readonly tools = new ToolRegistry(this.permissions, this.memory);
  readonly models = new ModelRouter();
  async ask(prompt: string) {
    const context = this.memory.recall(prompt, 5);
    const result = await this.models.complete([{ role: 'system', content: 'You are the portable AI OS assistant. Respect permissions and never claim an action happened unless a tool confirms it.' }, { role: 'system', content: `Relevant memory: ${JSON.stringify(context)}` }, { role: 'user', content: prompt }]);
    audit('model.complete', { provider: result.provider, prompt: prompt.slice(0, 200) }); return result;
  }
  status() { return { name: 'Daisy AI OS Runtime', version: '0.1.0', root, platform: process.platform, permissions: this.permissions.list(), model: process.env.OPENAI_API_KEY ? 'configured' : 'offline-deterministic', audit: auditFile, memory: memoryFile }; }
}
