import { randomBytes } from 'node:crypto';

/** Configure ephemeral local auth only for verification runners. Never use in production. */
export function configureTestAuthEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Verification runner refused to enable local HS256 authentication in NODE_ENV=production.');
  }
  process.env.NODE_ENV = 'test';
  process.env.AUTH_MODE = 'local_hs256';
  if (!process.env.SOVEREIGN_AUTH_SECRET || process.env.SOVEREIGN_AUTH_SECRET.length < 32) {
    process.env.SOVEREIGN_AUTH_SECRET = randomBytes(32).toString('hex');
  }
}
