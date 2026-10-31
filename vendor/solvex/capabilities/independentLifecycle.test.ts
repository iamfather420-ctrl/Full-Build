import { readFileSync, writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { AuthService } from '../auth/AuthService';
import { HumanApprovalGate, productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { disposeBlockedGates } from '../governance/gateDisposition';
import { SandboxRehearsal } from '../governance/sandboxIntegrationRehearsal';
import { verifyClaims } from '../auth/VerifiedHumanSession';
import { CapabilityRegistry } from './CapabilityRegistry';
import { freshBoundSource, freshRejectSource, loadSandbox, signOutsideDaisy, sourceBoundary } from './independentLifecycle';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const productionRootPem = readFileSync('/workspace/vendor/solvex/auth/installed-human-root.pub.pem', 'utf8');
const productionRootFingerprint = computeSha256(productionRootPem);
// Unit-test fixture only: these retained dispositions are not fresh gate evidence.
const gates = {
  overall_verdict: 'BLOCKED',
  non_passed: [
    { id: 'GATE-11', status: 'EXTERNAL_PROVIDER_REQUIRED', name: 'External Provider Gateways' },
    { id: 'GATE-12', status: 'BLOCKED', name: 'End-to-End Lifecycle Execution' },
    { id: 'GATE-14', status: 'BLOCKED', name: 'Production Gate' },
    { id: 'GATE-46', status: 'BLOCKED', name: 'Master Closure' },
  ],
};
const disposition = disposeBlockedGates(gates.non_passed);

interface Chain {
  name: string;
  source: string;
  exportName: string;
  behavior: (fn: (input: unknown) => unknown) => boolean;
}

function runChain(spec: Chain) {
  const registry = new CapabilityRegistry(new HumanApprovalGate());
  const proposed = registry.propose(spec.name, 'Fresh sandbox candidate.');
  const expectedId = `cap_${computeSha256(spec.name.toLowerCase()).slice(0, 12)}`;
  const boundary = sourceBoundary(spec.source);
  const fn = loadSandbox(spec.source, spec.exportName);
  const behaviorOk = boundary === null && spec.behavior(fn);
  const hash = computeSha256(spec.source);
  const verified = registry.markVerified(proposed.id, hash);
  const signed = signOutsideDaisy({
    capabilityId: proposed.id,
    version: proposed.version,
    sha256: hash,
    statement: `I sign ${spec.name} version 1 at this exact hash for a sandbox rehearsal only.`,
    integrationStatement: `I separately authorize the sandbox rehearsal for ${spec.name} and not production.`,
  });
  const slot = new SandboxRehearsal(signed.publicKeyPem);
  const now = Date.now();
  const deployed = slot.deploy({ source: spec.source, candidate: signed.candidate, integration: signed.integration, now });
  slot.corrupt();
  const corrupted = slot.hash();
  const restored = slot.rollback();
  const recovered = slot.hash();
  const replay = slot.deploy({ source: spec.source, candidate: signed.candidate, integration: signed.integration, now });
  const production = registry.deploy(proposed.id, null, now);
  return {
    name: spec.name,
    id: proposed.id,
    expectedId,
    version: proposed.version,
    hash,
    behaviorOk,
    verified: verified.ok === true && verified.ok && verified.record.evidence_sha256 === hash,
    signed,
    deployed,
    corrupted,
    restored,
    recovered,
    replay,
    production,
    registryStatus: registry.get(proposed.id)?.status ?? null,
    executable: registry.get(proposed.id)?.executable ?? true,
    switchFalse: slot.switchRemainedFalse(),
    slot,
  };
}

const first = runChain({
  name: 'bound-distance',
  source: freshBoundSource(),
  exportName: 'boundDistance',
  behavior: (fn) => {
    const good = fn({ distance: 16, epsilon: 1 }) as { status: string; authority: string; value: number };
    const bad = fn(null) as { status: string; authority: string };
    return good.status === 'BOUNDED' && good.value < 1 && good.authority === 'none' && bad.status === 'INVALID' && bad.authority === 'none';
  },
});
const second = runChain({
  name: 'reject-unsigned',
  source: freshRejectSource(),
  exportName: 'rejectUnsigned',
  behavior: (fn) => {
    const unsigned = fn({}) as { status: string; authority: string; accepted: boolean };
    const signed = fn({ signature: 'present' }) as { status: string; authority: string; accepted: boolean };
    return unsigned.status === 'UNSIGNED' && signed.status === 'SIGNED_STILL_NOT_AUTHORITY' && signed.accepted === false && signed.authority === 'none';
  },
});

function independentlyVerified(chain: ReturnType<typeof runChain>, otherHash: string): boolean {
  const sourceHash = computeSha256(chain.name === 'bound-distance' ? freshBoundSource() : freshRejectSource());
  const candidateOk = verifyClaims(chain.signed.publicKeyPem, chain.signed.candidate.claims, chain.signed.candidate.signature);
  const integrationOk = verifyClaims(chain.signed.publicKeyPem, chain.signed.integration.claims, chain.signed.integration.signature);
  return sourceHash === chain.hash
    && chain.hash !== otherHash
    && computeSha256(chain.signed.publicKeyPem) !== productionRootFingerprint
    && candidateOk
    && integrationOk
    && chain.signed.candidate.claims.content_sha256 === sourceHash
    && chain.signed.integration.claims.content_sha256 === sourceHash
    && chain.signed.candidate.claims.typ === 'solvex-sandbox-candidate-v1'
    && chain.signed.integration.claims.typ === 'solvex-sandbox-integration-v1'
    && chain.signed.candidate.signature !== chain.signed.integration.signature;
}

check('first chain discovers, builds, and verifies in a fresh registry', first.id === first.expectedId && first.behaviorOk && first.verified && first.registryStatus === 'APPROVAL_REQUIRED' && first.executable === false, first.id);
check('first sandbox integration, failure, and recovery match the source hash', first.deployed.ok === true && first.deployed.hash === first.hash && first.corrupted !== first.hash && first.restored === true && first.recovered === first.hash && first.replay.ok === false, first.replay.reason);
check('first chain does not use the expired approval or become a production deploy', first.production.deployed === false && computeSha256(first.signed.publicKeyPem) !== productionRootFingerprint && !JSON.stringify(first.signed).includes('PRIVATE KEY'), first.production.deployed ? 'deployed' : first.production.reason);

check('second candidate repeats the chain on new state', second.id !== first.id && second.hash !== first.hash && second.behaviorOk && second.verified && second.recovered === second.hash && second.replay.ok === false, second.id);
check('second operator key and nonce are not the first rehearsal', computeSha256(second.signed.publicKeyPem) !== computeSha256(first.signed.publicKeyPem) && second.signed.integration.claims.nonce !== first.signed.integration.claims.nonce, 'fresh key');
const crossed = new SandboxRehearsal(second.signed.publicKeyPem).deploy({
  source: second.signed.candidate.claims.content_sha256 === second.hash ? freshBoundSource() : freshRejectSource(),
  candidate: second.signed.candidate,
  integration: second.signed.integration,
  now: Date.now(),
});
check('second approval rejects the first candidate source', crossed.ok === false && crossed.reason.includes('hash'), crossed.reason);
check('both signatures independently verify and exclude the installed production root', independentlyVerified(first, second.hash) && independentlyVerified(second, first.hash), 'recomputed');
check(
  'production stays closed and the separate blockers remain',
  productionIntegrationPermitted() === false && first.switchFalse && second.switchFalse && AuthService.getInstance().authorize(null, 'deploy').authorized === false && disposition.ok && gates.overall_verdict === 'BLOCKED' && productionRootFingerprint.length === 64,
  gates.overall_verdict,
);

const evidence = {
  schema: 'SOLVEX_INDEPENDENT_LIFECYCLE_V1',
  production_opened: false,
  production_blockers_resolved: false,
  expired_approval_used: false,
  chains: [first, second].map((chain) => ({
    name: chain.name,
    id: chain.id,
    version: chain.version,
    sha256: chain.hash,
    recovered_hash: chain.recovered,
    registry_status: chain.registryStatus,
    production_deployed: chain.production.deployed,
    operator_fingerprint: computeSha256(chain.signed.publicKeyPem),
  })),
};
writeFileSync('/workspace/artifacts/independent-lifecycle.json', JSON.stringify(evidence, null, 2));
const reread = JSON.parse(readFileSync('/workspace/artifacts/independent-lifecycle.json', 'utf8')) as typeof evidence;
check('saved evidence matches the recomputed hashes', reread.chains[0].sha256 === computeSha256(freshBoundSource()) && reread.chains[1].sha256 === computeSha256(freshRejectSource()) && reread.production_opened === false && reread.production_blockers_resolved === false, reread.chains.map((chain) => chain.id).join(','));

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, evidence, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
