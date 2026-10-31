import { randomBytes } from 'node:crypto';
import { AuthService } from './AuthService';
import {
  APPROVAL_AUDIENCE,
  APPROVAL_TYPE,
  MAX_CREDENTIAL_LIFETIME_MS,
  SESSION_TYPE,
  createHumanRoot,
  signHumanApproval,
  signHumanSession,
  type ApprovalClaims,
  type SessionClaims,
} from './VerifiedHumanSession';
import { HumanApprovalGate, productionIntegrationPermitted } from '../governance/HumanApprovalGate';
import { CapabilityRegistry } from '../capabilities/CapabilityRegistry';
import { computeSha256 } from '../database/DatabaseSchema';

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

const now = 1_700_000_000_000;
const hash = computeSha256('sandbox-candidate-source');
const otherHash = computeSha256('different-candidate-source');

function session(root: { privateKeyPem: string }, over: Partial<SessionClaims> = {}) {
  const claims: SessionClaims = {
    typ: SESSION_TYPE,
    user_id: 'human-owner',
    tenant_id: 'tenant-root',
    email: 'owner@example.com',
    role: 'OWNER',
    issued_at: now - 1_000,
    expires_at: now + 60_000,
    nonce: randomBytes(16).toString('hex'),
    audience: APPROVAL_AUDIENCE,
    ...over,
  };
  return signHumanSession(root.privateKeyPem, claims);
}

function approval(root: { privateKeyPem: string }, sessionNonce: string, capabilityId: string, over: Partial<ApprovalClaims> = {}) {
  const claims: ApprovalClaims = {
    typ: APPROVAL_TYPE,
    capability_id: capabilityId,
    version: 1,
    content_sha256: hash,
    approver_user_id: 'human-owner',
    session_nonce: sessionNonce,
    approval_nonce: randomBytes(16).toString('hex'),
    statement_sha256: computeSha256('I approve this exact candidate and nothing else.'),
    issued_at: now - 1_000,
    expires_at: now + 60_000,
    ...over,
  };
  return signHumanApproval(root.privateKeyPem, claims);
}

const auth = AuthService.getInstance().authorize(
  { user_id: 'human-owner', tenant_id: 'tenant-root', email: 'owner@example.com', role: 'OWNER', issued_at: now },
  'approve_deployment',
  'tenant-root',
);
check('AuthService does not automatically approve', auth.authorized === false, auth.reason);
let minted = false;
try {
  AuthService.getInstance().createSignedToken('human-owner', 'tenant-root', 'owner@example.com', 'OWNER');
  minted = true;
} catch {
  minted = false;
}
check('AuthService does not mint a local token', minted === false, 'throw');
check('AuthService verifier stays closed', AuthService.getInstance().verifyToken('anything').valid === false, 'closed');
check('production integration switch is closed', productionIntegrationPermitted() === false, 'closed');

const root = createHumanRoot();
const production = new HumanApprovalGate();
const signedSession = session(root);
const previewCapability = 'cap_62c53d66bed4';
const signedForProduction = approval(root, signedSession.claims.nonce, previewCapability);
const rejected = production.submitSignedApproval(signedSession, signedForProduction, now);
check('unconfigured production root rejects a signature', rejected.status === 'BLOCKED' && production.count() === 0, rejected.reason);

const unsigned = production.decide(
  { user_id: 'human-owner', tenant_id: 'tenant-root', email: 'owner@example.com', role: 'OWNER', issued_at: now },
  { kind: 'capability', id: previewCapability, version: 1, contentSha256: hash },
  'I approve this candidate.',
);
check('unsigned user context records nothing', unsigned.status === 'BLOCKED' && production.count() === 0, unsigned.reason);
check('model text records nothing', production.decideFromModel('I approve deployment.').status === 'BLOCKED', 'model');

const gate = new HumanApprovalGate(root.publicKeyPem);
check('gate is configured with the public key only', !JSON.stringify(gate).includes(root.privateKeyPem), 'no private key');
const registry = new CapabilityRegistry(gate);
const proposed = registry.propose('signed-candidate', 'A sandbox candidate awaiting a human signature.');
const verified = registry.markVerified(proposed.id, hash);
check('candidate is verified before any approval', verified.ok === true, verified.ok ? verified.record.status : verified.reason);

const ownerSession = session(root);
const ownerApproval = approval(root, ownerSession.claims.nonce, proposed.id);
const recorded = gate.submitSignedApproval(ownerSession, ownerApproval, now);
check('explicit signature for this id, version, and hash is recorded', recorded.status === 'RECORDED' && recorded.record?.capability_id === proposed.id && recorded.record.version === 1 && recorded.record.content_sha256 === hash, recorded.reason);
const verdict = gate.independentlyVerify({ kind: 'capability', id: proposed.id, version: 1, contentSha256: hash }, now);
check('independent verification recomputes the signature', verdict.ok === true, verdict.reason);

const deploy = registry.deploy(proposed.id, null, now);
check(
  'verified approval still does not deploy',
  deploy.deployed === false && deploy.reason.includes('verified identity') && registry.get(proposed.id)?.status === 'APPROVAL_REQUIRED',
  deploy.reason,
);

