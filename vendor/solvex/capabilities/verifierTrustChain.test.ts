import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHumanRoot } from '../auth/VerifiedHumanSession';
import { productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { loadSealedEvidence, sealEvidence } from '../governance/sealedEvidence';
import { acceptSealedLifecycle, INDEPENDENT_VERIFIER_SOURCE, VERIFIER_SOURCE, verdictsPermitAcceptance } from './lifecycleAcceptance';
import { VERIFIER_VERSION, verifyLifecycleBundle } from './lifecycleVerifier';
import { INDEPENDENT_VERIFIER_VERSION, verifyLifecycleIndependently } from './lifecycleVerifierIndependent';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const verifierBytes = readFileSync(VERIFIER_SOURCE);
const independentBytes = readFileSync(INDEPENDENT_VERIFIER_SOURCE);
const verifierSeal = sealEvidence(VERIFIER_VERSION, verifierBytes);
const independentSeal = sealEvidence(INDEPENDENT_VERIFIER_VERSION, independentBytes);
check('primary verifier source and version are sealed', verifierSeal.immutable === true && verifierBytes.includes(VERIFIER_VERSION) && loadSealedEvidence(VERIFIER_VERSION).bytes.equals(verifierBytes), verifierSeal.sha256);
check('independent verifier source and version are sealed', independentSeal.immutable === true && independentBytes.includes(INDEPENDENT_VERIFIER_VERSION), independentSeal.sha256);

const previous = loadSealedEvidence('lifecycle-raw-1');
const expiredVerdict = verifyLifecycleBundle(JSON.parse(previous.bytes.toString('utf8')));
check('previously sealed evidence is not silently treated as still valid', expiredVerdict.ok === false && expiredVerdict.findings.some((item) => item.includes('expired')) && loadSealedEvidence('lifecycle-raw-1').bytes.equals(previous.bytes), expiredVerdict.findings[0] ?? '');

const emitted = spawnSync('npx', ['tsx', 'vendor/solvex/capabilities/emitLifecycleBundle.ts'], { cwd: '/workspace', encoding: 'utf8' });
if (emitted.status !== 0) throw new Error(emitted.stderr || 'emit failed');
const evidenceBytes = readFileSync('/workspace/artifacts/lifecycle-raw-bundle.json');
const evidenceVersion = `lifecycle-raw-ci-${process.pid}`;
const evidenceSeal = sealEvidence(evidenceVersion, evidenceBytes);
const bundle = JSON.parse(evidenceBytes.toString('utf8'));
const primary = verifyLifecycleBundle(bundle);
const second = verifyLifecycleIndependently(bundle);
check('both verifier implementations accept the fresh sealed bundle', evidenceSeal.sha256.length === 64 && primary.ok === true && second.ok === true && verdictsPermitAcceptance(primary.ok, second.ok) === null, second.findings.join(' ') || evidenceSeal.sha256);
check('unparsed evidence is refused before parsing', verifyLifecycleBundle(evidenceBytes.toString('utf8')).findings.join(' ').includes('before parsing') && verifyLifecycleIndependently(evidenceBytes.toString('utf8')).ok === false, 'seal first');

const accepted = acceptSealedLifecycle(evidenceVersion);
if (!accepted.accepted) {
  console.log(JSON.stringify(accepted, null, 2));
  process.exit(1);
}
const acceptanceVersion = `acceptance-${evidenceVersion}`;
const acceptanceSeal = loadSealedEvidence(acceptanceVersion);
check(
  'acceptance cites the exact verifier version and source hash',
  accepted.evidence_parsed === true && accepted.verifier_version === VERIFIER_VERSION && accepted.verifier_source_sha256 === verifierSeal.sha256 && accepted.independent_verifier_version === INDEPENDENT_VERIFIER_VERSION && accepted.production_authority === false,
  accepted.reason,
);

const before = acceptanceSeal.bytes.toString('utf8');
const upgrade = acceptSealedLifecycle(evidenceVersion, { claimedVerifierVersion: 'lifecycle-verifier-3' });
const after = loadSealedEvidence(acceptanceVersion).bytes.toString('utf8');
check('a verifier upgrade cannot reinterpret the accepted evidence', upgrade.accepted === false && upgrade.evidence_parsed === false && upgrade.reason.includes('cannot reinterpret') && before === after, upgrade.reason);
check('verdict disagreement blocks acceptance', verdictsPermitAcceptance(true, false) === 'BLOCKED: verifier implementations disagree.', 'disagree');

function bothReject(name: string, mutated: unknown) {
  const left = verifyLifecycleBundle(mutated).ok;
  const right = verifyLifecycleIndependently(mutated).ok;
  check(name, left === false && right === false, `primary ${left} independent ${right}`);
}
const missing = structuredClone(bundle);
missing.chains[0].source = '';
bothReject('both reject missing source bytes', missing);
const substituted = structuredClone(bundle);
substituted.chains[0].publicKeyPem = createHumanRoot().publicKeyPem;
bothReject('both reject a substituted public key', substituted);
const altered = structuredClone(bundle);
altered.chains[0].candidate.signature = `${altered.chains[0].candidate.signature.slice(0, -4)}aaaa`;
bothReject('both reject an altered signature', altered);
const wrongRegistry = structuredClone(bundle);
wrongRegistry.chains[0].name = 'not-the-signed-capability';
bothReject('both reject an incorrect registry identity', wrongRegistry);
const reordered = structuredClone(bundle);
reordered.transitions = [{ step: 'RECOVER' }, { step: 'FAILURE' }];
bothReject('both reject reordered transitions', reordered);
const duplicate = structuredClone(bundle);
duplicate.chains = [bundle.chains[0], bundle.chains[0]];
bothReject('both reject a duplicate approval', duplicate);
const tamperedRecovery = structuredClone(bundle);
tamperedRecovery.chains[0].recovered_artifact = `${bundle.chains[0].source}\nCORRUPT`;
bothReject('both reject a tampered recovery artifact', tamperedRecovery);

const sealedPath = `/workspace/artifacts/evidence/lifecycle/${evidenceVersion}/${evidenceSeal.sha256}.json`;
const sealedBytes = Buffer.from(evidenceBytes);
writeFileSync(sealedPath, Buffer.from('tampered'));
let corruptedReason = '';
let corruptedParsed = true;
let corruptedAccepted = true;
try {
  const corrupted = acceptSealedLifecycle(evidenceVersion);
  corruptedReason = corrupted.reason;
  corruptedParsed = corrupted.evidence_parsed;
  corruptedAccepted = corrupted.accepted;
} finally {
  writeFileSync(sealedPath, sealedBytes);
}
check('tampered evidence fails the seal check before parsing and is restored', corruptedAccepted === false && corruptedParsed === false && corruptedReason.includes('modified after sealing') && loadSealedEvidence(evidenceVersion).bytes.equals(sealedBytes), corruptedReason);
check('sandbox acceptance does not grant production authority', productionIntegrationPermitted() === false && accepted.production_authority === false, 'closed');

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, verifier: verifierSeal, independent: independentSeal, evidence: evidenceSeal, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
