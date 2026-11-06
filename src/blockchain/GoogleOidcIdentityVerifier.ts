export interface GoogleOidcIdentity {
  subject: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
  issuer: 'https://accounts.google.com';
}

export interface GoogleOidcIdentityVerifierConfig {
  clientId: string;
  /** Exact email allowlist for human-root eligibility; never accept a caller-supplied email. */
  allowedEmails: readonly string[];
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface GoogleTokenInfo {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string | number;
  name?: string;
  picture?: string;
}

/**
 * Verifies a Google OpenID Connect ID token using Google's tokeninfo endpoint.
 *
 * This proves the Google account identity represented by the token, not that the
 * person approved an operation. Application authorization and the separate,
 * exact-scope Ed25519 human-root signature remain mandatory.
 *
 * Deploy only server-side. Do not log or persist the raw ID token.
 */
export class GoogleOidcIdentityVerifier {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly allowedEmails: Set<string>;

  constructor(private readonly config: GoogleOidcIdentityVerifierConfig) {
    if (!config.clientId.trim()) throw new Error('GOOGLE_OIDC_CLIENT_ID is required.');
    if (!config.allowedEmails.length) throw new Error('A non-empty human-root Google email allowlist is required.');
    this.allowedEmails = new Set(config.allowedEmails.map(email => email.trim().toLowerCase()).filter(Boolean));
    if (!this.allowedEmails.size) throw new Error('Human-root Google email allowlist contains no valid addresses.');
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? Date.now;
  }

  async verifyIdToken(idToken: string): Promise<GoogleOidcIdentity | null> {
    if (!idToken || idToken.length > 16_384 || /\\s/.test(idToken)) return null;

    let response: Response;
    try {
      const url = new URL('https://oauth2.googleapis.com/tokeninfo');
      url.searchParams.set('id_token', idToken);
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5_000)
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;

    let info: GoogleTokenInfo;
    try {
      info = await response.json() as GoogleTokenInfo;
    } catch {
      return null;
    }

    const issuerValid = info.iss === 'https://accounts.google.com' || info.iss === 'accounts.google.com';
    const expiry = Number(info.exp);
    const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
    const verified = info.email_verified === true || info.email_verified === 'true';
    if (
      !issuerValid ||
      info.aud !== this.config.clientId ||
      !info.sub ||
      !Number.isFinite(expiry) ||
      expiry * 1000 <= this.now() ||
      !verified ||
      !this.allowedEmails.has(email)
    ) return null;

    return {
      subject: info.sub,
      email,
      emailVerified: true,
      ...(typeof info.name === 'string' ? { name: info.name } : {}),
      ...(typeof info.picture === 'string' ? { picture: info.picture } : {}),
      issuer: 'https://accounts.google.com'
    };
  }
}
