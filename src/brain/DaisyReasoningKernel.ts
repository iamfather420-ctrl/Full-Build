import { DaisyActivationGate } from './DaisyActivationGate';

function simpleHash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c64e6d ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export type ReasoningComponentKind = 'PARADOX' | 'SOLUTION' | 'INVARIANT' | 'CONSTRAINT' | 'EVIDENCE' | 'FAILURE' | 'TETHER';

export interface ReasoningComponent {
  id: string;
  kind: ReasoningComponentKind;
  verified: boolean;
  provenance?: string;
  relevance?: number;
}

export interface TetherEdge {
  from: string;
  to: string;
  relation: string;
  strength?: number;
}

export interface CompositeCandidate {
  candidate_id: string;
  problem_id: string;
  components: ReasoningComponent[];
  tether_edges: TetherEdge[];
  rationale: string;
  status: 'HYPOTHESIS' | 'CANDIDATE' | 'VERIFICATION_PENDING';
  requires_fresh_verification: true;
  created_at: string;
}

export interface VerificationFeedback {
  candidate_id: string;
  status: 'VERIFIED' | 'FAILED' | 'PARTIAL' | 'HOLD' | 'UNKNOWN';
  evidence: unknown[];
  failures: string[];
}

export class DaisyReasoningKernel {
  public proposeCompositeCandidate(
    problemId: string,
    components: ReasoningComponent[],
    tetherEdges: TetherEdge[],
    rationale: string
  ): CompositeCandidate {
    DaisyActivationGate.assertActive();

    if (components.length === 0) {
      throw new Error('DAISY_REASONING_REJECTED: composite candidate requires at least one component');
    }

    const candidate_id = 'DAISY-C-' + simpleHash(
      JSON.stringify({ problemId, components, tetherEdges, rationale })
    ).toUpperCase();

    return {
      candidate_id,
      problem_id: problemId,
      components,
      tether_edges: tetherEdges,
      rationale,
      status: 'VERIFICATION_PENDING',
      requires_fresh_verification: true,
      created_at: new Date().toISOString()
    };
  }

  public consumeVerificationFeedback(feedback: VerificationFeedback): {
    next_state: 'SEAL' | 'REASON_AGAIN';
    feedback: VerificationFeedback;
  } {
    DaisyActivationGate.assertActive();

    if (feedback.status === 'VERIFIED') {
      return { next_state: 'SEAL', feedback };
    }

    return { next_state: 'REASON_AGAIN', feedback };
  }
}
