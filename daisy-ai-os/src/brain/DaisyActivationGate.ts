/**
 * Single source of truth for Daisy activation evidence.
 * Never substitute embedded or synthetic ACTIVE records for commit-bound proof.
 */
export { DaisyActivationGate } from '../../../src/brain/DaisyActivationGate.ts';
export type {
  DaisyActivationGateRecord,
  DaisyActivationStatus,
} from '../../../src/brain/DaisyActivationGate.ts';
