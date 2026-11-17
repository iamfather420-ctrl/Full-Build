import type { TetherEdge } from './DaisyReasoningKernel';

/**
 * Traverses caller-supplied tether edges. It does not contain or invent the
 * canonical 120-synapse topology.
 */
export function selectTetherPath(edges: TetherEdge[], start: string, goal: string, unavailable: ReadonlySet<string> = new Set()): string[] | null {
  const open: string[][] = [[start]];
  const seen = new Set<string>([start]);
  while (open.length > 0) {
    const path = open.shift()!;
    const current = path[path.length - 1];
    if (current === goal) return path;
    for (const edge of edges) {
      if (unavailable.has(edge.from) || unavailable.has(edge.to) || unavailable.has(`${edge.from}->${edge.to}`)) continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : null;
      if (!next || seen.has(next)) continue;
      seen.add(next);
      open.push([...path, next]);
    }
  }
  return null;
}
