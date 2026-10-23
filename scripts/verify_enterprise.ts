// Unit-test-only browser storage adapter. This ephemeral Map lets the enterprise
// suite exercise state transitions; it is not a durability test or production backend.
// Production fail-closed behavior is independently checked by verify:release-safety.
function installEphemeralTestStorage(): void {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.has(key) ? values.get(key)! : null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; }
  };
  (globalThis as any).window = { localStorage };
}

import { runEnterpriseVerification } from '../src/tests/enterpriseVerification';

async function main() {
  installEphemeralTestStorage();
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
