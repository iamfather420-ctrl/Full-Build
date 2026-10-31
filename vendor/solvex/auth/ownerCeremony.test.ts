import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { generateGapClassifierSource } from '../capabilities/RecursiveLifecycle';
import { CapabilityRegistry } from '../capabilities/CapabilityRegistry';
import { installHumanRootPublicKey, loadInstalledHumanRoot } from './installHumanRoot';
import { reviewProductionIntegration } from '../governance/productionIntegrationReview';
import { productionIntegrationPermitted } from '../governance/HumanApprovalGate';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const source = generateGapClassifierSource();
const contentSha = computeSha256(source);
const capabilityId = `cap_${computeSha256('gap-classifier').slice(0, 12)}`;
const statement = 'I approve gap-classifier version 1 at this exact source hash and no other candidate.';
const child = spawnSync(process.execPath, [
  '/workspace/scripts/human-owner-sign.mjs',
  '--capability-id', capabilityId,
  '--version', '1',
  '--sha256', contentSha,
  '--statement', statement,
], { encoding: 'utf8', cwd: '/tmp' });

check('external signer exited cleanly', child.status === 0, child.stderr || String(child.status));
const artifact = child.status === 0 ? JSON.parse(child.stdout) : null;
check('signer output contains no private key', !!artifact && !child.stdout.includes('PRIVATE KEY') && !child.stderr.includes('PRIVATE KEY'), 'scan');
check('private key path is outside the repository and was deleted', !!artifact && artifact.private_key_outside_repository === true && artifact.private_key_deleted === true && !existsSync(artifact.private_key_path), artifact?.private_key_path ?? 'missing');

let installRejected = false;
try {
  installHumanRootPublicKey(artifact.publicKeyPem.replace('PUBLIC KEY', 'PRIVATE KEY'), '/tmp/rejected-root.pem');
} catch {
  installRejected = true;
}
check('installer rejects a private key', installRejected, 'rejected');

const installedPath = '/workspace/vendor/solvex/auth/installed-human-root.pub.pem';
const installed = installHumanRootPublicKey(artifact.publicKeyPem, installedPath);
const loaded = loadInstalledHumanRoot(installedPath);
check('installed file is the public key only', !readFileSync(installedPath, 'utf8').includes('PRIVATE KEY') && loaded.fingerprint === installed.fingerprint, installed.fingerprint);

const recorded = loaded.gate.submitSignedApproval(artifact.session, artifact.approval, Date.now());
const subject = { kind: 'capability' as const, id: capabilityId, version: 1, contentSha256: contentSha };
const verdict = loaded.gate.independentlyVerify(subject, Date.now());
check('exact candidate signature verifies', recorded.status === 'RECORDED' && verdict.ok === true && recorded.record?.content_sha256 === contentSha && recorded.record.version === 1, verdict.reason);
check('credential is inside its expiry window', !!recorded.record && Date.now() < artifact.approval.claims.expires_at && artifact.approval.claims.expires_at - artifact.approval.claims.issued_at <= 15 * 60 * 1000, String(artifact.approval.claims.expires_at));

const mismatch = loaded.gate.independentlyVerify({ ...subject, contentSha256: computeSha256('other') }, Date.now());
check('a different candidate hash is rejected', mismatch.ok === false, mismatch.reason);
const replay = loaded.gate.submitSignedApproval(artifact.session, artifact.approval, Date.now());
check('replaying the signed approval is rejected', replay.status === 'BLOCKED' && loaded.gate.count() === 1, replay.reason);

const registry = new CapabilityRegistry(loaded.gate);
const proposed = registry.propose('gap-classifier', 'Sandbox gap classifier.');
registry.markVerified(proposed.id, contentSha);
check('signed id matches the registry id', proposed.id === capabilityId, proposed.id);
const deploy = registry.deploy(proposed.id, null, Date.now());
const integration = registry.attemptIntegration(proposed.id, null, Date.now());
const replayedIntegration = registry.attemptIntegration(proposed.id, null, Date.now());
check('approval does not deploy', deploy.deployed === false && integration.deployed === false && integration.rolled_back === true && registry.get(proposed.id)?.status === 'APPROVAL_REQUIRED', `${deploy.reason} ${integration.reason}`);
check('consumed approval cannot be replayed', replayedIntegration.verification_ok === false, replayedIntegration.reason);

const revocationGate = loadInstalledHumanRoot(installedPath).gate;
const revocationRecord = revocationGate.submitSignedApproval(artifact.session, artifact.approval, Date.now());
if (revocationRecord.record) revocationGate.revokeApproval(revocationRecord.record.id);
const revoked = revocationGate.independentlyVerify(subject, Date.now());
check('revocation is enforced on a separate gate', revocationRecord.status === 'RECORDED' && revoked.ok === false, revoked.reason);
check('evidence approval itself was not revoked', loaded.gate.independentlyVerify(subject, Date.now()).reason.includes('replay'), 'evidence gate stays consumed, not revoked');

const review = reviewProductionIntegration(null);
check('production integration review stays closed', review.open === false && review.decision === 'REMAIN_CLOSED' && productionIntegrationPermitted() === false, review.reasons.join(' '));

const evidence = {
  schema: 'SOLVEX_HUMAN_OWNER_APPROVAL_EVIDENCE_V1',
  candidate: { name: 'gap-classifier', id: capabilityId, version: 1, sha256: contentSha },
  public_key_fingerprint: installed.fingerprint,
  approval_id: recorded.record?.id ?? null,
  statement_sha256: artifact.approval.claims.statement_sha256,
  verified_before_use: verdict.ok,
  expires_at: artifact.approval.claims.expires_at,
  revoked: false,
  replay_rejected: replay.status === 'BLOCKED',
  identity_mismatch_rejected: mismatch.ok === false,
  deployed: false,
  production_integration: review.decision,
  private_key_deleted: artifact.private_key_deleted,
  private_key_outside_repository: artifact.private_key_outside_repository,
};
writeFileSync('/workspace/artifacts/human-owner-approval.json', JSON.stringify(evidence, null, 2));
const saved = readFileSync('/workspace/artifacts/human-owner-approval.json', 'utf8');
check('evidence file records the approval and not a deploy', saved.includes(contentSha) && !saved.includes('PRIVATE KEY') && evidence.deployed === false, evidence.approval_id ?? 'missing');

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, evidence, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
