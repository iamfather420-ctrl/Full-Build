/**
 * Opt-in factory for first-party auth.
 *
 * Production login remains disabled until:
 * 1. migrations/005_daisy_first_party_auth.sql is applied on a disposable Neon branch
 * 2. RLS / least-privilege role is verified
 * 3. AUTH_ENABLED=true is set deliberately after integration tests pass
 * 4. Email adapter credentials and AUTH_PUBLIC_ORIGIN are configured
 *
 * AuthService.ts continues to reject local token minting; this factory does not
 * replace that fail-closed boundary automatically.
 */
import { FirstPartyAuth } from './FirstPartyAuth';
import { NeonFirstPartyAuthRepository } from './NeonFirstPartyAuthRepository';
import { DaisyAuthEmailDelivery } from './DaisyAuthEmailDelivery';
import { createFirstPartyAuthRouter } from './FirstPartyAuthRouter';
import type { Router } from 'express';

export function isFirstPartyAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === 'true';
}

export function tryCreateFirstPartyAuthRouter(): Router | null {
  if (!isFirstPartyAuthEnabled()) return null;

  const publicOrigin = process.env.AUTH_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN;
  const rateLimitPepper = process.env.AUTH_RATE_LIMIT_PEPPER;
  if (!publicOrigin || !rateLimitPepper) {
    throw new Error('BLOCKED: AUTH_ENABLED requires AUTH_PUBLIC_ORIGIN and AUTH_RATE_LIMIT_PEPPER.');
  }

  const repository = NeonFirstPartyAuthRepository.fromEnvironment();
  const email = DaisyAuthEmailDelivery.fromEnvironment();
  const auth = new FirstPartyAuth({
    repository,
    rateLimitPepper,
    publicOrigin,
    sendVerificationEmail: (to, url) => email.sendVerificationEmail(to, url),
    sendPasswordResetEmail: (to, url) => email.sendPasswordResetEmail(to, url),
  });

  return createFirstPartyAuthRouter(auth, publicOrigin);
}
