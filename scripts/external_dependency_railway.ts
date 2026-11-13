import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, timingSafeEqual } from 'node:crypto';

const execFile = promisify(execFileCallback);
const port = Number(process.env.PORT || 8080);
const token = process.env.EXTERNAL_DEPENDENCY_RAILWAY_TOKEN || '';
const timeoutMs = 150_000;

type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED';
type Track = { name: string; status: Status; duration_ms: number; summary: string; evidence_hash?: string };

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function redact(value: string): string {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/(client_secret|password|token|authorization)\s*[:=]\s*[^\s,"]+/gi, '$1=[REDACTED]')
    .slice(-2500);
}
async function commandTrack(name: string, command: string, args: string[], requiredEnv: string[]): Promise<Track> {
  const start = Date.now();
  const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
  if (missing.length) return { name, status: 'BLOCKED', duration_ms: Date.now() - start, summary: `Missing required configuration: ${missing.join(', ')}` };
  try {
    const { stdout, stderr } = await execFile(command, args, {
      cwd: process.cwd(),
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    const evidence = redact(`${stdout}\n${stderr}`);
    return { name, status: 'PASS', duration_ms: Date.now() - start, summary: evidence || 'Command completed successfully.', evidence_hash: digest(evidence) };
  } catch (error: any) {
    const output = redact(`${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || 'Command failed'}`);
    return { name, status: 'FAIL', duration_ms: Date.now() - start, summary: output || 'Command failed without diagnostic output.', evidence_hash: digest(output) };
  }
}
async function httpTrack(name: string, rawUrl: string | undefined, expectedPaymentsDisabled = false): Promise<Track> {
  const start = Date.now();
  if (!rawUrl) return { name, status: 'BLOCKED', duration_ms: 0, summary: 'Required health-check URL is not configured.' };
  let url: URL;
  try { url = new URL(rawUrl); } catch { return { name, status: 'BLOCKED', duration_ms: 0, summary: 'Health-check URL is invalid.' }; }
  if (!['https:', 'http:'].includes(url.protocol)) return { name, status: 'BLOCKED', duration_ms: 0, summary: 'Only HTTP(S) health-check URLs are supported.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal, redirect: 'error' });
    const body = await response.text();
    if (!response.ok) return { name, status: 'FAIL', duration_ms: Date.now() - start, summary: `Health endpoint returned HTTP ${response.status}.`, evidence_hash: digest({ status: response.status, bodyLength: body.length }) };
    if (expectedPaymentsDisabled && !/payments_enabled\s*["']?\s*:\s*false/i.test(body)) {
      return { name, status: 'FAIL', duration_ms: Date.now() - start, summary: 'Health endpoint did not attest that payments are disabled.', evidence_hash: digest(body) };
    }
    return { name, status: 'PASS', duration_ms: Date.now() - start, summary: `Health endpoint returned HTTP ${response.status}.`, evidence_hash: digest({ status: response.status, bodyLength: body.length }) };
  } catch (error: any) {
    return { name, status: 'FAIL', duration_ms: Date.now() - start, summary: error?.name === 'AbortError' ? 'Health check timed out.' : 'Health endpoint was unreachable or rejected the request.' };
  } finally { clearTimeout(timer); }
}
async function additionalProviders(): Promise<Track> {
  const start = Date.now();
  const raw = process.env.SOLVEX_EXTERNAL_PROVIDERS_JSON;
  if (!raw) return { name: 'Additional provider inventory', status: 'NOT_TESTED', duration_ms: 0, summary: 'No additional provider probes are registered.' };
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) throw new Error('Expected an array');
    const checks = await Promise.all(entries.map(async (entry: any) => {
      if (!entry || typeof entry.name !== 'string' || typeof entry.url !== 'string') return { name: 'invalid-entry', status: 'BLOCKED' as Status };
      const r = await httpTrack(entry.name, entry.url);
      return { name: r.name, status: r.status, evidence_hash: r.evidence_hash };
    }));
    const status: Status = checks.some(x => x.status === 'FAIL') ? 'FAIL' : checks.some(x => x.status === 'BLOCKED') ? 'BLOCKED' : checks.every(x => x.status === 'PASS') ? 'PASS' : 'NOT_TESTED';
    return { name: 'Additional provider inventory', status, duration_ms: Date.now() - start, summary: JSON.stringify(checks), evidence_hash: digest(checks) };
  } catch {
    return { name: 'Additional provider inventory', status: 'BLOCKED', duration_ms: Date.now() - start, summary: 'Provider inventory JSON is invalid.' };
  }
}
async function runAll(sourceCommitSha?: string) {
  const started = new Date().toISOString();
  const tracks = await Promise.all([
    commandTrack('Neon signed OIDC tenant lifecycle + RLS', 'bash', ['scripts/test_oidc_tenant_claims.sh'], ['SOLVEX_NEON_ISOLATION_MIGRATION_DATABASE_URL']),
    commandTrack('Neon tenant isolation', 'bash', ['scripts/verify_neon_tenant_isolation_ci.sh'], ['SOLVEX_NEON_ISOLATION_TEST_DATABASE_URL', 'SOLVEX_NEON_TEST_TENANT_A', 'SOLVEX_NEON_TEST_TENANT_B']),
    commandTrack('PayPal sandbox OAuth authentication', 'bun', ['run', 'verify:paypal'], ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_ENVIRONMENT', 'PAYMENTS_ENABLED']),
    httpTrack('Vercel deployment health', process.env.VERCEL_DEPLOYMENT_URL, true),
    httpTrack('Railway application health', process.env.RAILWAY_TARGET_HEALTH_URL, true),
    commandTrack('Security and payment-disabled invariants', 'bun', ['run', 'verify:release-safety'], []),
    commandTrack('Payment processing disabled invariant', 'bun', ['run', 'verify:payments-disabled'], []),
    commandTrack('Daisy foundational safety invariant', 'bun', ['run', 'verify:daisy-safety'], []),
    additionalProviders(),
  ]);
  const pass = tracks.filter(t => t.status === 'PASS').length;
  const blocked = tracks.filter(t => t.status === 'BLOCKED').length;
  const failed = tracks.filter(t => t.status === 'FAIL').length;
  const notTested = tracks.filter(t => t.status === 'NOT_TESTED').length;
  const report = {
    schema_version: '1.0',
    execution_id: `external_railway_${Date.now()}`,
    started_at: started,
    completed_at: new Date().toISOString(),
    source_commit_sha: sourceCommitSha || null,
    orchestrator: 'railway-external-dependency-service',
    execution_mode: 'parallel-independent-tracks',
    summary: { total: tracks.length, pass, fail: failed, blocked, not_tested: notTested, verdict: pass === tracks.length ? 'PASS' : 'BLOCKED' },
    tracks,
  };
  return { ...report, evidence_hash: digest(report) };
}

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200); res.end(JSON.stringify({ status: 'ok', service: 'external-dependency-railway', payments_enabled: false })); return;
  }
  if (req.method !== 'POST' || req.url !== '/internal/external-dependencies/run') {
    res.writeHead(404); res.end(JSON.stringify({ error: 'not_found' })); return;
  }
  if (!token) { res.writeHead(503); res.end(JSON.stringify({ error: 'service_token_not_configured' })); return; }
  const auth = req.headers.authorization || '';
  const supplied = Buffer.from(auth.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(token);
  if (!/^Bearer\s+/i.test(auth) || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(401); res.end(JSON.stringify({ error: 'unauthorized' })); return;
  }
  let raw = '';
  for await (const chunk of req) { raw += chunk.toString(); if (raw.length > 16_384) { res.writeHead(413); res.end(JSON.stringify({ error: 'payload_too_large' })); return; } }
  let input: any = {};
  try { input = raw ? JSON.parse(raw) : {}; } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'invalid_json' })); return; }
  const report = await runAll(typeof input.source_commit_sha === 'string' ? input.source_commit_sha : undefined);
  res.writeHead(report.summary.verdict === 'PASS' ? 200 : 503);
  res.end(JSON.stringify(report));
});
server.listen(port, '0.0.0.0', () => console.log(`[external-dependency-railway] listening on ${port}; payments disabled`));
