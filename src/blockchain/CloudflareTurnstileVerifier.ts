export interface CloudflareTurnstileConfig {
  secretKey: string;
  allowedHostnames: readonly string[];
  expectedAction?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface TurnstileVerificationResult {
  verified: boolean;
  hostname?: string;
  action?: string;
  errorCode?: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'SITEVERIFY_REJECTED' | 'HOSTNAME_MISMATCH' | 'ACTION_MISMATCH' | 'VERIFICATION_UNAVAILABLE';
}

interface SiteverifyResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Server-side Cloudflare Turnstile verifier.
 *
 * Call this from the server immediately before creating an approval session.
 * A successful CAPTCHA is only an anti-bot signal: it is not identity,
 * consent, an MMTAI authorization token, or an Ed25519 human-root signature.
 * Never expose the secret key or trust a client-supplied "verified" boolean.
 */
export class CloudflareTurnstileVerifier {
  private readonly fetchImpl: typeof fetch;
  private readonly allowedHostnames: Set<string>;
  private readonly expectedAction: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: CloudflareTurnstileConfig) {
    if (!config.secretKey.trim()) throw new Error('TURNSTILE_SECRET_KEY is required.');
    this.allowedHostnames = new Set(
      config.allowedHostnames.map(host => host.trim().toLowerCase()).filter(Boolean)
    );
    if (this.allowedHostnames.size === 0) {
      throw new Error('At least one exact Turnstile hostname allowlist entry is required.');
    }
    this.expectedAction = config.expectedAction ?? 'mmtai-human-root';
    if (!/^[a-z0-9_-]{1,32}$/i.test(this.expectedAction)) {
      throw new Error('Turnstile expected action is invalid.');
    }
    this.timeoutMs = config.timeoutMs ?? 5_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 500 || this.timeoutMs > 15_000) {
      throw new Error('Turnstile timeout must be between 500 and 15000 milliseconds.');
    }
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async verify(token: string, remoteIp?: string): Promise<TurnstileVerificationResult> {
    if (!token || token.length > 2_048 || /\s/.test(token)) {
      return { verified: false, errorCode: 'MISSING_TOKEN' };
    }

    const body = new URLSearchParams({
      secret: this.config.secretKey,
      response: token
    });
    if (remoteIp && isValidIpAddress(remoteIp)) body.set('remoteip', remoteIp);

    let response: Response;
    try {
      response = await this.fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch {
      return { verified: false, errorCode: 'VERIFICATION_UNAVAILABLE' };
    }
    if (!response.ok) return { verified: false, errorCode: 'VERIFICATION_UNAVAILABLE' };

    let result: SiteverifyResponse;
    try {
      result = await response.json() as SiteverifyResponse;
    } catch {
      return { verified: false, errorCode: 'VERIFICATION_UNAVAILABLE' };
    }
    if (result.success !== true) return { verified: false, errorCode: 'SITEVERIFY_REJECTED' };

    const hostname = typeof result.hostname === 'string' ? result.hostname.toLowerCase() : '';
    if (!this.allowedHostnames.has(hostname)) {
      return { verified: false, errorCode: 'HOSTNAME_MISMATCH' };
    }
    if (result.action !== this.expectedAction) {
      return { verified: false, errorCode: 'ACTION_MISMATCH' };
    }
    return { verified: true, hostname, action: result.action };
  }
}

function isValidIpAddress(value: string): boolean {
  // Avoid adding a dependency; only forward syntactically plausible IP literals.
  // Siteverify remains authoritative and the caller must not trust arbitrary proxy headers.
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) ||
    /^[0-9a-f:]+$/i.test(value);
}
