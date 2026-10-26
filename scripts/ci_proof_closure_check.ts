import fs from 'node:fs';
import path from 'node:path';

function fail(message: string): never {
  console.error('[CI-FAIL] ' + message);
  process.exit(1);
}

function readJson(name: string): any {
  const file = path.resolve('artifacts', name);
  if (!fs.existsSync(file)) fail('Required verification artifact missing: ' + name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fail('Verification artifact is not valid JSON: ' + name);
  }
}

const formal = readJson('formal-aggregation.json');
const summary = readJson('z3-120-formal-verification-summary.json');
const activationPath = path.resolve('artifacts', 'daisy-brain-activation-gate.json');
const gatesPath = path.resolve('artifacts', 'system-46-gates.json');
const activation = fs.existsSync(activationPath) ? readJson('daisy-brain-activation-gate.json') : null;
const gates = fs.existsSync(gatesPath) ? readJson('system-46-gates.json') : null;
const authoritative = readJson('execution-gates.json');
const productionBlockers: string[] = [];
if (!activation) productionBlockers.push('Missing generated Daisy activation evidence: artifacts/daisy-brain-activation-gate.json');
if (!gates) productionBlockers.push('Missing 46-gate inventory evidence: artifacts/system-46-gates.json');

if (formal.total?.required !== 120) fail('Formal aggregate must require exactly 120 cases.');
if (formal.total?.actual_z3_executions !== 120) fail('Formal aggregate must record 120 actual Z3 executions.');
if (formal.total?.replays !== 120 || formal.total?.replay_matches !== 120) {
  fail('Formal aggregate must record 120 cleanroom replays and 120 replay matches.');
}
if (formal.total?.distribution?.unknown !== 0 || formal.total?.distribution?.error !== 0) {
  fail('Formal aggregate contains UNKNOWN or ERROR results.');
}
if (formal.total?.closure_verdict !== 'PROVEN_120_FORMAL_CLOSURE') {
  fail('Formal aggregate did not prove the 120-case corpus closure.');
}
if (formal.dfrl?.required !== 88 || formal.dfrl?.actual_z3_executions !== 88 ||
    formal.dfrl?.replay_matches !== 88 || formal.dfrl?.status !== 'VERIFIED') {
  fail('DFRL evidence does not satisfy the 88-case execution/replay contract.');
}
if (formal.dh?.required !== 32 || formal.dh?.actual_z3_executions !== 32 ||
    formal.dh?.replay_matches !== 32 || formal.dh?.status !== 'VERIFIED') {
  fail('DH evidence does not satisfy the 32-case execution/replay contract.');
}
if (summary.total_z3_executions !== 120 || summary.expected_result_matches !== 120 ||
    summary.cleanroom_replays !== 120 || summary.replay_matches !== 120 ||
    summary.distribution?.unknown !== 0 || summary.distribution?.error !== 0) {
  fail('Independent 120-case summary disagrees with the formal aggregate.');
}
if (activation && (activation.corpus?.total_required !== 120 || activation.corpus?.executed !== 120 ||
    activation.corpus?.deterministic_replays !== 120 || activation.corpus?.unknown !== 0 ||
    activation.corpus?.errors !== 0)) {
  fail('Daisy activation artifact has incomplete or unsafe corpus accounting.');
}
if (activation && gates && (activation.mandatory_gates?.total !== 46 || activation.mandatory_gates?.observed !== 46 ||
    gates.total_gates !== 46 || !Array.isArray(gates.gates) || gates.gates.length !== 46)) {
  fail('The 46-gate inventory is incomplete or inconsistent.');
}
const gate09 = authoritative.gates?.find((g: any) => g.gate_id === 'GATE-09');
if (gate09?.status !== 'PASSED' || (gate09.details?.unsatisfied_node_ids?.length ?? -1) !== 0) {
  fail('Fresh authoritative gate artifact must show all 54 nodes executed with no unsatisfied nodes.');
}
const gate12 = authoritative.gates?.find((g: any) => g.gate_id === 'GATE-12');
if (gate12?.status !== 'BLOCKED' ||
    gate12.details?.order_lifecycle?.final_status !== 'OFFER' ||
    gate12.details?.order_lifecycle?.transitions_executed?.length !== 0 ||
    gate12.details?.order_lifecycle?.authorization_blocked !== true ||
    gate12.details?.order_lifecycle?.payment_processing !== 'DISABLED') {
  fail('Lifecycle evidence must report blocked authorization and the unchanged OFFER state; it must not claim escrow funding or deployment.');
}
if (gates) {
  const masterGate = gates.gates.find((g: any) => g.gate_id === 'GATE-46');
  if (!masterGate) fail('Master GATE-46 is missing.');
  const masterDetails = masterGate.details ?? {};
  if (masterDetails.preceding_failed === 0 && masterDetails.preceding_non_passed > 0 && masterGate.status !== 'BLOCKED') {
    fail('Master GATE-46 must report BLOCKED, not FAIL, when prior gates are blocked or require external providers.');
  }
  if (masterDetails.preceding_failed > 0 && masterGate.status !== 'FAIL') {
    fail('Master GATE-46 must report FAIL when a preceding gate has an actual failure.');
  }
}
if (activation && !['ACTIVE', 'BLOCKED'].includes(activation.status)) {
  fail('Daisy activation status is missing or unrecognized.');
}
if (activation?.status === 'ACTIVE' &&
    (activation.mandatory_gates.non_passed !== 0 || activation.adversarial_verification?.passed !== true)) {
  fail('Activation claims ACTIVE without all gates and adversarial checks passing.');
}

console.log('PASS: 120-case formal evidence and replay counts are internally consistent.');
if (activation) console.log('Daisy activation status: ' + activation.status);
if (productionBlockers.length) {
  console.warn('PRODUCTION EVIDENCE BLOCKERS (not fabricated or inferred):');
  for (const blocker of productionBlockers) console.warn(' - ' + blocker);
}
if (!activation || activation?.status === 'BLOCKED' || !gates) {
  console.log('Production activation remains BLOCKED; missing gate artifacts are not treated as passing evidence.');
}
