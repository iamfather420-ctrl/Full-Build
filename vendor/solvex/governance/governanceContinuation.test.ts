import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { computeSha256 } from '../database/DatabaseSchema';
import { generateGapClassifierSource } from '../capabilities/RecursiveLifecycle';
import { continueAuthorizedStages } from '../capabilities/authorizedStages';
import { createHumanRoot, signHumanApproval, signHumanSession, APPROVAL_AUDIENCE, APPROVAL_TYPE, SESSION_TYPE } from '../auth/VerifiedHumanSession';
import { HumanApprovalGate, productionIntegrationPermitted } from './HumanApprovalGate';
import { installHumanRootPublicKey } from '../auth/installHumanRoot';
import { validateHumanRootEvidence, type HumanRootEvidence } from './humanRootEvidence';
import { disposeBlockedGates } from './gateDisposition';
import { runProductionIntegrationProcedure } from './productionIntegrationProcedure';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const evidenceBytes = readFileSync('/workspace/artifacts/human-owner-approval.json', 'utf8');
const evidence = JSON.parse(evidenceBytes) as HumanRootEvidence;
const publicKeyPem = readFileSync('/workspace/vendor/solvex/auth/installed-human-root.pub.pem', 'utf8');
const statement = 'I approve gap-classifier version 1 at this exact source hash and no other candidate.';
const validation = validateHumanRootEvidence({
  evidence,
  evidenceBytes,
  publicKeyPem,
  source: generateGapClassifierSource(),
  statement,
  now: Date.now(),
});
check('preserved evidence matches the installed fingerprint and source', validation.ok && validation.fingerprint_matches && validation.source_matches && validation.live_authorization === false && validation.live_signature === 'NOT_RETAINED', validation.findings.join(' '));

const tampered = evidenceBytes.replace(evidence.candidate.sha256, computeSha256('tampered'));
const tamperedValidation = validateHumanRootEvidence({
  evidence: JSON.parse(tampered) as HumanRootEvidence,
  evidenceBytes: tampered,
  publicKeyPem,
  source: generateGapClassifierSource(),
  statement,
  now: Date.now(),
});
check('tampered evidence fails validation', tamperedValidation.ok === false && tamperedValidation.source_matches === false, tamperedValidation.findings[0] ?? '');

const now = 1_700_000_000_000;
const current = createHumanRoot();
const next = createHumanRoot();
const session = signHumanSession(current.privateKeyPem, {
  typ: SESSION_TYPE,
  user_id: 'external-human-owner',
  tenant_id: 'external-human-root',
  email: 'owner@external-human-root',
  role: 'OWNER',
  issued_at: now,
  expires_at: now + 60_000,
  nonce: randomBytes(16).toString('hex'),
  audience: APPROVAL_AUDIENCE,
});
const approval = signHumanApproval(current.privateKeyPem, {
  typ: APPROVAL_TYPE,
  capability_id: 'cap_rotation',
  version: 1,
  content_sha256: computeSha256('rotation-candidate'),
  approver_user_id: 'external-human-owner',
  session_nonce: session.claims.nonce,
  approval_nonce: randomBytes(16).toString('hex'),
  statement_sha256: computeSha256('rotate'),
  issued_at: now,
  expires_at: now + 60_000,
});
const subject = { kind: 'capability' as const, id: 'cap_rotation', version: 1, contentSha256: computeSha256('rotation-candidate') };
const originalGate = new HumanApprovalGate(installHumanRootPublicKey(current.publicKeyPem, '/tmp/solvex-root-current.pem').pem);
const recorded = originalGate.submitSignedApproval(session, approval, now);
check('current root records an ephemeral approval', recorded.status === 'RECORDED', recorded.reason);

const rotatedPem = installHumanRootPublicKey(next.publicKeyPem, '/tmp/solvex-root-next.pem').pem;
const rotatedGate = new HumanApprovalGate(rotatedPem);
const rotatedSubmit = rotatedGate.submitSignedApproval(session, approval, now);
check('a rotated public key rejects the retired signature', rotatedSubmit.status === 'BLOCKED', rotatedSubmit.reason);

