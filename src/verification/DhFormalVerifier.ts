/**
 * PROJECT AGATE / DAISY / SOLVEX
 * ISOLATED DH FORMAL THEOREM VERIFIER PATH (verify:dh-formal)
 *
 * Implements the isolated formal verification path for all 32 authentic DH records
 * (DH-P-001 through DH-P-032) from src/paradoxes/DHBootstrapParadoxRegistry.ts,
 * ensuring separation from the existing registry hash verification.
 */

export * from '../proofs/DHFormalVerifier';
export {
  DHFormalVerifier,
  DHFormalVerifier as DhFormalVerifier
} from '../proofs/DHFormalVerifier';

export type {
  DHFormalVerificationResult as DhFormalVerificationResult,
  DHReplayRecord as DhReplayRecord,
  DH32VerificationReport as Dh32VerificationReport,
  DHSmtMutationResult as DhSmtMutationResult,
  DHFailureInjectionResult as DhFailureInjectionResult,
  DHTamperTestResult as DhTamperTestResult
} from '../proofs/DHFormalVerifier';
