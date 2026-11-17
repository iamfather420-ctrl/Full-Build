export type ConfirmationDecision =
  | { mode: 'ASYMMETRIC' }
  | { mode: 'HMAC_LEGACY' }
  | { mode: 'REJECT'; error: string };

/**
 * HMAC is allowed only when no signing key was configured.
 * An invalid configured key is not a reason to fall back.
 * A configured asymmetric key never accepts an HMAC confirmation.
 */
export function selectConfirmationMode(input: {
  publicKeyConfigured: boolean;
  publicKeyValid: boolean;
  hasHeader: boolean;
  hasSignature: boolean;
  hasConfirmationHash: boolean;
}): ConfirmationDecision {
  if (input.publicKeyConfigured && !input.publicKeyValid) {
    return { mode: 'REJECT', error: 'SIGNER_PUBLIC_KEY_INVALID' };
  }
  if (input.publicKeyValid) {
    if (!input.hasHeader || !input.hasSignature) {
      return { mode: 'REJECT', error: 'ASYMMETRIC_SIGNATURE_REQUIRED' };
    }
    return { mode: 'ASYMMETRIC' };
  }
  if (input.hasConfirmationHash) return { mode: 'HMAC_LEGACY' };
  return { mode: 'REJECT', error: 'LEGACY_MODE: provide confirmationHash' };
}
