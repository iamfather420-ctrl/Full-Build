import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_TESTED';
const endpoint = process.env.EXTERNAL_DEPENDENCY_RAILWAY_URL?.trim();
const token = process.env.EXTERNAL_DEPENDENCY_RAILWAY_TOKEN?.trim();

async function main() {
  const started = new Date().toISOString();
  let report: any;
  if (!endpoint || !token) {
    report = {
      schema_version: '1.0',
      execution_id: `external_railway_unavailable_${Date.now()}`,
      started_at: started,
      completed_at: new Date().toISOString(),
      summary: { total: 1, pass: 0, fail: 0, blocked: 1, not_tested: 0, verdict: 'BLOCKED' },
      tracks: [{ name: 'Railway external dependency verifier', status: 'BLOCKED' as Status, duration_ms: 0, summary: 'EXTERNAL_DEPENDENCY_RAILWAY_URL or EXTERNAL_DEPENDENCY_RAILWAY_TOKEN is missing.' }]
    };
  } else {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname.endsWith('.railway.internal'))) throw new Error('External dependency Railway endpoint must use HTTPS or Railway private networking.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch(new URL('/internal/external-dependencies/run', url), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source_commit_sha: process.env.GITHUB_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || null }),
        signal: controller.signal,
      });
      const body = await response.text();
      try { report = JSON.parse(body); } catch { throw new Error(`External verifier returned non-JSON HTTP ${response.status}.`); }
      if (!response.ok && !report?.summary) throw new Error(`External verifier returned HTTP ${response.status} without evidence.`);
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
