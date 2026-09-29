import { runDaisy54NodeCoverage } from '../src/tests/daisy54NodeCoverage';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  process.env.SOLVEX_AUTH_SECRET = process.env.SOLVEX_AUTH_SECRET || 'test-only-auth-secret-with-at-least-thirty-two-characters';
  console.log('===========================================================');
  console.log(' DAISY 54-NODE ARCHITECTURE CUJ EXECUTION COVERAGE');
  console.log('===========================================================');

  const rep = await runDaisy54NodeCoverage();
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, 'daisy-54-node-coverage-v2.json'), JSON.stringify({
    execution_classification: 'CODE_EXECUTED',
    scope_note: 'Coverage validates reachability and evidence-bearing outcomes. It does not prove provider execution or commercial readiness.',
    report: rep
  }, null, 2));
  for (const n of rep.results) {
    console.log(`[${n.node_id}] ${n.name.padEnd(52)}: [${n.status}] (${n.claim_scope})`);
  }

  console.log('\n===========================================================');
  console.log(`TOTAL NODES:               ${rep.total_nodes}`);
  console.log(`REGISTERED NODES:          ${rep.registered_count}`);
  console.log(`INSTANTIATED NODES:        ${rep.instantiated_count}`);
  console.log(`REACHABLE NODES:           ${rep.reachable_count}`);
  console.log(`EXECUTED NODES:            ${rep.executed_count}`);
  console.log(`OUTPUT ASSERTED NODES:     ${rep.output_asserted_count}`);
  console.log(`EVIDENCE GENERATED NODES:  ${rep.evidence_generated_count}`);
  console.log(`UNSATISFIED NODES:         ${rep.unsatisfied_node_ids.length === 0 ? 'NONE' : rep.unsatisfied_node_ids.join(', ')}`);
  console.log(`BASELINE INTERNAL (18):    ${rep.internal_previously_covered}`);
  console.log(`EXPANDED INTERNAL (33):    ${rep.internal_newly_covered}`);
  console.log(`EXTERNAL GATEWAYS (3):     ${rep.external_gateways}`);
  console.log(`STRIPE PROHIBITED GUARD:   ${rep.policy_interlocks}`);
  console.log(`ALL NODES REACHABLE WITH EXPECTED CONTROL OUTCOME: ${rep.all_passed ? 'YES' : 'NO'}`);
  console.log('NOTE: SUCCESS, FAIL_CLOSED, PROVIDER_REQUIRED, and PROHIBITED_BLOCKED are valid coverage outcomes; this is not a commercial-readiness certification.');
  console.log('===========================================================');

  if (!rep.all_passed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] Node coverage error:', err);
  process.exit(1);
});
