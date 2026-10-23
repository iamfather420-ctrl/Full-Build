/**
 * Minimal first-party email delivery adapter for Daisy auth.
 *
 * Uses Resend's HTTPS API with native fetch; no provider SDK or client-side secret.
 * Configure AUTH_EMAIL_API_KEY and AUTH_EMAIL_FROM only in server-side secret storage.
 * This adapter deliberately fails closed when credentials are absent or delivery fails.
 */
export interface DaisyAuthEmailConfig {
  apiKey: string;
  from: string;
  apiBaseUrl?: string;
}

export class DaisyAuthEmailDelivery {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly apiBaseUrl: string;

  constructor(config: DaisyAuthEmailConfig) {
    if (!config || !config.apiKey?.trim() || !config.from?.trim()) {
      throw new Error('BLOCKED: email API key and verified sender are required.');
    }
    const base = new URL(config.apiBaseUrl ?? 'https://api.resend.com');
    if (base.protocol !== 'https:' || base.username || base.password) {
      throw new Error('BLOCKED: email API endpoint must use HTTPS without embedded credentials.');
    }
    this.apiKey = config.apiKey;
    this.from = config.from;
    this.apiBaseUrl = base.origin;
  }

  static fromEnvironment(): DaisyAuthEmailDelivery {
    return new DaisyAuthEmailDelivery({
      apiKey: process.env.AUTH_EMAIL_API_KEY ?? '',
      from: process.env.AUTH_EMAIL_FROM ?? '',
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
    if (url.protocol !== 'https:' || url.origin !== 'https://uarefake.space' ||
        url.username || url.password || url.hash) {
      throw new Error('BLOCKED: auth email links must use the canonical HTTPS origin.');
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
      // Do not log or propagate provider bodies that might contain sensitive information.
      throw new Error(`Email delivery failed with provider status ${response.status}.`);
    }
  }
}
