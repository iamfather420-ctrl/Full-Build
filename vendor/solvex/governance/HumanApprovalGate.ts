import { AuthService, type UserContext } from '../auth/AuthService';
import { computeSha256 } from '../database/DatabaseSchema';
import { modelUtteranceGrantsNothing } from '../inference/InferenceRuntime';
import {
  approvalLifetimeValid,
  sessionLifetimeValid,
  verifyClaims,
  type ApprovalClaims,
  type SessionClaims,
  type SignedToken,
} from '../auth/VerifiedHumanSession';

export type ApprovalSubject =
  | { kind: 'capability'; id: string; version: number; contentSha256?: string }
  | { kind: 'checkpoint'; id: string; weightSha256: string };

export interface ApprovalRecord {
  id: string;
  subject_key: string;
  approver_user_id: string;
  statement_sha256: string;
  capability_id: string;
  version: number;
  content_sha256: string;
  session_claims: SessionClaims;
  approval_claims: ApprovalClaims;
  session_signature: string;
  approval_signature: string;
}

export type ApprovalDecision = {
  status: 'BLOCKED';
  reason: string;
  record: null;
} | {
  status: 'RECORDED';
  reason: string;
  record: ApprovalRecord;
};

export interface IndependentVerdict {
  ok: boolean;
  reason: string;
  record: ApprovalRecord | null;
}

const SHA256 = /^[a-f0-9]{64}$/;

/** Production integration stays closed. A verified signature does not open it. */
export function productionIntegrationPermitted(): false {
  return false;
}

export function approvalSubjectKey(subject: ApprovalSubject): string {
  if (subject.kind === 'capability') {
    const hash = subject.contentSha256 && SHA256.test(subject.contentSha256) ? subject.contentSha256 : 'unbound';
    return `capability:${subject.id}:${subject.version}:${hash}`;
  }
  return `checkpoint:${subject.id}:${subject.weightSha256}`;
}

/** Key equality only. A matching key is not authorization and is not a stored record. */
export function approvalBindsCandidate(recordKey: string | null, subject: ApprovalSubject): { bound: boolean; reason: string } {
  if (subject.kind === 'capability' && !SHA256.test(subject.contentSha256 ?? '')) {
    return { bound: false, reason: 'BLOCKED: human approval must name the exact candidate hash.' };
  }
  if (!recordKey) return { bound: false, reason: 'BLOCKED: no human approval record exists for this subject.' };
  if (recordKey !== approvalSubjectKey(subject)) {
    return { bound: false, reason: 'BLOCKED: approval record is not bound to this candidate hash and version.' };
  }
  return { bound: true, reason: 'record key matches this candidate hash and version' };
}

/**
 * Deployment approval is a signed human act. The gate stores no private key
 * and does not mint sessions. AuthService remains fail-closed for production.
 */
export class HumanApprovalGate {
  private readonly records = new Map<string, ApprovalRecord>();
  private readonly seenApprovalNonces = new Set<string>();
  private readonly revokedApprovalIds = new Set<string>();
  private readonly revokedSessionNonces = new Set<string>();
  private readonly integrationUses = new Set<string>();

  constructor(private readonly rootPublicKeyPem: string | null = null) {}

  public decide(user: UserContext | null, subject: ApprovalSubject, statement: string): ApprovalDecision {
    const grant = modelUtteranceGrantsNothing(statement);
    if (grant.authorized || grant.executable) {
      return { status: 'BLOCKED', reason: 'BLOCKED: model text cannot approve a deployment.', record: null };
    }
    if (subject.kind === 'capability' && !SHA256.test(subject.contentSha256 ?? '')) {
      return { status: 'BLOCKED', reason: 'BLOCKED: human approval must name the exact candidate hash.', record: null };
    }
    const auth = AuthService.getInstance().authorize(user, 'approve_deployment', user?.tenant_id);
    if (!auth.authorized || !user) {
      return { status: 'BLOCKED', reason: auth.reason, record: null };
    }
    return {
      status: 'BLOCKED',
      reason: 'BLOCKED: an unsigned session cannot approve. A human signature over the exact candidate is required.',
      record: null,
    };
  }

  public decideFromModel(statement: string): ApprovalDecision {
    modelUtteranceGrantsNothing(statement);
    return { status: 'BLOCKED', reason: 'BLOCKED: model text cannot approve a deployment.', record: null };
  }

