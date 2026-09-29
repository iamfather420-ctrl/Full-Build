import { SandboxVerificationPipeline } from '../src/tests/sandboxVerificationPipeline';

async function main() {
  const report = await SandboxVerificationPipeline.getInstance().runSandboxVerification();
  console.log('SOLVEX SANDBOX SECURITY VERIFICATION');
  console.log(`Execution classification: ${report.execution_classification}`);
  console.log(`Result: ${report.sandbox_status} (${report.tests_passed}/${report.tests_total})`);
  console.log(`PayPal execution: ${report.payment_execution}`);
  console.log(`Production boundary: ${report.production_note}`);
  for (const result of report.results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name}${result.error ? ` — ${result.error}` : ''}`);
  }
  if (!report.results.every(result => result.passed)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
