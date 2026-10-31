/**
 * AI-OS NATIVE BRANCH — Permissions
 * Fail-closed grants for Daisy system resources.
 *
 * Security rule: raw subject strings ('daisy', 'trustee', 'system') NEVER grant
 * privileged access. Every write, execute, or admin grant requires a verified,
 * unexpired, single-use HMAC-SHA-256 human authorization bound to the exact
 * subject, resource, and action. Only read on `public:*` is unauthenticated.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PermissionGrant } from '../types.ts';

export interface SignedHumanAuthorization {
  authorizationId: string;
  actor: string;
  actorType: 'human';
  subject: string;
  resource: string;
  action: PermissionGrant['action'];
  issuedAtMs: number;
  expiresAtMs: number;
  signatureHex: string;
}

export function canonicalAuthorizationPayload(
  auth: Omit<SignedHumanAuthorization, 'signatureHex'>,
): string {
  return JSON.stringify({
    action: auth.action,
    actor: auth.actor,
    actorType: auth.actorType,
    authorizationId: auth.authorizationId,
    expiresAtMs: auth.expiresAtMs,
    issuedAtMs: auth.issuedAtMs,
    resource: auth.resource,
    subject: auth.subject,
  });
}

export function signHumanAuthorization(
  input: Omit<SignedHumanAuthorization, 'signatureHex'>,
  signingSecret: string,
): SignedHumanAuthorization {
  if (!signingSecret || signingSecret.length < 32) {
    throw new Error('PERMISSION_SECRET_INVALID: signing secret must be at least 32 characters');
  }
  const payload = canonicalAuthorizationPayload(input);
  const signatureHex = createHmac('sha256', signingSecret).update(payload, 'utf8').digest('hex');
  return { ...input, signatureHex };
}

export class PermissionKernel {
  private grants: PermissionGrant[] = [];
  private consumedAuthorizationIds = new Set<string>();
  private signingSecret: string | null;

  constructor(signingSecret?: string | null) {
    const resolved =
      signingSecret ??
      (typeof process !== 'undefined' ? process.env?.DAISY_OS_PERMISSION_SECRET : undefined) ??
      null;
    this.signingSecret = resolved && resolved.trim().length >= 32 ? resolved.trim() : null;
  }

  request(
    subject: string,
    resource: string,
    action: PermissionGrant['action'],
    authorization?: SignedHumanAuthorization,
    nowMs = Date.now(),
  ): PermissionGrant {
    if (action === 'read' && resource.startsWith('public:')) {
      const grant: PermissionGrant = {
        subject,
        resource,
        action,
        granted: true,
        reason: 'Public read-only resource permitted',
      };
      this.grants.push(grant);
      return grant;
    }

    if (!this.signingSecret) {
      return this.deny(subject, resource, action, 'Fail-closed: DAISY_OS_PERMISSION_SECRET is not configured');
    }

    if (!authorization) {
      return this.deny(subject, resource, action, 'Fail-closed: signed human authorization required');
    }

    if (
      authorization.actorType !== 'human' ||
      !authorization.actor.trim() ||
      !authorization.authorizationId.trim()
    ) {
      return this.deny(subject, resource, action, 'Fail-closed: only human-rooted authorizations are valid');
    }

    if (
      authorization.subject !== subject ||
      authorization.resource !== resource ||
      authorization.action !== action
    ) {
      return this.deny(subject, resource, action, 'Fail-closed: authorization scope mismatch');
    }

    if (
      !Number.isSafeInteger(authorization.issuedAtMs) ||
      !Number.isSafeInteger(authorization.expiresAtMs) ||
      authorization.expiresAtMs <= authorization.issuedAtMs ||
      authorization.issuedAtMs > nowMs + 30_000 ||
      authorization.expiresAtMs <= nowMs
    ) {
      return this.deny(subject, resource, action, 'Fail-closed: authorization expired or invalid timestamp');
    }

    if (this.consumedAuthorizationIds.has(authorization.authorizationId)) {
      return this.deny(subject, resource, action, 'Fail-closed: replay detected on single-use authorization');
    }

    if (!/^[0-9a-f]{64}$/i.test(authorization.signatureHex)) {
      return this.deny(subject, resource, action, 'Fail-closed: malformed HMAC signature');
    }

    const expectedHex = createHmac('sha256', this.signingSecret)
      .update(canonicalAuthorizationPayload(authorization), 'utf8')
      .digest('hex');

    const providedBuf = Buffer.from(authorization.signatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      return this.deny(subject, resource, action, 'Fail-closed: invalid HMAC signature');
    }

    this.consumedAuthorizationIds.add(authorization.authorizationId);
    const grant: PermissionGrant = {
      subject,
      resource,
      action,
      granted: true,
      reason: `Authorized by human ${authorization.actor} (${authorization.authorizationId})`,
    };
    this.grants.push(grant);
    return grant;
  }

  private deny(
    subject: string,
    resource: string,
    action: PermissionGrant['action'],
    reason: string,
  ): PermissionGrant {
    const grant: PermissionGrant = {
      subject,
      resource,
      action,
      granted: false,
      reason,
    };
    this.grants.push(grant);
    return grant;
  }

  list(): PermissionGrant[] {
    return [...this.grants];
  }
}
