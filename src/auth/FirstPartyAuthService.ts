import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

export type FirstPartyRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface AuthIdentity {
  userId: string;
  email: string;
  tenantId: string;
  role: FirstPartyRole;
}

export interface CredentialRecord {
  userId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  disabled: boolean;
}

export interface MembershipRecord {
  tenantId: string;
  role: FirstPartyRole;
  active: boolean;
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  tenantId: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

export interface InvitationRegistration {
  email: string;
  passwordSalt: string;
  passwordHash: string;
  now: number;
}

export interface FirstPartyAuthRepository {
  /** Must atomically validate/consume a single-use invitation, create a CUSTOMER account and membership. */
  registerFromInvitation(invitationTokenHash: string, input: InvitationRegistration): Promise<AuthIdentity | null>;
  findCredentialByEmailAndTenant(normalizedEmail: string, tenantId: string): Promise<CredentialRecord | null>;
  findCredentialByUserIdAndTenant(userId: string, tenantId: string): Promise<CredentialRecord | null>;
  findMembership(userId: string, tenantId: string): Promise<MembershipRecord | null>;
  createSession(session: SessionRecord): Promise<void>;
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  revokeSession(tokenHash: string, revokedAt: number): Promise<boolean>;
  appendAuthAudit(event: {
    event: 'REGISTERED' | 'LOGIN_SUCCEEDED' | 'LOGIN_REJECTED' | 'REGISTRATION_REJECTED' | 'SESSION_REVOKED';
    userId?: string;
    tenantId?: string;
    occurredAt: number;
    reason?: string;
  }): Promise<void>;
}

export interface LoginRateLimiter {
  /** Atomically reserves one attempt; must use shared storage in a multi-replica deployment. */
  allow(key: string, now: number): Promise<boolean>;
  /** Records failure metadata after a reserved attempt; must not increment the attempt counter again. */
  recordFailure(key: string, now: number): Promise<void>;
  clear(key: string): Promise<void>;
}

export interface AuthServiceOptions {
  repository: FirstPartyAuthRepository;
  rateLimiter: LoginRateLimiter;
  now?: () => number;
  sessionTtlMs?: number;
  maxPasswordLength?: number;
}

export interface AuthResult {
  ok: boolean;
  identity?: AuthIdentity;
  sessionToken?: string;
  expiresAt?: number;
  error?: string;
}

const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;
const SCRYPT_KEY_LENGTH = 64;
const SESSION_TOKEN_BYTES = 32;
const EMAIL_MAX_LENGTH = 254;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return email.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * First-party credential/session primitives. This service is intentionally repository-injected:
 * production use is blocked until a transactional, durable repository and shared rate limiter
 * are implemented and independently tested. It never trusts client-supplied roles.
 */
export class FirstPartyAuthService {
  private readonly repository: FirstPartyAuthRepository;
  private readonly rateLimiter: LoginRateLimiter;
  private readonly now: () => number;
  private readonly sessionTtlMs: number;
  private readonly maxPasswordLength: number;

  constructor(options: AuthServiceOptions) {
    this.repository = options.repository;
    this.rateLimiter = options.rateLimiter;
    this.now = options.now || Date.now;
    this.sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    this.maxPasswordLength = options.maxPasswordLength ?? 1024;

    if (!Number.isSafeInteger(this.sessionTtlMs) || this.sessionTtlMs < 60_000 || this.sessionTtlMs > 24 * 60 * 60 * 1000) {
      throw new Error('Invalid session TTL; it must be between 1 minute and 24 hours.');
    }
    if (!Number.isSafeInteger(this.maxPasswordLength) || this.maxPasswordLength < MIN_PASSWORD_LENGTH) {
      throw new Error('Invalid maximum password length.');
    }
  }

  async register(emailInput: string, password: string, invitationToken: string): Promise<AuthResult> {
    const email = normalizeEmail(emailInput);
    if (!validEmail(email)) return { ok: false, error: 'INVALID_INPUT' };
    if (!this.validPassword(password)) return { ok: false, error: 'PASSWORD_POLICY_FAILED' };
    const rateKey = sha256(`register:${email}`);
    const now = this.now();
    if (!await this.rateLimiter.allow(rateKey, now)) {
      await this.repository.appendAuthAudit({ event: 'REGISTRATION_REJECTED', occurredAt: now, reason: 'RATE_LIMITED' });
      return { ok: false, error: 'REGISTRATION_TEMPORARILY_UNAVAILABLE' };
    }
    if (typeof invitationToken !== 'string' || invitationToken.length < 32 || invitationToken.length > 512) {
      await this.rateLimiter.recordFailure(rateKey, now);
      await this.repository.appendAuthAudit({ event: 'REGISTRATION_REJECTED', occurredAt: now, reason: 'INVITATION_REQUIRED' });
      return { ok: false, error: 'INVITATION_REQUIRED' };
    }

    const salt = randomBytes(16);
    const passwordHash = (await scrypt(password, salt)).toString('hex');
    const identity = await this.repository.registerFromInvitation(sha256(invitationToken), {
      email,
      passwordSalt: salt.toString('hex'),
      passwordHash,
      now,
    });
    if (!identity) {
      await this.rateLimiter.recordFailure(rateKey, now);
      await this.repository.appendAuthAudit({ event: 'REGISTRATION_REJECTED', occurredAt: now, reason: 'INVITATION_INVALID_OR_ACCOUNT_EXISTS' });
      return { ok: false, error: 'INVITATION_INVALID_OR_ACCOUNT_EXISTS' };
    }

    await this.rateLimiter.clear(rateKey);
    await this.repository.appendAuthAudit({ event: 'REGISTERED', userId: identity.userId, tenantId: identity.tenantId, occurredAt: now });
    return this.createSession(identity, now);
  }