const recoveredPem = installHumanRootPublicKey(current.publicKeyPem, '/tmp/solvex-root-recovered.pem').pem;
const recovered = new HumanApprovalGate(recoveredPem);
const recoveredSubmit = recovered.submitSignedApproval(session, approval, now);
check('recovery reinstalls the archived public key', recoveredSubmit.status === 'RECORDED' && computeSha256(recoveredPem) === computeSha256(current.publicKeyPem), recoveredSubmit.reason);
if (recoveredSubmit.record) recovered.revokeApproval(recoveredSubmit.record.id);
check('recovered root still enforces revocation', recovered.independentlyVerify(subject, now).ok === false, 'revoked');

const expired = signHumanApproval(current.privateKeyPem, {
  ...approval.claims,
  approval_nonce: randomBytes(16).toString('hex'),
  issued_at: now - 5_000,
  expires_at: now - 1,
});
const expiredSession = signHumanSession(current.privateKeyPem, {
  ...session.claims,
  nonce: expired.claims.session_nonce,
  issued_at: now - 5_000,
  expires_at: now + 60_000,
});
const expiryGate = new HumanApprovalGate(current.publicKeyPem);
const expiredResult = expiryGate.submitSignedApproval(expiredSession, expired, now);
check('expired approval is rejected', expiredResult.status === 'BLOCKED' && expiredResult.reason.includes('expired'), expiredResult.reason);
const forgedClaims = { ...approval.claims, approval_nonce: randomBytes(16).toString('hex') };
const forged = { claims: forgedClaims, signature: `${approval.signature.slice(0, -2)}aa` };
check('tampered signature is rejected', new HumanApprovalGate(current.publicKeyPem).submitSignedApproval(session, forged, now).status === 'BLOCKED', 'tampered');
check('installed ceremony key was not replaced', computeSha256(readFileSync('/workspace/vendor/solvex/auth/installed-human-root.pub.pem', 'utf8')) === evidence.public_key_fingerprint, evidence.public_key_fingerprint);

const gates = JSON.parse(readFileSync('/workspace/artifacts/gates46-rerun.json', 'utf8')) as { non_passed: Array<{ id: string; status: string; name: string }>; overall_verdict: string };
const disposition = disposeBlockedGates(gates.non_passed.map((gate) => ({ id: gate.id, status: gate.status, name: gate.name })));
check('gate blockers are retained and not rewritten as passed', disposition.ok && disposition.dispositions.every((gate) => gate.may_pass === false) && gates.overall_verdict === 'BLOCKED', disposition.findings.join(' ') || disposition.dispositions.map((gate) => gate.id).join(','));

const procedure = runProductionIntegrationProcedure({
  candidateEvidenceVerified: validation.ok,
  liveAuthorization: validation.live_authorization,
  dispositions: disposition.dispositions,
  operatorIntegrationSignature: null,
});
check('production integration procedure stays closed', procedure.opened === false && procedure.decision === 'REMAIN_CLOSED' && procedure.candidate_approval_counts_as_integration_auth === false && productionIntegrationPermitted() === false, procedure.reasons.join(' '));

const continuation = continueAuthorizedStages(validation, procedure);
check('recursive continuation stops at authorization without deploying', continuation.lifecycle_complete === false && continuation.production_ready === false && continuation.bypassed_governance === false && continuation.stopped_at === 'AUTHORIZATION' && continuation.stages.find((stage) => stage.name === 'DEPLOY')?.status === 'NOT_RUN', continuation.stages.map((stage) => `${stage.name}:${stage.status}`).join(','));

writeFileSync('/workspace/artifacts/human-root-independent-validation.json', JSON.stringify({ validation, procedure, continuation, gate_dispositions: disposition, corpus_does_not_certify_gates_or_os: true }, null, 2));
const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
