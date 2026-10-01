import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';

async function main() {
  AuthoritativeVerificationPipeline.setNodePlatform({
    execSync: cp.execSync,
    fs,
    path
  });
  setDiskDbChecker((p: string) => fs.existsSync(p));

  console.log('===========================================================');
  console.log(' PROJECT AGATE SOVEREIGN CORE / SOLVEX PLATFORM');
  console.log(' AUTHORITATIVE 14-GATE VERIFICATION PIPELINE');
  console.log('===========================================================');

  const pipeline = AuthoritativeVerificationPipeline.getInstance();
  const report = await pipeline.runFullPipeline();

  console.log('\n--- GATE RESULTS ---');
  for (const g of report.gates) {
    console.log(`[${g.gate_id}] ${g.name.padEnd(48)}: [${g.status}] (${g.claim_scope}) - ${g.duration_ms}ms`);
  }

  console.log('\n===========================================================');
  console.log(`SUMMARY: ${report.gates_passed} / ${report.gates_total} Gates Passed`);
  console.log(`CLAIM SCOPE: ${report.claim_scope_verdict}`);
  console.log(`PRODUCTION VERDICT: ${report.production_gate_verdict}`);
  if (report.production_blockers.length > 0) {
    console.log('\nPRODUCTION BLOCKERS (Expected in Local/Sandbox without Live External Secrets):');
    report.production_blockers.forEach(b => console.log(` - ${b}`));
  }
  console.log(`\nArtifacts written to: ${report.artifacts_directory}`);
  console.log('===========================================================');
}

main().catch(err => {
  console.error('[FATAL] Verification pipeline failure:', err);
  process.exit(1);
});
