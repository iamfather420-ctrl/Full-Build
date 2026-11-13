import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED';
const endpoint = process.env.SOLVEX_EXTERNAL_DEPENDENCY_PROXY_URL?.trim();
const token = process.env.EXTERNAL_DEPENDENCY_GATE_CALLER_TOKEN?.trim();

async function main() {
  const started = new Date().toISOString();
  let report: any;
  if (!endpoint || !token) {
    report = {
      schema_version: '1.0',
      execution_id: `external_proxy_unavailable_${Date.now()}`,
      started_at: started,
      completed_at: new Date().toISOString(),
      summary: { total: 1, pass: 0, fail: 0, blocked: 1, not_tested: 0, verdict: 'BLOCKED' },
      tracks: [{ name: 'SolveX Vercel external dependency proxy', status: 'BLOCKED' as Status, duration_ms: 0, summary: 'SOLVEX_EXTERNAL_DEPENDENCY_PROXY_URL or EXTERNAL_DEPENDENCY_GATE_CALLER_TOKEN is missing.' }]
    };
  } else {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !url.pathname.endsWith('/api/external-dependencies/run')) {
      throw new Error('SolveX external dependency proxy must be an HTTPS /api/external-dependencies/run URL.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source_commit_sha: process.env.GITHUB_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || null }),
        signal: controller.signal,
      });
      const body = await response.text();
      try { report = JSON.parse(body); } catch { throw new Error(`SolveX proxy returned non-JSON HTTP ${response.status}.`); }
      if (!response.ok && !report?.summary) throw new Error(`SolveX proxy returned HTTP ${response.status} without evidence.`);
    } finally { clearTimeout(timer); }
  }
  const reportHash = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
  const artifact = { ...report, client_observed_at: new Date().toISOString(), client_evidence_hash: reportHash };
  const dir = path.resolve('artifacts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'external-dependency-railway.json'), JSON.stringify(artifact, null, 2));
  console.log('[EXTERNAL-DEPENDENCY-RAILWAY]', JSON.stringify({
    execution_id: artifact.execution_id,
    summary: artifact.summary,
    tracks: (artifact.tracks || []).map((t: any) => ({ name: t.name, status: t.status, duration_ms: t.duration_ms })),
    evidence_hash: reportHash
  }));
  if (artifact.summary?.verdict !== 'PASS') {
    throw new Error('External dependency verification is not fully PASS. See artifacts/external-dependency-railway.json.');
  }
}
main().catch((error: any) => { console.error('[EXTERNAL-DEPENDENCY-RAILWAY-FAILED]', error?.message || 'Unknown error'); process.exit(1); });
