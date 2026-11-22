/**
 * Minimal first-party email delivery adapter for Daisy auth.
 *
 * Uses Resend's HTTPS API with native fetch; no provider SDK or client-side secret.
 * Configure AUTH_EMAIL_API_KEY and AUTH_EMAIL_FROM only in server-side secret storage.
 * Fails closed when credentials are absent or delivery fails.
 * Link origin must match the configured public origin (AUTH_PUBLIC_ORIGIN).
 */
export interface DaisyAuthEmailConfig {
  apiKey: string;
  from: string;
  /** Scheme + host only, e.g. https://uarefake.space — never from request headers. */
  publicOrigin: string;
  apiBaseUrl?: string;
}

export class DaisyAuthEmailDelivery {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly publicOrigin: URL;
  private readonly apiBaseUrl: string;

  constructor(config: DaisyAuthEmailConfig) {
    if (!config || !config.apiKey?.trim() || !config.from?.trim() || !config.publicOrigin?.trim()) {
      throw new Error('BLOCKED: email API key, verified sender, and public origin are required.');
    }
    const origin = new URL(config.publicOrigin);
    if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
      throw new Error('BLOCKED: auth email links require HTTPS outside localhost.');
    }
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      throw new Error('BLOCKED: public origin must contain only scheme and host.');
    }
    const base = new URL(config.apiBaseUrl ?? 'https://api.resend.com');
    if (base.protocol !== 'https:' || base.username || base.password) {
      throw new Error('BLOCKED: email API endpoint must use HTTPS without embedded credentials.');
    }
    this.apiKey = config.apiKey;
    this.from = config.from;
    this.publicOrigin = origin;
    this.apiBaseUrl = base.origin;
  }

  static fromEnvironment(): DaisyAuthEmailDelivery {
    return new DaisyAuthEmailDelivery({
      apiKey: process.env.AUTH_EMAIL_API_KEY ?? '',
      from: process.env.AUTH_EMAIL_FROM ?? '',
      publicOrigin: process.env.AUTH_PUBLIC_ORIGIN ?? process.env.PUBLIC_ORIGIN ?? '',
    });
  }

  async sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Verify your Daisy account',
      text: `Use this one-time link to verify your Daisy account. It expires in 24 hours. If you did not request this, ignore this email.\n\n${this.validateLink(verificationUrl)}`,
    });
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Reset your Daisy password',
      text: `Use this one-time link to reset your Daisy password. It expires in 30 minutes. If you did not request this, ignore this email.\n\n${this.validateLink(resetUrl)}`,
    });
  }

  private validateLink(value: string): string {
    const url = new URL(value);
    if (url.origin !== this.publicOrigin.origin || url.username || url.password || url.hash) {
      throw new Error('BLOCKED: auth email links must use the configured public origin.');
    }
    return url.toString();
  }

  private async send(message: { to: string; subject: string; text: string }): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Email delivery failed with provider status ${response.status}.`);
    }
  }
}
