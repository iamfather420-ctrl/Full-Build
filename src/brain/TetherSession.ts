import { createHash } from 'node:crypto';
import type { TetherEdge } from './DaisyReasoningKernel';
import { selectTetherPath } from './TetherPath';

export interface NodeActivationResult {
  node_id: string;
  status: string;
  evidence?: unknown;
}

export interface ActivationRecord {
  nodeId: string;
  status: string;
  evidenceSha256: string;
  attempt: number;
}

export interface TetherSessionResult {
  activations: ActivationRecord[];
  isolated: string[];
  escalated: boolean;
  reachedGoal: boolean;
}

const SUCCESS = new Set(['SUCCESS']);

/**
 * Fires real node executors along caller-supplied tether edges.
 * A non-success is isolated. It is never rewritten as success.
 */
export async function runTetherSession(input: {
  edges: TetherEdge[];
  start: string;
  goal: string;
  execute: (nodeId: string) => Promise<NodeActivationResult>;
  maxActivations?: number;
}): Promise<TetherSessionResult> {
  const maxActivations = input.maxActivations ?? 8;
  const unavailable = new Set<string>();
  const seen = new Set<string>();
  const activations: ActivationRecord[] = [];
  const isolated: string[] = [];
  let escalated = false;

  while (activations.length < maxActivations) {
    const path = selectTetherPath(input.edges, input.start, input.goal, unavailable);
    if (!path) {
      escalated = isolated.length > 0;
      break;
    }
    let blocked = false;
    for (const nodeId of path) {
      if (seen.has(nodeId)) continue;
      if (activations.length >= maxActivations) {
        escalated = true;
        blocked = true;
        break;
      }
      seen.add(nodeId);
      const result = await input.execute(nodeId);
      const status = result.status;
      activations.push({
        nodeId,
        status,
        evidenceSha256: createHash('sha256').update(JSON.stringify(result.evidence ?? null)).digest('hex'),
        attempt: 1,
      });
      if (!SUCCESS.has(status)) {
        isolated.push(nodeId);
        unavailable.add(`${path[Math.max(0, path.indexOf(nodeId) - 1)]}->${nodeId}`);
        unavailable.add(nodeId);
        blocked = true;
        break;
      }
    }
    if (!blocked) return { activations, isolated, escalated: false, reachedGoal: true };
  }

  return { activations, isolated, escalated, reachedGoal: false };
}
