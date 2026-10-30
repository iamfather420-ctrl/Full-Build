import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';
import { AuthService } from '../src/auth/AuthService';
import { configureTestAuthEnvironment } from './testAuthEnvironment';

async function main() {
  // CI gets an ephemeral, test-only first-party identity. Production never does.
  if (process.env.SOLVEX_ENV === 'ci') {
    configureTestAuthEnvironment();
    const auth = AuthService.getInstance();
    const token = auth.createSignedToken(
      'daisy-auth-check',
      'TENANT_AUTH_TEST',
      'auth-check@solvex.invalid',
      'OWNER'
    );
    const verified = auth.verifyToken(token);
    if (!verified.valid || !verified.user) throw new Error('First-party auth rejected a valid signed test session.');
    const parts = token.split('.');
    const changedSignature = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    if (auth.verifyToken(parts[0] + '.' + parts[1] + '.' + changedSignature).valid) {
      throw new Error('First-party auth accepted a tampered session signature.');
    }
    if (auth.authorize({ ...verified.user }, 'ORDER_TRANSITION', 'TENANT_AUTH_TEST').authorized) {
      throw new Error('First-party auth accepted a forged, unverified user context.');
    }
    if (auth.authorize(verified.user, 'ORDER_TRANSITION', 'TENANT_OTHER').authorized) {
      throw new Error('First-party auth allowed cross-tenant authorization.');
    }
    const customerToken = auth.createSignedToken(
      'daisy-customer-check',
      'TENANT_AUTH_TEST',
      'customer-check@solvex.invalid',
      'CUSTOMER'
    );
    const customer = auth.verifyToken(customerToken);
    if (!customer.valid || !customer.user ||
        auth.authorize(customer.user, 'ORDER_TRANSITION', 'TENANT_AUTH_TEST').authorized) {
      throw new Error('First-party auth role boundary failed for CUSTOMER.');
    }
    console.log('[AUTH-BOUNDARY] valid-session, tamper, forged-context, cross-tenant, and role checks passed.');
  }
  AuthoritativeVerificationPipeline.setNodePlatform({
    execSync: cp.execSync,
    fs,
    path
  });
  setDiskDbChecker((p: string) => fs.existsSync(p));

  console.log('===========================================================');
  console.log(' SOLVEX + DAISY HAMINJA AI/UI/OS • SOLVEX B2B SOLUTIONS');
  console.log(' AUTHORITATIVE 15-GATE VERIFICATION PIPELINE');
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
