import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 12;
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const VERIFY_TTL_SECONDS = 60 * 60 * 24;
const RESET_TTL_SECONDS = 60 * 30;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;\n// Fixed valid dummy hash ensures unknown-account login still performs the same scrypt work.\nconst DUMMY_PASSWORD_HASH = 'scrypt$32768$8$1$ZGFpc3ktZHVtbXktc2FsdCE$r1-vnCfsq20jXzVaz1L6IKRtJNO0V079qAiH4neInNsDsjZ53_Ek8PYnbuB95XwAfSOD4neDqsqUYB36QkfCOw';

export type FirstPartyRole = 'OWNER' | 'ADMIN' | 'VERIFIER' | 'CUSTOMER';

export interface FirstPartyAccount {
  id: string;
  tenantId: string;
  normalizedEmail: string;
  passwordHash: string;
  role: FirstPartyRole;
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
}

export interface FirstPartySession {
  id: string;
  accountId: string;
  tenantId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AuthRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * The adapter MUST use durable shared storage and atomic/transactional operations.
 * Never implement this interface with process memory in production.
 */
export interface FirstPartyAuthRepository {
  findAccountByEmail(normalizedEmail: string): Promise<FirstPartyAccount | null>;
  findAccountById(id: string): Promise<FirstPartyAccount | null>;
  createUnverifiedAccount(input: {
    normalizedEmail: string;
    passwordHash: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
    now: Date;
  }): Promise<{ account: FirstPartyAccount; created: boolean }>;
  consumeRateLimit(keyHash: string, now: Date): Promise<AuthRateLimitResult>;
  createSession(input: {
    accountId: string;
    tenantId: string;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
  }): Promise<FirstPartySession>;
  findSessionByTokenHash(tokenHash: string): Promise<FirstPartySession | null>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeAllSessions(accountId: string, revokedAt: Date): Promise<void>;
  consumeVerificationToken(tokenHash: string, now: Date): Promise<FirstPartyAccount | null>;
  consumePasswordResetToken(tokenHash: string, now: Date): Promise<FirstPartyAccount | null>;
  replacePasswordAndRevokeSessions(accountId: string, passwordHash: string, changedAt: Date): Promise<void>;
  createPasswordResetToken(input: {
    accountId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void>;
}

export interface FirstPartyAuthConfig {
  repository: FirstPartyAuthRepository;
  /** Secret-manager value, minimum 32 random bytes encoded as hex/base64. */
  rateLimitPepper: string;
  /** Absolute origin, e.g. https://uarefake.space. Never accept this from a request header. */
  publicOrigin: string;
  /** Email delivery must be implemented by a trusted server-side adapter. */
  sendVerificationEmail: (email: string, verificationUrl: string) => Promise<void>;
  sendPasswordResetEmail: (email: string, resetUrl: string) => Promise<void>;
}

export interface SessionCredential {
  /** Return only as a Secure, HttpOnly, SameSite=Lax cookie over HTTPS. */
  cookieValue: string;
  expiresAt: Date;
}

export interface SafeAccount {
  id: string;
  tenantId: string;
  email: string;
  role: FirstPartyRole;
  emailVerified: boolean;
}

export class FirstPartyAuthError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'INVALID_CREDENTIALS'
      | 'RATE_LIMITED'
      | 'EMAIL_NOT_VERIFIED'
      | 'ACCOUNT_DISABLED'
      | 'INVALID_OR_EXPIRED_TOKEN'
      | 'AUTH_NOT_CONFIGURED',
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'FirstPartyAuthError';
  }
}

function normalizeEmail(email: string): string {
  if (typeof email !== 'string' || email.length > EMAIL_MAX_LENGTH) {
    throw new FirstPartyAuthError('INVALID_INPUT', 'Enter a valid email address.');
  }
  const normalized = email.trim().normalize('NFKC').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new FirstPartyAuthError('INVALID_INPUT', 'Enter a valid email address.');
  }
  return normalized;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeAccount(account: FirstPartyAccount): SafeAccount {
  return {
    id: account.id,
    tenantId: account.tenantId,
    email: account.normalizedEmail,
    role: account.role,
    emailVerified: account.emailVerifiedAt !== null,
  };
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, SCRYPT_KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })) as Buffer;
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nText, rText, pText, saltText, keyText] = parts;
  const n = Number(nText), r = Number(rText), p = Number(pText);
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(keyText, 'base64url');
    if (salt.length !== 16 || expected.length !== SCRYPT_KEY_BYTES) return false;
    const actual = (await scrypt(password, salt, expected.length, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    })) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * First-party credential/session core. This module does not enable any HTTP route,
 * create privileged roles, or claim production readiness. Storage and mail delivery
 * are injected so a deployment cannot silently fall back to process-local state.
 */