  async login(emailInput: string, password: string, requestedTenantId: string): Promise<AuthResult> {
    const email = normalizeEmail(emailInput);
    const key = sha256(email);
    const now = this.now();

    if (!validEmail(email) || typeof password !== 'string' || password.length > this.maxPasswordLength ||
        typeof requestedTenantId !== 'string' || requestedTenantId.length < 1 || requestedTenantId.length > 200) {
      await this.repository.appendAuthAudit({ event: 'LOGIN_REJECTED', occurredAt: now, reason: 'INVALID_INPUT' });
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    if (!await this.rateLimiter.allow(key, now)) {
      await this.repository.appendAuthAudit({ event: 'LOGIN_REJECTED', occurredAt: now, reason: 'RATE_LIMITED' });
      return { ok: false, error: 'LOGIN_TEMPORARILY_UNAVAILABLE' };
    }

    const credential = await this.repository.findCredentialByEmailAndTenant(email, requestedTenantId);
    // Always perform a password KDF even for unknown users to reduce account-enumeration timing.
    const salt = credential ? Buffer.from(credential.passwordSalt, 'hex') : Buffer.alloc(16, 0x5a);
    const expected = credential ? Buffer.from(credential.passwordHash, 'hex') : Buffer.alloc(SCRYPT_KEY_LENGTH, 0);
    const actual = await scrypt(password, salt);
    const passwordMatches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!credential || credential.disabled || !passwordMatches) {
      await this.rateLimiter.recordFailure(key, now);
      await this.repository.appendAuthAudit({
        event: 'LOGIN_REJECTED',
        userId: credential?.userId,
        occurredAt: now,
        reason: 'INVALID_CREDENTIALS',
      });
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    const membership = await this.repository.findMembership(credential.userId, requestedTenantId);
    if (!membership?.active) {
      await this.rateLimiter.recordFailure(key, now);
      await this.repository.appendAuthAudit({ event: 'LOGIN_REJECTED', userId: credential.userId, tenantId: requestedTenantId, occurredAt: now, reason: 'TENANT_MEMBERSHIP_DENIED' });
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    await this.rateLimiter.clear(key);
    const identity: AuthIdentity = {
      userId: credential.userId,
      email: credential.email,
      tenantId: membership.tenantId,
      role: membership.role,
    };
    await this.repository.appendAuthAudit({ event: 'LOGIN_SUCCEEDED', userId: identity.userId, tenantId: identity.tenantId, occurredAt: now });
    return this.createSession(identity, now);
  }

  async verifySession(rawToken: string): Promise<{ valid: boolean; identity?: AuthIdentity; error?: string }> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) {
      return { valid: false, error: 'SESSION_INVALID' };
    }
    const now = this.now();
    const tokenHash = sha256(rawToken);
    const session = await this.repository.findSession(tokenHash);
    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
      return { valid: false, error: 'SESSION_INVALID_OR_EXPIRED' };
    }

    const credential = await this.repository.findCredentialByUserIdAndTenant(session.userId, session.tenantId);
    // Repositories that do not support ID lookup cannot verify current account status.
    if (!credential || credential.disabled) return { valid: false, error: 'ACCOUNT_UNAVAILABLE' };
    const membership = await this.repository.findMembership(session.userId, session.tenantId);
    if (!membership?.active) return { valid: false, error: 'TENANT_MEMBERSHIP_DENIED' };

    return {
      valid: true,
      identity: { userId: credential.userId, email: credential.email, tenantId: membership.tenantId, role: membership.role },
    };
  }

  async logout(rawToken: string): Promise<boolean> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return false;
    const now = this.now();
    const tokenHash = sha256(rawToken);
    const revoked = await this.repository.revokeSession(tokenHash, now);
    if (revoked) await this.repository.appendAuthAudit({ event: 'SESSION_REVOKED', occurredAt: now });
    return revoked;
  }

  private validPassword(password: string): boolean {
    return typeof password === 'string' &&
      password.length >= MIN_PASSWORD_LENGTH &&
      password.length <= this.maxPasswordLength &&
      !/[\u0000-\u001f\u007f]/.test(password);
  }

  private async createSession(identity: AuthIdentity, now: number): Promise<AuthResult> {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    const expiresAt = now + this.sessionTtlMs;
    await this.repository.createSession({
      tokenHash: sha256(token),
      userId: identity.userId,
      tenantId: identity.tenantId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
    });
    return { ok: true, identity, sessionToken: token, expiresAt };
  }
}
