import { configureTestAuthEnvironment } from './testAuthEnvironment';
import { runDaisy54NodeCoverage } from '../src/tests/daisy54NodeCoverage';

async function main() {
  configureTestAuthEnvironment();
  console.log('===========================================================');
  console.log(' DAISY 54-NODE ARCHITECTURE CUJ EXECUTION COVERAGE');
  console.log('===========================================================');

  const rep = await runDaisy54NodeCoverage();
  const orderGuard = rep.results.find(node => node.node_id === 'DN-28');
  if (
    orderGuard?.status !== 'FAIL_CLOSED' ||
    orderGuard.evidence.unauthenticated_transition_rejected !== true ||
    orderGuard.evidence.order_state_unchanged !== true
  ) {
    throw new Error('DN-28 must prove unauthenticated order transitions are rejected without changing persisted state.');
  }
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
  console.log(`ALL SUBSYSTEMS SATISFIED:  ${rep.all_passed ? 'YES' : 'NO'}`);
  console.log('===========================================================');

  if (!rep.all_passed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL] Node coverage error:', err);
  process.exit(1);
});
