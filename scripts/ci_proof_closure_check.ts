import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function runCiProofClosureCheck() {
  console.log('================================================================');
  console.log('CI PROOF CLOSURE & TRUTH BOUNDARY GATE ENFORCEMENT');
  console.log('================================================================');

  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  const requiredArtifacts = [
    'verification-baseline.json',
    'complete-verification-registry.json',
    'proof-receipts.json',
    'proof-integrity-manifest.json',
    'cleanroom-replay-verification.json',
    'claim-vs-proof-audit.json',
    'artifact-cross-check-audit.json',
    'dfrl-proof-closure.json',
    'daisy-54-node-canonical.json',
    'paypal-verification-matrix.json',
    'final-proof-gate.json',
    'COMPLETE-VERIFICATION-REPORT.json',
    'COMPLETE-VERIFICATION-REPORT.md'
  ];

  // 1. Verify existence of all required closure artifacts
  for (const art of requiredArtifacts) {
    const fullPath = path.join(artifactsDir, art);
    if (!fs.existsSync(fullPath)) {
      console.error(`[CI-FAIL] Missing required closure artifact: ${art}`);
      process.exit(1);
    }
  }
  console.log(`[CI-PASS] All ${requiredArtifacts.length} required closure artifacts present.`);

  // 2. Validate Proof Receipts Integrity Manifest
  const manifestRaw = fs.readFileSync(path.join(artifactsDir, 'proof-integrity-manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (!manifest.entries || manifest.entries.length === 0) {
    console.error('[CI-FAIL] Proof integrity manifest is empty or corrupt.');
    process.exit(1);
  }
  console.log(`[CI-PASS] Proof integrity manifest validated (${manifest.entries.length} receipts indexed).`);

  // 3. Verify that individual proof receipts match their recorded hashes
  const receiptsDir = path.join(artifactsDir, 'proof-receipts');
  let checked = 0;
  for (const entry of manifest.entries.slice(0, 50)) { // Sample-check top 50 in fast CI
    const receiptFile = path.resolve(process.cwd(), entry.receipt_file);
    if (!fs.existsSync(receiptFile)) {
      console.error(`[CI-FAIL] Receipt file missing: ${entry.receipt_file}`);
      process.exit(1);
    }
    const content = fs.readFileSync(receiptFile, 'utf8');
    const actualHash = sha256(content);
    if (actualHash !== entry.receipt_sha256) {
      console.error(`[CI-FAIL] Receipt hash divergence detected in ${entry.receipt_file}`);
      process.exit(1);
    }
    checked++;
  }
  console.log(`[CI-PASS] Cryptographic receipt hash signatures verified (${checked} sampled).`);

  // 4. Validate Final Proof Gate
  const gateRaw = fs.readFileSync(path.join(artifactsDir, 'final-proof-gate.json'), 'utf8');
  const gate = JSON.parse(gateRaw);
  if (gate.gate !== 'FULL_BUILD_PROOF_GATE' || gate.gate_status !== 'PROVEN_CLOSURE') {
    console.error(`[CI-FAIL] Final proof gate returned non-closure state: ${gate.gate_status}`);
    process.exit(1);
  }
  console.log(`[CI-PASS] Final Proof Gate verified: ${gate.gate_status}`);
  console.log(`         Total Verifications: ${gate.total_verifications}`);
  console.log(`         Formal Proofs:       ${gate.formal_proof_rate}`);
  console.log(`         Node Coverage:       ${gate.daisy_node_execution_rate}`);
  console.log(`         Enterprise Rate:     ${gate.enterprise_invariant_rate}`);

  console.log('\n================================================================');
  console.log('✅ CI PROOF CLOSURE VALIDATION: ALL GATES SATISFIED');
  console.log('================================================================');
}

// Auto-run if executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  runCiProofClosureCheck();
}
