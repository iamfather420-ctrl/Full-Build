import crypto from 'crypto';
import { DaisyActivationGate } from './DaisyActivationGate';

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

    const candidate_id = 'DAISY-C-' + crypto
      .createHash('sha256')
      .update(JSON.stringify({ problemId, components, tetherEdges, rationale }))
      .digest('hex')
      .slice(0, 20)
      .toUpperCase();

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
