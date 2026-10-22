import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PreflightService } from '../src/services/preflight';

async function main() {
  console.log('============================================================');
  console.log('PHASE 1 & 2: SOVEREIGN DEPENDENCY & CONFIGURATION PREFLIGHT');
  console.log('============================================================');

  let commitSha = 'UNKNOWN';
  try {
    commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {}

  const service = PreflightService.getInstance();
  const report = await service.runFullPreflight(commitSha);

  console.log(`Environment Mode: ${report.environment_mode.toUpperCase()}`);
  console.log(`Node Version:     ${report.node_version} (${report.platform} ${report.arch})`);
  console.log(`Git Commit SHA:   ${report.commit_sha}`);
  console.log('------------------------------------------------------------');
  console.log('DEPENDENCY CHECK RESULTS:');
  for (const dep of report.dependencies) {
    const symbol = dep.status === 'PRESENT' ? '✓' : dep.status === 'NOT_REQUIRED_FOR_SELECTED_ENVIRONMENT' ? '○' : '✗';
    console.log(`  [${symbol}] ${dep.name.padEnd(26)} : ${dep.status} ${dep.version ? `(${dep.version})` : ''}`);
  }

  console.log('------------------------------------------------------------');
  console.log('CONFIGURATION DISCOVERY & CHECK (NO SECRETS EXPOSED):');
  for (const cfg of report.configurations) {
    const symbol = cfg.status === 'PRESENT' ? '✓' : cfg.status === 'NOT_REQUIRED_FOR_SELECTED_ENVIRONMENT' ? '○' : '✗';
    console.log(`  [${symbol}] ${cfg.key.padEnd(26)} : ${cfg.status}`);
  }

  console.log('------------------------------------------------------------');
  if (report.blockers.length > 0) {
    console.warn(`PREFLIGHT WARNINGS / BLOCKERS (${report.blockers.length}):`);
    for (const b of report.blockers) {
      console.warn(`  ! ${b}`);
    }
  } else {
    console.log('✓ Preflight evaluation PASSED for current environment mode.');
  }

  // Generate preflight-report.json and preflight-report.md
  const jsonPath = path.resolve('preflight-report.json');
  const mdPath = path.resolve('preflight-report.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const mdContent = `# PREFLIGHT AUDIT & DEPENDENCY INSPECTION REPORT
**Timestamp:** ${new Date(report.timestamp).toISOString()}  
**Commit SHA:** \`${report.commit_sha}\`  
**Environment Mode:** \`${report.environment_mode.toUpperCase()}\`  
**Node.js Runtime:** \`${report.node_version}\` (${report.platform} ${report.arch})  
**Preflight Passed:** \`${report.passed ? 'YES' : 'NO'}\`  

## 1. Verified Dependency Matrix
| Dependency | Category | Status | Version | Notes |
|------------|----------|--------|---------|-------|
${report.dependencies.map(d => `| \`${d.name}\` | ${d.category} | **${d.status}** | ${d.version || 'N/A'} | ${d.notes || ''} |`).join('\n')}

## 2. Configuration & Secret Inspection (Zero Secret Disclosure)
| Configuration Key | Status | Format Valid | Environment Scope | Notes |
|-------------------|--------|--------------|-------------------|-------|
${report.configurations.map(c => `| \`${c.key}\` | **${c.status}** | ${c.format_valid ? 'VALID' : 'N/A'} | ${c.environment_scope} | ${c.notes} |`).join('\n')}

## 3. Environment Stop Conditions & Blockers
${report.blockers.length === 0 ? '- None. All required dependencies and configuration checks satisfied.' : report.blockers.map(b => `- **BLOCKER:** ${b}`).join('\n')}
`;

  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`Saved reports to: \n  ${jsonPath}\n  ${mdPath}`);
  console.log('============================================================\n');

  if (!report.passed && report.environment_mode === 'production') {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Preflight crashed:', err);
  process.exit(1);
});
