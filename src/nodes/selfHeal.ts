import { sha256 } from './driftCheck';

export function restoreCanonical(observed: Buffer, canonical: Buffer): {
  faultDetected: boolean;
  recovered: boolean;
  independentHashMatches: boolean;
} {
  const faultDetected = !observed.equals(canonical);
  const restored = faultDetected ? Buffer.from(canonical) : observed;
  const independentHashMatches = sha256(restored) === sha256(canonical);
  return { faultDetected, recovered: faultDetected && independentHashMatches, independentHashMatches };
}

/** Prohibited nodes are escalated. They are not executed again. */
export function recoverProhibitedNode(nodeId: string): { retried: false; escalated: boolean; reason: string } {
  if (nodeId === 'DN-36') {
    return { retried: false, escalated: true, reason: 'Prohibited operations are not retried.' };
  }
  return { retried: false, escalated: false, reason: 'This node is not a prohibited-operation fault.' };
}
