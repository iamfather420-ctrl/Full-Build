import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { generateGapClassifierSource } from '../capabilities/RecursiveLifecycle';
import { AuthService } from '../auth/AuthService';
import { HumanApprovalGate, productionIntegrationPermitted } from './HumanApprovalGate';
import { SandboxRehearsal } from './sandboxIntegrationRehearsal';
import { runProductionIntegrationProcedure } from './productionIntegrationProcedure';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const beforeSwitch = productionIntegrationPermitted();
const ceremonyFingerprint = computeSha256(readFileSync('/workspace/vendor/solvex/auth/installed-human-root.pub.pem', 'utf8'));
const source = generateGapClassifierSource();
const contentSha = computeSha256(source);
const capabilityId = `cap_${computeSha256('gap-classifier').slice(0, 12)}`;
const child = spawnSync(process.execPath, [
  '/workspace/scripts/operator-rehearsal-sign.mjs',
  '--capability-id', capabilityId,
  '--version', '1',
  '--sha256', contentSha,
  '--statement', 'I sign gap-classifier version 1 for a sandbox rehearsal only.',
  '--integration-statement', 'I separately authorize the sandbox integration rehearsal for that same candidate and not production.',
], { encoding: 'utf8', cwd: '/tmp' });
check('operator signer exited outside Daisy', child.status === 0 && !child.stdout.includes('PRIVATE KEY'), child.stderr || String(child.status));
const artifact = child.status === 0 ? JSON.parse(child.stdout) : null;
check('operator private key was deleted outside the repository', !!artifact && artifact.private_key_deleted === true && artifact.private_key_outside_repository === true && !existsSync(artifact.private_key_path), artifact?.private_key_path ?? 'missing');
check('candidate and integration signatures differ', !!artifact && artifact.candidate.signature !== artifact.integration.signature && artifact.candidate.claims.nonce !== artifact.integration.claims.nonce, 'separate');

const slot = new SandboxRehearsal(artifact.publicKeyPem);
const now = Date.now();
const deployed = slot.deploy({ source, candidate: artifact.candidate, integration: artifact.integration, now });
check('sandbox deploy stores the signed artifact', deployed.ok === true && deployed.hash === contentSha && slot.hash() === contentSha, deployed.reason);
check('independent hash matches the signed candidate', slot.hash() === artifact.candidate.claims.content_sha256 && slot.environment === 'sandbox' && slot.productionCredentials === false, slot.hash() ?? 'missing');

slot.corrupt();
check('forced corruption changes the artifact hash', slot.hash() !== contentSha, slot.hash() ?? 'missing');
const restored = slot.rollback();
check('rollback recovers the deployed artifact', restored === true && slot.hash() === contentSha, slot.hash() ?? 'missing');

const replay = slot.deploy({ source, candidate: artifact.candidate, integration: artifact.integration, now });
check('replaying the rehearsal does not change the recovered artifact', replay.ok === false && replay.reason.includes('replay') && slot.hash() === contentSha, replay.reason);

const expired = slot.deploy({ source, candidate: artifact.candidate, integration: artifact.integration, now: artifact.integration.claims.expires_at });
check('an expired rehearsal clock is rejected', expired.ok === false && expired.reason.includes('expired'), expired.reason);

const swapped = new SandboxRehearsal(artifact.publicKeyPem).deploy({
  source,
  candidate: artifact.integration,
  integration: artifact.candidate,
  now,
});
check('the two approvals cannot be swapped', swapped.ok === false, swapped.reason);

const gate = new HumanApprovalGate(artifact.publicKeyPem);
const rejectedByProductionGate = gate.submitSignedApproval(artifact.candidate, artifact.integration, now);
check('sandbox tokens are not production approvals', rejectedByProductionGate.status === 'BLOCKED' && gate.count() === 0, rejectedByProductionGate.reason);

const procedure = runProductionIntegrationProcedure({
  candidateEvidenceVerified: true,
  liveAuthorization: false,
  dispositions: [],
  operatorIntegrationSignature: artifact.integration.signature,
  signatureScope: 'sandbox',
});
const auth = AuthService.getInstance().authorize(null, 'deploy');
check(
  'production switch stayed false throughout',
  beforeSwitch === false && productionIntegrationPermitted() === false && slot.switchRemainedFalse() && procedure.opened === false && auth.authorized === false,
  procedure.reasons.join(' '),
);
check('ceremony public key was not replaced', computeSha256(readFileSync('/workspace/vendor/solvex/auth/installed-human-root.pub.pem', 'utf8')) === ceremonyFingerprint, ceremonyFingerprint);

writeFileSync('/workspace/artifacts/sandbox-rehearsal.json', JSON.stringify({
  environment: 'sandbox',
  production_credentials: false,
  production_switch: productionIntegrationPermitted(),
  capability_id: capabilityId,
  version: 1,
  sha256: contentSha,
  deployed_hash: slot.hash(),
  switch_samples: slot.switchSamples,
  procedure_opened: procedure.opened,
  private_key_deleted: artifact.private_key_deleted,
}, null, 2));
const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