  public submitSignedApproval(
    session: SignedToken<SessionClaims>,
    approval: SignedToken<ApprovalClaims>,
    now = Date.now(),
  ): ApprovalDecision {
    if (!this.rootPublicKeyPem) {
      return { status: 'BLOCKED', reason: 'BLOCKED: no human root public key is configured.', record: null };
    }
    const model = modelUtteranceGrantsNothing('');
    if (model.authorized) return { status: 'BLOCKED', reason: 'BLOCKED: model text cannot approve a deployment.', record: null };
    const sessionError = sessionLifetimeValid(session.claims, now);
    if (sessionError) return { status: 'BLOCKED', reason: sessionError, record: null };
    const approvalError = approvalLifetimeValid(approval.claims, now);
    if (approvalError) return { status: 'BLOCKED', reason: approvalError, record: null };
    if (this.revokedSessionNonces.has(session.claims.nonce)) {
      return { status: 'BLOCKED', reason: 'BLOCKED: session was revoked.', record: null };
    }
    if (approval.claims.session_nonce !== session.claims.nonce || approval.claims.approver_user_id !== session.claims.user_id) {
      return { status: 'BLOCKED', reason: 'BLOCKED: approval is not bound to this human session.', record: null };
    }
    if (!verifyClaims(this.rootPublicKeyPem, session.claims, session.signature)) {
      return { status: 'BLOCKED', reason: 'BLOCKED: session signature did not verify.', record: null };
    }
    if (!verifyClaims(this.rootPublicKeyPem, approval.claims, approval.signature)) {
      return { status: 'BLOCKED', reason: 'BLOCKED: approval signature did not verify.', record: null };
    }
    if (this.seenApprovalNonces.has(approval.claims.approval_nonce)) {
      return { status: 'BLOCKED', reason: 'BLOCKED: approval replay was rejected.', record: null };
    }
    const subject: ApprovalSubject = {
      kind: 'capability',
      id: approval.claims.capability_id,
      version: approval.claims.version,
      contentSha256: approval.claims.content_sha256,
    };
    const subject_key = approvalSubjectKey(subject);
    const record: ApprovalRecord = {
      id: `apr_${computeSha256(approval.signature).slice(0, 16)}`,
      subject_key,
      approver_user_id: session.claims.user_id,
      statement_sha256: approval.claims.statement_sha256,
      capability_id: approval.claims.capability_id,
      version: approval.claims.version,
      content_sha256: approval.claims.content_sha256,
      session_claims: session.claims,
      approval_claims: approval.claims,
      session_signature: session.signature,
      approval_signature: approval.signature,
    };
    this.seenApprovalNonces.add(approval.claims.approval_nonce);
    this.records.set(subject_key, record);
    return { status: 'RECORDED', reason: 'Human signature recorded for this exact candidate.', record };
  }

  public revokeApproval(id: string): void {
    this.revokedApprovalIds.add(id);
  }

  public revokeSession(nonce: string): void {
    this.revokedSessionNonces.add(nonce);
  }

  public independentlyVerify(subject: ApprovalSubject, now = Date.now()): IndependentVerdict {
    if (!this.rootPublicKeyPem) {
      return { ok: false, reason: 'BLOCKED: no human root public key is configured.', record: null };
    }
    if (subject.kind !== 'capability') {
      return { ok: false, reason: 'BLOCKED: this subject is not a capability candidate.', record: null };
    }
    const record = this.records.get(approvalSubjectKey(subject)) ?? null;
    if (!record) {
      if (subject.kind === 'capability') {
        const mismatch = [...this.records.values()].some((item) => item.capability_id === subject.id || item.content_sha256 === subject.contentSha256);
        if (mismatch) return { ok: false, reason: 'BLOCKED: approval record is not bound to this candidate hash and version.', record: null };
      }
      return { ok: false, reason: 'BLOCKED: no human approval record exists for this subject.', record: null };
    }
    const binding = approvalBindsCandidate(record.subject_key, subject);
    if (!binding.bound) return { ok: false, reason: binding.reason, record };
    if (
      record.capability_id !== subject.id
      || record.version !== subject.version
      || record.content_sha256 !== subject.contentSha256
      || record.approval_claims.capability_id !== subject.id
      || record.approval_claims.version !== subject.version
      || record.approval_claims.content_sha256 !== subject.contentSha256
    ) {
      return { ok: false, reason: 'BLOCKED: approval record is not bound to this candidate hash and version.', record };
    }
    if (this.revokedApprovalIds.has(record.id) || this.revokedSessionNonces.has(record.session_claims.nonce)) {
      return { ok: false, reason: 'BLOCKED: approval was revoked.', record };
    }
    if (this.integrationUses.has(record.id)) {
      return { ok: false, reason: 'BLOCKED: approval replay was rejected.', record };
    }
    const sessionError = sessionLifetimeValid(record.session_claims, now);
    if (sessionError) return { ok: false, reason: sessionError, record };
    const approvalError = approvalLifetimeValid(record.approval_claims, now);
    if (approvalError) return { ok: false, reason: approvalError, record };
    if (!verifyClaims(this.rootPublicKeyPem, record.session_claims, record.session_signature)) {
      return { ok: false, reason: 'BLOCKED: session signature did not verify.', record };
    }
    if (!verifyClaims(this.rootPublicKeyPem, record.approval_claims, record.approval_signature)) {
      return { ok: false, reason: 'BLOCKED: approval signature did not verify.', record };
    }
    return { ok: true, reason: 'Independent verification matched the human signature and the candidate binding.', record };
  }

  public accountIntegrationUse(recordId: string): void {
    this.integrationUses.add(recordId);
  }

  public assertDeployment(user: UserContext | null, subject: ApprovalSubject, now = Date.now()): { ok: false; reason: string } | { ok: true; record: ApprovalRecord } {
    const verdict = this.independentlyVerify(subject, now);
    if (!verdict.ok || !verdict.record) return { ok: false, reason: verdict.reason };
    const auth = AuthService.getInstance().authorize(user, 'deploy', user?.tenant_id);
    if (!auth.authorized || !user) return { ok: false, reason: auth.reason };
    if (!productionIntegrationPermitted()) {
      return { ok: false, reason: 'BLOCKED: production integration is not permitted.' };
    }
    if (user.user_id !== verdict.record.approver_user_id) {
      return { ok: false, reason: 'BLOCKED: approval is bound to a different human.' };
    }
    return { ok: true, record: verdict.record };
  }

  public has(subject: ApprovalSubject): boolean {
    return this.records.has(approvalSubjectKey(subject));
  }

  public count(): number {
    return this.records.size;
  }
}