const first = registry.attemptIntegration(proposed.id, null, now);
check(
  'valid approval is rolled back before production integration',
  first.deployed === false && first.rolled_back === true && first.verification_ok === true && first.reason.includes('verified identity') && registry.get(proposed.id)?.status === 'APPROVAL_REQUIRED' && registry.get(proposed.id)?.executable === false,
  first.reason,
);
const replayedUse = registry.attemptIntegration(proposed.id, null, now);
check('reused approval cannot be replayed into integration', replayedUse.deployed === false && replayedUse.verification_ok === false && registry.get(proposed.id)?.status === 'APPROVAL_REQUIRED', replayedUse.reason);

const replaySubmit = gate.submitSignedApproval(ownerSession, ownerApproval, now);
check('the same signed approval cannot be submitted twice', replaySubmit.status === 'BLOCKED' && gate.count() === 1, replaySubmit.reason);

const mismatch = gate.independentlyVerify({ kind: 'capability', id: proposed.id, version: 1, contentSha256: otherHash }, now);
check('a different SHA-256 does not match the approval', mismatch.ok === false, mismatch.reason);
const wrongVersion = gate.independentlyVerify({ kind: 'capability', id: proposed.id, version: 2, contentSha256: hash }, now);
check('a different version does not match the approval', wrongVersion.ok === false, wrongVersion.reason);

function isolated(run: (localRoot: { publicKeyPem: string; privateKeyPem: string }, localGate: HumanApprovalGate, capabilityId: string) => void) {
  const localRoot = createHumanRoot();
  const localGate = new HumanApprovalGate(localRoot.publicKeyPem);
  const localRegistry = new CapabilityRegistry(localGate);
  const localProposed = localRegistry.propose(`candidate-${randomBytes(4).toString('hex')}`, 'isolated');
  localRegistry.markVerified(localProposed.id, hash);
  run(localRoot, localGate, localProposed.id);
}

isolated((localRoot, localGate, capabilityId) => {
  const expiredSession = session(localRoot, { expires_at: now - 1 });
  const expiredApproval = approval(localRoot, expiredSession.claims.nonce, capabilityId);
  const result = localGate.submitSignedApproval(expiredSession, expiredApproval, now);
  check('expired session is rejected', result.status === 'BLOCKED' && localGate.count() === 0, result.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const liveSession = session(localRoot);
  const expiredApproval = approval(localRoot, liveSession.claims.nonce, capabilityId, { expires_at: now - 1 });
  const result = localGate.submitSignedApproval(liveSession, expiredApproval, now);
  check('expired approval is rejected', result.status === 'BLOCKED' && localGate.count() === 0, result.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const liveSession = session(localRoot, { role: 'VERIFIER' });
  const liveApproval = approval(localRoot, liveSession.claims.nonce, capabilityId);
  const result = localGate.submitSignedApproval(liveSession, liveApproval, now);
  check('a non-owner role cannot approve', result.status === 'BLOCKED' && localGate.count() === 0, result.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const liveSession = session(localRoot);
  const liveApproval = approval(localRoot, liveSession.claims.nonce, capabilityId);
  const stored = localGate.submitSignedApproval(liveSession, liveApproval, now);
  if (stored.record) localGate.revokeApproval(stored.record.id);
  const revoked = localGate.independentlyVerify({ kind: 'capability', id: capabilityId, version: 1, contentSha256: hash }, now);
  const localRegistry = new CapabilityRegistry(localGate);
  const row = localRegistry.propose('revoked-row', 'revoked');
  localRegistry.markVerified(row.id, hash);
  check('revoked approval fails independent verification', stored.status === 'RECORDED' && revoked.ok === false, revoked.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const liveSession = session(localRoot);
  const tampered = approval(localRoot, liveSession.claims.nonce, capabilityId);
  tampered.signature = `${tampered.signature.slice(0, -2)}aa`;
  const result = localGate.submitSignedApproval(liveSession, tampered, now);
  check('tampered approval signature is rejected', result.status === 'BLOCKED' && localGate.count() === 0, result.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const other = createHumanRoot();
  const liveSession = session(other);
  const liveApproval = approval(other, liveSession.claims.nonce, capabilityId);
  const result = localGate.submitSignedApproval(liveSession, liveApproval, now);
  check('a signature from a different root is rejected', result.status === 'BLOCKED' && localGate.count() === 0, result.reason);
});

isolated((localRoot, localGate, capabilityId) => {
  const liveSession = session(localRoot, { expires_at: liveSessionIssued(now) });
  const tooLong = approval(localRoot, liveSession.claims.nonce, capabilityId, { expires_at: now + MAX_CREDENTIAL_LIFETIME_MS + 5_000 });
  const result = localGate.submitSignedApproval(liveSession, tooLong, now);
  check('an overlong approval window is rejected', result.status === 'BLOCKED', result.reason);
  void capabilityId;
});

function liveSessionIssued(value: number): number {
  return value + 60_000;
}

const failed = results.filter((item) => !item.pass);
console.log(JSON.stringify({
  passed: results.length - failed.length,
  failed: failed.length,
  production_integration: productionIntegrationPermitted(),
  auth_service_authorized: false,
  results,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
