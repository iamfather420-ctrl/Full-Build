import fs from 'node:fs';
import { DH_BOOTSTRAP_PARADOXES } from '../src/paradoxes/GitHubDHBootstrapParadoxRegistry';
import { GITHUB_FULL_BUILD_INTEGRATION } from '../src/integrations/GitHubFullBuildIntegration';

const codes = new Set(DH_BOOTSTRAP_PARADOXES.map(item => item.code));
const expected = Array.from({ length: 32 }, (_, i) => `DH-P-${String(i + 1).padStart(3, '0')}`);
const missing = expected.filter(code => !codes.has(code));
const report = {
  timestamp: new Date().toISOString(),
  environment: 'LOCAL',
  source_revision: 'CLONED_GIT_COMMIT',
  repository: GITHUB_FULL_BUILD_INTEGRATION.repository,
  integration_mode: GITHUB_FULL_BUILD_INTEGRATION.integration_mode,
  upstream_commit: '597016a77795a96183d2bbba3c82ae833e3062f4',
  imported_registry_entries: DH_BOOTSTRAP_PARADOXES.length,
  expected_entries: 32,
  missing_codes: missing,
  passed: missing.length === 0 && DH_BOOTSTRAP_PARADOXES.length === 32,
  claim_scope: 'PROVENANCE_AND_SCHEMA_COMPATIBILITY_ONLY',
  external_verification: 'NOT_PERFORMED'
};
fs.writeFileSync('artifacts/GITHUB-FULL-BUILD-INTEGRATION-VERIFICATION.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