export class FirstPartyAuth {
  private readonly repository: FirstPartyAuthRepository;
  private readonly rateLimitPepper: string;
  private readonly publicOrigin: URL;
  private readonly sendVerificationEmail: FirstPartyAuthConfig['sendVerificationEmail'];
  private readonly sendPasswordResetEmail: FirstPartyAuthConfig['sendPasswordResetEmail'];

  constructor(config: FirstPartyAuthConfig) {
    if (!config || !config.repository || !config.rateLimitPepper || Buffer.byteLength(config.rateLimitPepper) < 32) {
      throw new FirstPartyAuthError('AUTH_NOT_CONFIGURED', 'Durable auth storage and a 32-byte rate-limit pepper are required.');
    }
    let origin: URL;
    try {
      origin = new URL(config.publicOrigin);
    } catch {
      throw new FirstPartyAuthError('AUTH_NOT_CONFIGURED', 'A trusted public origin is required.');
    }
    if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
      throw new FirstPartyAuthError('AUTH_NOT_CONFIGURED', 'Authentication requires HTTPS outside localhost.');
    }
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new FirstPartyAuthError('AUTH_NOT_CONFIGURED', 'Public origin must contain only scheme and host.');
    }
    this.repository = config.repository;
    this.rateLimitPepper = config.rateLimitPepper;
    this.publicOrigin = origin;
    this.sendVerificationEmail = config.sendVerificationEmail;
    this.sendPasswordResetEmail = config.sendPasswordResetEmail;
  }

  private async rateLimit(scope: string, value: string): Promise<void> {
    const keyHash = sha256(this.rateLimitPepper + ':' + scope + ':' + value);
    const result = await this.repository.consumeRateLimit(keyHash, new Date());
    if (!result.allowed) {
      throw new FirstPartyAuthError('RATE_LIMITED', 'Too many attempts. Try again later.', result.retryAfterSeconds);
    }
  }

  async register(email: string, password: string): Promise<{ accepted: true }> {
    const normalizedEmail = normalizeEmail(email);
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > 1024) {
      throw new FirstPartyAuthError('INVALID_INPUT', 'Password must be at least 12 characters and no more than 1024 bytes.');
    }
    await this.rateLimit('register', normalizedEmail);
    const passwordHash = await hashPassword(password);
    const rawToken = randomToken();
    const now = new Date();
    const result = await this.repository.createUnverifiedAccount({
      normalizedEmail,
      passwordHash,
      verificationTokenHash: sha256(rawToken),
      verificationExpiresAt: new Date(now.getTime() + VERIFY_TTL_SECONDS * 1000),
      now,
    });
    // Same response for existing and new addresses prevents account enumeration.
    if (result.created) {
      const verificationUrl = new URL('/auth/verify-email', this.publicOrigin);
      verificationUrl.searchParams.set('token', rawToken);
      await this.sendVerificationEmail(normalizedEmail, verificationUrl.toString());
    }
    return { accepted: true };
  }

  async verifyEmail(rawToken: string): Promise<SafeAccount> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(rawToken)) {
      throw new FirstPartyAuthError('INVALID_OR_EXPIRED_TOKEN', 'Verification link is invalid or expired.');
    }
    const account = await this.repository.consumeVerificationToken(sha256(rawToken), new Date());
    if (!account || !account.emailVerifiedAt) {
      throw new FirstPartyAuthError('INVALID_OR_EXPIRED_TOKEN', 'Verification link is invalid or expired.');
    }
    return safeAccount(account);
  }

  async login(email: string, password: string, sourceIdentifier: string): Promise<{ account: SafeAccount; session: SessionCredential }> {
    const normalizedEmail = normalizeEmail(email);
    if (typeof sourceIdentifier !== 'string' || sourceIdentifier.length < 8 || sourceIdentifier.length > 256) {
      throw new FirstPartyAuthError('INVALID_INPUT', 'A trusted login source identifier is required.');
    }
    await this.rateLimit('login-email', normalizedEmail);
    await this.rateLimit('login-source', sourceIdentifier);
    const account = await this.repository.findAccountByEmail(normalizedEmail);
    // Perform a real scrypt verification even for unknown accounts to reduce timing leaks.
    const passwordMatches = await verifyPassword(
      typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 1024 ? password : '',
      account?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!account || !passwordMatches) {
      throw new FirstPartyAuthError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    if (account.disabledAt) throw new FirstPartyAuthError('ACCOUNT_DISABLED', 'This account is disabled.');
    if (!account.emailVerifiedAt) throw new FirstPartyAuthError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in.');
    const rawToken = randomToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    await this.repository.createSession({
      accountId: account.id,
      tenantId: account.tenantId,
      tokenHash: sha256(rawToken),
      createdAt: now,
      expiresAt,
    });
    return { account: safeAccount(account), session: { cookieValue: rawToken, expiresAt } };
  }

  async authenticateSession(rawToken: string): Promise<SafeAccount | null> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(rawToken)) return null;
    const session = await this.repository.findSessionByTokenHash(sha256(rawToken));
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    const account = await this.repository.findAccountById(session.accountId);
    if (!account || account.disabledAt || !account.emailVerifiedAt) return null;
    // Session tenant binding is immutable: never trust a tenant id from the client.
    if (!constantTimeStringEqual(session.tenantId, account.tenantId)) return null;
    return safeAccount(account);
  }

  async logout(rawToken: string): Promise<void> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(rawToken)) return;
    const session = await this.repository.findSessionByTokenHash(sha256(rawToken));
    if (session && !session.revokedAt) await this.repository.revokeSession(session.id, new Date());
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true }> {
    const normalizedEmail = normalizeEmail(email);
    await this.rateLimit('password-reset', normalizedEmail);
    const account = await this.repository.findAccountByEmail(normalizedEmail);
    // Identical response for known/unknown emails prevents account enumeration.
    if (account && account.emailVerifiedAt && !account.disabledAt) {
      const rawToken = randomToken();
      const now = new Date();
      await this.repository.createPasswordResetToken({
        accountId: account.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(now.getTime() + RESET_TTL_SECONDS * 1000),
        createdAt: now,
      });
      const resetUrl = new URL('/auth/reset-password', this.publicOrigin);
      resetUrl.searchParams.set('token', rawToken);
      await this.sendPasswordResetEmail(normalizedEmail, resetUrl.toString());
    }
    return { accepted: true };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (typeof rawToken !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(rawToken) ||
        typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN_LENGTH ||
        Buffer.byteLength(newPassword, 'utf8') > 1024) {
      throw new FirstPartyAuthError('INVALID_OR_EXPIRED_TOKEN', 'Reset link or new password is invalid or expired.');
    }
    const account = await this.repository.consumePasswordResetToken(sha256(rawToken), new Date());
    if (!account || account.disabledAt || !account.emailVerifiedAt) {
      throw new FirstPartyAuthError('INVALID_OR_EXPIRED_TOKEN', 'Reset link or new password is invalid or expired.');
    }
    await this.repository.replacePasswordAndRevokeSessions(account.id, await hashPassword(newPassword), new Date());
  }
}
