import type { TetherEdge } from './DaisyReasoningKernel';

/** Paradoxes whose existing cognitive nodes already call a catalog solver. This is not the other 115 records. */
export const EXECUTABLE_PARADOXES = [
  { paradoxCode: 'DH-P-001', theorem: 'THM-ZENO-ARCHIMEDEAN-06', nodeId: 'DN-24' },
  { paradoxCode: 'DH-P-002', theorem: 'THM-RUSSELL-01', nodeId: 'DN-21' },
  { paradoxCode: 'DH-P-003', theorem: 'THM-BARBER-02', nodeId: 'DN-22' },
  { paradoxCode: 'DH-P-004', theorem: 'THM-LIAR-03', nodeId: 'DN-26' },
  { paradoxCode: 'DH-P-005', theorem: 'THM-CURRY-04', nodeId: 'DN-23' },
] as const;

export function paradoxSolverEdges(): TetherEdge[] {
  return EXECUTABLE_PARADOXES.map((item) => ({
    from: 'DN-20',
    to: item.nodeId,
    relation: item.paradoxCode,
  }));
}
