import { runEnterpriseVerification } from '../src/tests/enterpriseVerification';

async function main() {
  console.log('===========================================================');
  console.log(' PROJECT AGATE 30-STAGE ENTERPRISE INVARIANT VERIFICATION');
  console.log('===========================================================');

  const res = await runEnterpriseVerification();
  for (const t of res.results) {
    const mark = t.passed ? '✓' : '✗';
    console.log(`[${String(t.test_number).padStart(2, '0')}] ${mark} ${t.name.padEnd(65)} (${t.duration_ms}ms)`);
  }

  console.log('\n===========================================================');
  console.log(`TOTAL TESTS: ${res.totalTests}`);
  console.log(`PASSED:      ${res.passedTests}`);
  console.log(`STATUS:      ${res.allPassed ? 'ALL INVARIANTS SATISFIED' : 'FAILURES DETECTED'}`);
  console.log('===========================================================');

  if (!res.allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] Enterprise verification error:', err);
  process.exit(1);
});
