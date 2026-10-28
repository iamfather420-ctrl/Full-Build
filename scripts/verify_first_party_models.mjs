#!/usr/bin/env node
/**
 * Reports first-party model registry status. Never contacts third-party AI APIs.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.env.DAISY_MODEL_ROOT
  ? path.resolve(process.env.DAISY_MODEL_ROOT)
  : path.resolve(process.cwd(), 'models');

const registryPath = path.join(root, 'registry.json');
const report = {
  test_suite: 'FIRST_PARTY_MODEL_REGISTRY',
  timestamp: new Date().toISOString(),
  model_root: root,
  third_party_cloud_inference: 'PROHIBITED',
  registry_found: fs.existsSync(registryPath),
  models: [],
  blockers: [],
  network_requests: 0,
};

if (!report.registry_found) {
  report.blockers.push('models/registry.json missing');
} else {
  const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  for (const m of reg.models || []) {
    const abs = path.resolve(root, m.relative_path);
    const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
    const size = exists ? fs.statSync(abs).size : 0;
    let sha = null;
    let status = 'SLOT_EMPTY';
    if (exists && size >= (m.min_bytes || 1)) {
      status = 'FILE_PRESENT';
      if (m.expected_sha256) {
        sha = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
        status = sha.toLowerCase() === String(m.expected_sha256).toLowerCase() ? 'READY' : 'HASH_MISMATCH';
      }
    } else if (exists) status = 'TOO_SMALL';
    report.models.push({ id: m.id, role: m.role, path: abs, exists, size, sha256: sha, status });
    if (m.role === 'primary_chat' && status !== 'FILE_PRESENT' && status !== 'READY') {
      report.blockers.push(`primary_chat not ready: ${status}`);
    }
  }
}

report.ready = report.blockers.length === 0 && report.models.some((m) => m.role === 'primary_chat' && (m.status === 'FILE_PRESENT' || m.status === 'READY'));
console.log(JSON.stringify(report, null, 2));
// Always exit 0 for inventory; readiness is in report.ready (CI can assert separately).
process.exit(0);
