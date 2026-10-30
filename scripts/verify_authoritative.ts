import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';
import { setDiskDbChecker } from '../src/tests/persistenceVerification';
import { AuthService } from '../src/auth/AuthService';
import { configureTestAuthEnvironment } from './testAuthEnvironment';

async function main() {
  // CI gets an in-memory verification fixture only; local session issuance stays blocked.
  if (process.env.SOLVEX_ENV === 'ci') {
    configureTestAuthEnvironment();
    const auth = AuthService.getInstance();
    let tokenIssuanceBlocked = false;
    try {
      auth.createSignedToken('daisy-auth-check', 'TENANT_AUTH_TEST', 'auth-check@solvex.invalid', 'OWNER');
    } catch {
      tokenIssuanceBlocked = true;
    }
    if (!tokenIssuanceBlocked || auth.verifyToken('untrusted-token').valid) {
      throw new Error('Fail-closed local token issuance or verification boundary regressed.');
    }
    const verified = auth.createVerificationFixture({
      user_id: 'daisy-auth-check',
      tenant_id: 'TENANT_AUTH_TEST',
      email: 'auth-check@solvex.invalid',
      role: 'OWNER'
    });
    if (!auth.authorize(verified, 'ORDER_TRANSITION', 'TENANT_AUTH_TEST').authorized) {
      throw new Error('Isolated CI identity fixture did not authorize its own tenant.');
    }
    if (auth.authorize({ ...verified }, 'ORDER_TRANSITION', 'TENANT_AUTH_TEST').authorized) {
      throw new Error('Auth accepted a forged, unregistered user context.');
    }
    if (auth.authorize(verified, 'ORDER_TRANSITION', 'TENANT_OTHER').authorized) {
      throw new Error('Auth allowed cross-tenant authorization.');
    }
    const customer = auth.createVerificationFixture({
      user_id: 'daisy-customer-check',
      tenant_id: 'TENANT_AUTH_TEST',
      email: 'customer-check@solvex.invalid',
      role: 'CUSTOMER'
    });
    if (auth.authorize(customer, 'ORDER_TRANSITION', 'TENANT_AUTH_TEST').authorized) {
      throw new Error('Auth role boundary failed for CUSTOMER.');
    }
    const previousNodeEnv = process.env.NODE_ENV;
    let productionFixtureBlocked = false;
    try {
      process.env.NODE_ENV = 'production';
      auth.createVerificationFixture({
        user_id: 'production-should-block',
        tenant_id: 'TENANT_AUTH_TEST',
        email: 'blocked@solvex.invalid',
        role: 'OWNER'
      });
    } catch {
      productionFixtureBlocked = true;
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
    if (!productionFixtureBlocked) throw new Error('CI identity fixture was available in production mode.');
    console.log('[AUTH-BOUNDARY] token issuance blocked; test fixture is in-memory, tenant-bound, role-checked, and production-disabled.');
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
