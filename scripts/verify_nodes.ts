import { configureTestAuthEnvironment } from './testAuthEnvironment';
import { runDaisy54NodeCoverage } from '../src/tests/daisy54NodeCoverage';

async function main() {
  configureTestAuthEnvironment();
  console.log('===========================================================');
  console.log(' DAISY 54-NODE ARCHITECTURE CUJ EXECUTION COVERAGE');
  console.log('===========================================================');

  const rep = await runDaisy54NodeCoverage();
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
  console.log(`FIAT PAYMENT POLICY GUARD:   ${rep.policy_interlocks}`);
  console.log(`EXECUTION COVERAGE:         ${rep.execution_complete ? '54/54' : 'INCOMPLETE'}`);
  console.log(`FUNCTIONALLY PASSED:        ${rep.verdict_counts.FUNCTIONALLY_PASSED}`);
  console.log(`SAFETY PASSED:              ${rep.verdict_counts.SAFETY_PASSED}`);
  console.log(`POLICY GUARD PASSED:        ${rep.verdict_counts.PROHIBITED_BY_POLICY}`);
  console.log(`PROVIDER REQUIRED:          ${rep.verdict_counts.PROVIDER_REQUIRED}`);
  console.log(`NOT VERIFIED:               ${rep.verdict_counts.NOT_VERIFIED}`);
  console.log(`ALL 54 VERIFIED:            ${rep.all_passed ? 'YES' : 'NO'}`);
  console.log('===========================================================');

  if (!rep.execution_complete) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] Node coverage error:', err);
  process.exit(1);
});
