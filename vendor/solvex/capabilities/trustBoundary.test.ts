import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { freshBoundSource, freshRejectSource } from './independentLifecycle';
import { verifyLifecycleBundle, type TrustVerdict } from './lifecycleVerifier';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const oldEvidence = JSON.parse(readFileSync('/workspace/artifacts/independent-lifecycle.json', 'utf8'));
const rejected = verifyLifecycleBundle(oldEvidence);
check('stored hashes without signatures are rejected', rejected.ok === false && rejected.findings.some((item) => item.includes('raw lifecycle bundle')), rejected.findings.join(' '));

const emitted = spawnSync('npx', ['tsx', 'vendor/solvex/capabilities/emitLifecycleBundle.ts'], { cwd: '/workspace', encoding: 'utf8' });
check('raw bundle emitted in a separate process', emitted.status === 0, emitted.stderr || String(emitted.status));
const bundleText = readFileSync('/workspace/artifacts/lifecycle-raw-bundle.json', 'utf8');
check('raw bundle contains no self-reported success flag', !bundleText.includes('"pass"') && !bundleText.includes('"deployed"') && !bundleText.includes('PRIVATE KEY'), 'raw');

const verified = spawnSync('npx', ['tsx', 'vendor/solvex/capabilities/lifecycleVerifier.ts', '/workspace/artifacts/lifecycle-raw-bundle.json'], { cwd: '/workspace', encoding: 'utf8' });
const verdict = JSON.parse(readFileSync('/workspace/artifacts/lifecycle-trust-boundary.json', 'utf8')) as TrustVerdict;
const bundle = JSON.parse(bundleText) as { chains: Array<{ name: string; source: string }> };
const hashesMatch = bundle.chains[0].source === freshBoundSource() && bundle.chains[1].source === freshRejectSource() && verdict.transitions.filter((item) => item.step === 'RECOVER').every((item) => item.source_sha256 === computeSha256(item.chain === 'bound-distance' ? freshBoundSource() : freshRejectSource()));
check('separate verifier recomputed every binding', verified.status === 0 && verdict.ok === true && hashesMatch && verdict.transitions.every((item) => item.pass && item.registry_id.startsWith('cap_') && item.operator_fingerprint.length === 64 && item.authorization.length > 0), verdict.findings.join(' ') || verified.stderr);
check(
  'isolated development is not a production operating system',
  verdict.isolated_capability_development === true && verdict.production_ready === false && verdict.autonomous_operating_system === false && verdict.production_switch === false && verdict.production_blockers_resolved === false && verdict.inherited_state === false && verdict.used_self_reported_success === false,
  'closed',
);

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, transitions: verdict.transitions, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);