import { SandboxVerificationPipeline } from '../src/tests/sandboxVerificationPipeline';

async function main() {
  console.log('===========================================================');
  console.log(' PROJECT AGATE / dAIsy / SOLVEX');
  console.log(' EXTERNAL PROVIDER & SANDBOX ADVANCEMENT VERIFICATION');
  console.log('===========================================================');

  const pipeline = SandboxVerificationPipeline.getInstance();
  const report = await pipeline.runSandboxVerification();

  console.log(`Execution ID       : ${report.execution_id}`);
  console.log(`Prior Execution ID : ${report.prior_execution_id} (Preserved in Baseline Freeze)`);
  console.log(`Commit SHA         : ${report.commit_sha}`);
  console.log(`Timestamp          : ${report.timestamp}`);
  console.log(`Environment        : ${report.environment}`);
  console.log(`Claim Scope        : ${report.claim_scope}`);
  console.log(`Production Verdict : ${report.production_verdict}`);

  console.log('\n--- PAYPAL SANDBOX AUDIT ---');
  console.log(`Status             : ${report.paypal.status}`);
  console.log(`Configured         : ${report.paypal.configured}`);
  console.log(`OAuth Attempted    : ${report.paypal.oauth_attempted}`);
  console.log(`Missing Creds Guard: ${report.paypal.failure_injection.missing_creds_fail_closed ? 'PASSED (fail-closed enforced)' : 'FAILED'}`);
  console.log(`Live 401 Rejection : ${report.paypal.failure_injection.invalid_creds_rejected_401 ? 'PASSED (live 401 confirmed)' : 'FAILED'}`);
  console.log(`Observed API Error : ${report.paypal.failure_injection.invalid_creds_observed_error}`);
  console.log(`Evidence Hash      : ${report.paypal.evidence_hash}`);

  console.log('\n--- SOVEREIGN SETTLEMENT ESCROW (DN-38) AUDIT ---');
  console.log(`Node ID            : ${report.sovereign_escrow.node_id}`);
  console.log(`Status             : ${report.sovereign_escrow.status}`);
  console.log(`Settlement Engine  : ${report.sovereign_escrow.settlement_engine}`);
  console.log(`Timelock Enforced  : ${report.sovereign_escrow.timelock_enforced ? 'PASSED' : 'FAILED'}`);
  console.log(`Multi-Sig Verified : ${report.sovereign_escrow.multisig_verified ? 'PASSED' : 'FAILED'}`);
  console.log(`Fail-Closed Guard  : ${report.sovereign_escrow.fail_closed ? 'PASSED' : 'FAILED'}`);
  console.log(`Evidence Hash      : ${report.sovereign_escrow.evidence_hash}`);

  console.log('\n--- NEON POSTGRESQL AUDIT ---');
  console.log(`Status             : ${report.neon.status}`);
  console.log(`Configured         : ${report.neon.configured}`);
  console.log(`Evidence Hash      : ${report.neon.evidence_hash}`);

  console.log('\n--- SANDBOX END-TO-END AUDIT ---');
  console.log(`Solution Pipeline  : ${report.end_to_end.solution_pipeline_passed ? 'PASSED' : 'FAILED'} (${report.end_to_end.stages_completed}/21 stages)`);
  console.log(`Order Lifecycle    : ${report.end_to_end.order_lifecycle_passed ? 'PASSED' : 'FAILED'} (Final status: ${report.end_to_end.final_order_status})`);
  console.log(`Merkle Audit Sealed: ${report.end_to_end.merkle_audit_recorded ? 'PASSED' : 'FAILED'}`);
  console.log(`Evidence Hash      : ${report.end_to_end.evidence_hash}`);

  console.log('\n--- PRODUCTION BARRIER AUDIT ---');
  console.log(`MODEL Scope        : ${report.production_boundary.model_scope}`);
  console.log(`LOCAL Scope        : ${report.production_boundary.local_scope}`);
  console.log(`SANDBOX Scope      : ${report.production_boundary.sandbox_scope}`);
  console.log(`PRODUCTION Scope   : ${report.production_boundary.production_scope}`);
  console.log('Production Blockers:');
  for (const blocker of report.production_boundary.production_blockers) {
    console.log(` - ${blocker}`);
  }

  console.log('\n--- ARTIFACTS GENERATED ---');
  for (const art of report.artifacts_generated) {
    console.log(` ✓ ${art}`);
  }
  console.log('===========================================================');
}

main().catch(err => {
  console.error('[FATAL] Sandbox verification failure:', err);
  process.exit(1);
});
