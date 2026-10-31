import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import type { SovereignRole } from './AuthService';

export const SESSION_TYPE = 'solvex-human-session-v1';
export const APPROVAL_TYPE = 'solvex-human-approval-v1';
export const APPROVAL_AUDIENCE = 'solvex-approval';
export const MAX_CREDENTIAL_LIFETIME_MS = 15 * 60 * 1000;

export interface SessionClaims {
  typ: typeof SESSION_TYPE;
  user_id: string;
  tenant_id: string;
  email: string;
  role: SovereignRole;
  issued_at: number;
  expires_at: number;
  nonce: string;
  audience: typeof APPROVAL_AUDIENCE;
}

export interface ApprovalClaims {
  typ: typeof APPROVAL_TYPE;
  capability_id: string;
  version: number;
  content_sha256: string;
  approver_user_id: string;
  session_nonce: string;
  approval_nonce: string;
  statement_sha256: string;
  issued_at: number;
  expires_at: number;
}

export interface SignedToken<T> {
  claims: T;
  signature: string;
}

export function createHumanRoot(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export function canonicalBytes(value: object): Buffer {
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const ordered: Record<string, string | number> = {};
  for (const [key, item] of entries) {
    if (typeof item !== 'string' && typeof item !== 'number') throw new Error('BLOCKED: claim value type is invalid.');
    ordered[key] = item;
  }
  return Buffer.from(JSON.stringify(ordered), 'utf8');
}

function signClaims(privateKeyPem: string, claims: object): string {
  const signature = sign(null, canonicalBytes(claims), createPrivateKey(privateKeyPem));
  return signature.toString('base64');
}

export function verifyClaims(publicKeyPem: string, claims: object, signature: string): boolean {
  try {
    return verify(null, canonicalBytes(claims), createPublicKey(publicKeyPem), Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

export function signHumanSession(privateKeyPem: string, claims: SessionClaims): SignedToken<SessionClaims> {
  return { claims, signature: signClaims(privateKeyPem, claims) };
}

export function signHumanApproval(privateKeyPem: string, claims: ApprovalClaims): SignedToken<ApprovalClaims> {
  return { claims, signature: signClaims(privateKeyPem, claims) };
}

export function sessionLifetimeValid(claims: SessionClaims, now: number): string | null {
  if (claims.typ !== SESSION_TYPE || claims.audience !== APPROVAL_AUDIENCE) return 'BLOCKED: session type is not a human approval session.';
  if (claims.role !== 'OWNER') return 'BLOCKED: only the human owner role can approve a candidate.';
  if (!claims.user_id || !claims.tenant_id || !claims.nonce) return 'BLOCKED: session identity is incomplete.';
  if (claims.expires_at <= claims.issued_at) return 'BLOCKED: session expiry is not after issuance.';
  if (claims.expires_at - claims.issued_at > MAX_CREDENTIAL_LIFETIME_MS) return 'BLOCKED: session lifetime exceeds the allowed window.';
  if (now < claims.issued_at || now >= claims.expires_at) return 'BLOCKED: session is expired or not yet valid.';
  return null;
}

export function approvalLifetimeValid(claims: ApprovalClaims, now: number): string | null {
  if (claims.typ !== APPROVAL_TYPE) return 'BLOCKED: approval type is not recognized.';
  if (!Number.isInteger(claims.version) || claims.version < 1) return 'BLOCKED: approval version is invalid.';
  if (!/^[a-f0-9]{64}$/.test(claims.content_sha256)) return 'BLOCKED: approval is missing the candidate SHA-256.';
  if (!claims.capability_id || !claims.approver_user_id || !claims.session_nonce || !claims.approval_nonce) {
    return 'BLOCKED: approval binding is incomplete.';
  }
  if (claims.expires_at <= claims.issued_at) return 'BLOCKED: approval expiry is not after issuance.';
  if (claims.expires_at - claims.issued_at > MAX_CREDENTIAL_LIFETIME_MS) return 'BLOCKED: approval lifetime exceeds the allowed window.';
  if (now < claims.issued_at || now >= claims.expires_at) return 'BLOCKED: approval has expired or is not yet valid.';
  return null;
}
