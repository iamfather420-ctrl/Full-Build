import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AuthoritativeVerificationPipeline } from '../src/tests/authoritativeVerificationPipeline';

type Json = Record<string, any>;

function readJson(file: string): Json {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main() {
  const started = new Date().toISOString();
  const root = process.cwd();
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(artifacts, { recursive: true });

  console.log('===========================================================');
  console.log(' SOLVEX UNIFIED 120-CASE REPRODUCIBLE VERIFICATION CORPUS');
  console.log(' 88 DFRL + 32 DH-P / FULL AUTHORITATIVE PIPELINE');
  console.log('===========================================================');

  // One authoritative execution of the existing full verification pipeline.
  // No registry count is accepted as evidence by itself.
  const report = await AuthoritativeVerificationPipeline.getInstance().runFullPipeline();

  const dfrl = readJson(path.join(artifacts, 'dfrl-88-verification.json'));
  const dh = readJson(path.join(artifacts, 'dh-bootstrap-32-verification.json'));

  const mandatoryGateResults = report.gates.filter((g: any) => g.gate_id !== 'GATE-11');
  const mandatoryFailed = mandatoryGateResults.filter((g: any) => g.status !== 'PASSED');

  const executed = Number(dfrl.executed || 0) + Number(dh.executed || 0);
  const replays = Number(dfrl.deterministic_replays_matched || 0) + Number(dh.deterministic_replays_matched || 0);
  const unknown = Number(dfrl.unknown_count || 0) + Number(dh.unknown_count || 0);
  const errors = Number(dfrl.error_count || 0) + Number(dh.error_count || 0);

  const corpusComplete =
    dfrl.executed === 88 &&
    dfrl.deterministic_replays_matched === 88 &&
    dfrl.unknown_count === 0 &&
    dfrl.error_count === 0 &&
    dfrl.overall_status === 'VERIFIED' &&
    dh.executed === 32 &&
    dh.deterministic_replays_matched === 32 &&
    dh.unknown_count === 0 &&
    dh.error_count === 0 &&
    dh.duplicate_links_invalid === 0 &&
    dh.mutation_test_passed === true &&
    dh.failure_injection_passed === true &&
    dh.artifact_tamper_test_passed === true &&
    executed === 120 &&
    replays === 120 &&
    unknown === 0 &&
    errors === 0 &&
    mandatoryFailed.length === 0;

  const roots = [dfrl.verification_root_sha256, dh.verification_root_sha256].filter(Boolean);
  const verification_root_sha256 = execSync(
    'node -e "const c=require(\'crypto\'); console.log(c.createHash(\'sha256\').update(process.argv.slice(1).join(\'|\')).digest(\'hex\'))" -- ' + roots.map((r: string) => JSON.stringify(r)).join(' '),
    { encoding: 'utf8' }
  ).trim();

  const source_commit_sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

  const gate: Json = {
    schema_version: '1.0.0',
    status: corpusComplete ? 'ACTIVE' : 'BLOCKED',
    reason: corpusComplete
      ? '120-case verification corpus completed with fresh machine execution, deterministic replay, fail-closed/mutation/tamper checks, and all mandatory authoritative gates passed.'
      : 'Verification corpus incomplete or at least one mandatory verification gate failed.',
    corpus: {
      total_required: 120,
      dfrl_required: 88,
      dh_required: 32,
      executed,
      deterministic_replays: replays,
      unknown,
      errors
    },
    mandatory_gates: {
      total: mandatoryGateResults.length,
      passed: mandatoryGateResults.filter((g: any) => g.status === 'PASSED').length,
      failed: mandatoryFailed.length
    },
    verification_root_sha256,
    source_commit_sha,
    generated_at: new Date().toISOString(),
    started_at: started,
    authoritative_execution_id: report.execution_id,
    claim_scope: report.claim_scope_verdict
  };

  fs.writeFileSync(
    path.join(artifacts, 'daisy-brain-activation-gate.json'),
    JSON.stringify(gate, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(artifacts, 'verification-corpus-120.json'),
    JSON.stringify({
      schema_version: '1.0.0',
      total: 120,
      dfrl: dfrl,
      dh_bootstrap: dh,
      authoritative_report: report,
      activation_gate: gate
    }, null, 2),
    'utf8'
  );

  console.log(JSON.stringify(gate, null, 2));

  if (!corpusComplete) {
    console.error('DAISY BRAIN ACTIVATION GATE: BLOCKED');
    process.exit(1);
  }

  console.log('DAISY BRAIN ACTIVATION GATE: ACTIVE');
}

main().catch((error) => {
  console.error('[FATAL] 120-case corpus verification failed:', error);
  process.exit(1);
});
