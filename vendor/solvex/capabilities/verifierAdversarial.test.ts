import { readFileSync, writeFileSync } from 'node:fs';
import { createHumanRoot } from '../auth/VerifiedHumanSession';
import { productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { loadSealedEvidence, sealEvidence } from '../governance/sealedEvidence';
import { acceptRecursiveLifecycle, acceptSealedLifecycle, INDEPENDENT_VERIFIER_SOURCE, VERIFIER_SOURCE } from './lifecycleAcceptance';
import { VERIFIER_VERSION } from './lifecycleVerifier';
import { INDEPENDENT_VERIFIER_VERSION } from './lifecycleVerifierIndependent';
import { CapabilityRegistry } from './CapabilityRegistry';
import { HumanApprovalGate } from '../governance/HumanApprovalGate';
import { ProcedureStore } from '../knowledge/ProcedureStore';
import { demonstrateRecursiveLifecycle } from './RecursiveLifecycle';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const version = 'lifecycle-raw-1';
const original = loadSealedEvidence(version).bytes;
const seal = loadSealedEvidence(version).seal;
check('raw bundle is sealed and a repeat seal is the same hash', seal.sha256 === sealEvidence(version, original).sha256 && seal.immutable === true, seal.sha256);
let rewriteBlocked = false;
try {
  sealEvidence(version, Buffer.from(`${original.toString('utf8')}\n`));
} catch {
  rewriteBlocked = true;
}
check('a different byte string cannot replace the sealed version', rewriteBlocked, 'immutable');
const loaded = loadSealedEvidence(version);
check('reloaded seal matches the original bytes', loaded.seal.sha256 === seal.sha256 && loaded.bytes.equals(original), loaded.seal.sha256);
sealEvidence(VERIFIER_VERSION, readFileSync(VERIFIER_SOURCE));
sealEvidence(INDEPENDENT_VERIFIER_VERSION, readFileSync(INDEPENDENT_VERIFIER_SOURCE));

const bundle = JSON.parse(readFileSync('/workspace/artifacts/lifecycle-raw-bundle.json', 'utf8')) as { schema: string; chains: Array<Record<string, unknown>> };
sealEvidence('lifecycle-raw-2', readFileSync('/workspace/artifacts/lifecycle-raw-bundle.json'));
const accepted = acceptSealedLifecycle('lifecycle-raw-2');
check('sealed bundle passes the mandatory verifier', accepted.accepted === true && accepted.verdict?.production_ready === false, accepted.reason);

function reject(name: string, mutated: unknown, needle: string) {
  const result = acceptRecursiveLifecycle(mutated);
  check(name, result.accepted === false && result.reason.includes(needle), result.reason);
}

const missing = structuredClone(bundle);
(missing.chains[0] as { source: string }).source = '';
reject('missing source bytes are rejected', missing, 'not evidence');

const substituted = structuredClone(bundle);
(substituted.chains[0] as { publicKeyPem: string }).publicKeyPem = createHumanRoot().publicKeyPem;
reject('a substituted public key is rejected', substituted, 'not bound');

const altered = structuredClone(bundle);
const signature = (altered.chains[0] as { candidate: { signature: string } }).candidate.signature;
(altered.chains[0] as { candidate: { signature: string } }).candidate.signature = `${signature.slice(0, -4)}aaaa`;
reject('an altered signature is rejected', altered, 'not bound');

const wrongRegistry = structuredClone(bundle);
(wrongRegistry.chains[0] as { name: string }).name = 'not-the-signed-capability';
reject('an incorrect registry identity is rejected', wrongRegistry, 'registry id');

const reordered = structuredClone(bundle) as { transitions?: Array<{ step: string }> };
reordered.transitions = [
  { step: 'RECOVER' },
  { step: 'FAILURE' },
  { step: 'DISCOVER' },
];
reject('reordered transitions are rejected', reordered, 'reordered');

const duplicate = structuredClone(bundle);
duplicate.chains = [bundle.chains[0], bundle.chains[0]];
reject('a duplicate approval is rejected', duplicate, 'inherited');

const tampered = structuredClone(bundle);
(tampered.chains[0] as { recovered_artifact: string }).recovered_artifact = `${(bundle.chains[0] as { source: string }).source}\nCORRUPT`;
reject('a tampered recovery artifact is rejected', tampered, 'recovery artifact');

const sealedPath = `/workspace/artifacts/evidence/lifecycle/${version}/${seal.sha256}.json`;
writeFileSync(sealedPath, Buffer.from('tampered'));
let tamperDetected = false;
try {
  loadSealedEvidence(version);
} catch {
  tamperDetected = true;
}
writeFileSync(sealedPath, original);
check('modified sealed bytes are detected and then restored', tamperDetected && loadSealedEvidence(version).bytes.equals(original), 'restored');

const unsealed = await demonstrateRecursiveLifecycle(new CapabilityRegistry(new HumanApprovalGate()), new ProcedureStore(), new HumanApprovalGate());
check('a recursive lifecycle without a raw bundle is not accepted', unsealed.verifier_accepted === false && unsealed.lifecycle_complete === false, unsealed.blocker);
check('production stays closed', productionIntegrationPermitted() === false && accepted.verdict?.autonomous_operating_system === false, 'closed');

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, seal, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
