import { runEnterpriseVerification } from './enterpriseVerification';

/** Legacy script entry point: no provider operation is attempted without explicit credentials and authorization. */
export class SandboxVerificationPipeline {
  private static instance: SandboxVerificationPipeline | null = null;
  public static getInstance(): SandboxVerificationPipeline { if (!SandboxVerificationPipeline.instance) SandboxVerificationPipeline.instance = new SandboxVerificationPipeline(); return SandboxVerificationPipeline.instance; }
  public async runSandboxVerification() {
    const enterprise = await runEnterpriseVerification();
    return {
      execution_classification: 'CODE_EXECUTED' as const,
      sandbox_status: enterprise.allPassed ? 'PASS' : 'FAIL',
      tests_total: enterprise.totalTests,
      tests_passed: enterprise.passedTests,
      results: enterprise.results,
      payment_execution: 'NOT_PERFORMED',
      production_note: 'A sandbox regression suite is not PayPal authentication, a live PYUSD transaction, or production payment verification.'
    };
  }
}
