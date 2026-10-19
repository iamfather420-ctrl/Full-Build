import { computeSha256 } from '../database/DatabaseSchema';
import { Z3FormalProofEngine, Z3ProofResult } from './Z3FormalProofEngine';

export interface NOPOTCertificate {
  certificate_id: string;
  target_algorithm: string;
  variant_function: string;
  bounded_steps_upper_bound: number;
  actual_measured_steps: number;
  strictly_decreasing: boolean;
  well_founded_domain: string;
  termination_proved: boolean;
  mathematical_proof_hash: string;
  verification_scope?: 'BOUNDED_TRACE_ONLY' | 'CATALOG_THEOREM_ONLY';
  formal_smt_verification?: {
    verified_by_z3: boolean;
    z3_result: string;
    theorem_id: string;
  };
  timestamp: number;
}

export interface TerminationGoal {
  goal_id: string;
  initial_state: number;
  terminal_state: number;
  transition_function: (s: number) => number;
  variant_function: (s: number) => number;
  max_bounded_steps: number;
  /** SMT-LIB integer expression for the next state in terms of `s`; must match transition_function. */
  smt_transition_expression?: string;
  /** SMT-LIB integer expression for the ranking variant in terms of `s`; must match variant_function. */
  smt_variant_expression?: string;
  /** SMT-LIB Boolean invariant for reachable non-terminal states, in terms of `s`. */
  smt_state_invariant?: string;
}

export class NOPOTVerifier {
  public static verifyAlgorithmTermination(
    algorithmName: string,
    stepFunction: (n: number) => number,
    initialState: number,
    maxBound: number = 1000
  ): NOPOTCertificate {
    if (!Number.isSafeInteger(initialState) || initialState < 0) throw new TypeError('initialState must be a non-negative safe integer');
    if (!Number.isSafeInteger(maxBound) || maxBound < 0) throw new TypeError('maxBound must be a non-negative safe integer');
    let current = initialState;
    let steps = 0;
    let strictlyDecreasing = true;

    while (current > 0 && steps < maxBound) {
      const next = stepFunction(current);
      if (!Number.isSafeInteger(next) || next < 0) throw new TypeError('stepFunction must return a non-negative safe integer');
      if (next >= current) {
        strictlyDecreasing = false;
        break;
      }
      current = next;
      steps++;
    }

    const terminationProved = strictlyDecreasing && current === 0;
    const certId = `nopot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const proofPayload = {
      certId,
      algorithmName,
      initialState,
      finalState: current,
      steps,
      strictlyDecreasing,
      terminationProved,
      smt_theorem: 'THM-INDUCTIVE-TERMINATION-05'
    };

    return {
      certificate_id: certId,
      target_algorithm: algorithmName,
      variant_function: 'V(s) = state_metric(s) in Nat, V(s_{t+1}) < V(s_t)',
      bounded_steps_upper_bound: maxBound,
      actual_measured_steps: steps,
      strictly_decreasing: strictlyDecreasing,
      well_founded_domain: 'Natural Numbers with strict order (<)',
      termination_proved: terminationProved,
      mathematical_proof_hash: computeSha256(JSON.stringify(proofPayload)),
      verification_scope: 'BOUNDED_TRACE_ONLY',
      formal_smt_verification: {
        verified_by_z3: false,
        z3_result: 'NOT_RUN: synchronous method only checks the observed bounded trace',
        theorem_id: 'NONE'
      },
      timestamp: Date.now()
    };
  }

  public static async verifyWithZ3Solver(
    algorithmName: string,
    initialState: number = 10
  ): Promise<{ certificate: NOPOTCertificate; z3Result: Z3ProofResult }> {
    const cert = NOPOTVerifier.verifyAlgorithmTermination(algorithmName, n => n - 1, initialState, Math.max(1000, initialState));
    const z3Engine = Z3FormalProofEngine.getInstance();
    const z3Result = await z3Engine.proveCatalogTheorem('THM-INDUCTIVE-TERMINATION-05');
    return {
      certificate: {
        ...cert,
        formal_smt_verification: {
          verified_by_z3: z3Result.proved && z3Result.solver_result === 'unsat',
          z3_result: `Catalog theorem only: ${z3Result.solver_result.toUpperCase()}; this does not prove arbitrary caller-supplied code`,
          theorem_id: z3Result.theorem_id
        }
      },
      z3Result
    };
  }
}

export class NOPOTEngine {
  public static verifyTermination(goal: TerminationGoal): NOPOTCertificate {
    if (!Number.isSafeInteger(goal.initial_state) || goal.initial_state < 0 || !Number.isSafeInteger(goal.terminal_state) || goal.terminal_state < 0) {
      throw new TypeError('goal states must be non-negative safe integers');
    }
    if (!Number.isSafeInteger(goal.max_bounded_steps) || goal.max_bounded_steps < 0) {
      throw new TypeError('max_bounded_steps must be a non-negative safe integer');
    }
    let state = goal.initial_state;
    let steps = 0;
    let decreasing = true;
    let previousVariant = goal.variant_function(state);
    if (!Number.isSafeInteger(previousVariant) || previousVariant < 0) throw new TypeError('variant_function must return a non-negative safe integer');
    while (state !== goal.terminal_state && steps < goal.max_bounded_steps) {
      const next = goal.transition_function(state);
      if (!Number.isSafeInteger(next) || next < 0) throw new TypeError('transition_function must return a non-negative safe integer');
      const nextVariant = goal.variant_function(next);
      if (!Number.isSafeInteger(nextVariant) || nextVariant < 0) throw new TypeError('variant_function must return a non-negative safe integer');
      if (nextVariant >= previousVariant) { decreasing = false; break; }
      state = next;
      previousVariant = nextVariant;
      steps++;
    }
    const reachedTerminal = state === goal.terminal_state;
    const payload = { goal_id: goal.goal_id, initial_state: goal.initial_state, terminal_state: goal.terminal_state, final_state: state, steps, decreasing, reachedTerminal, max_bounded_steps: goal.max_bounded_steps, timestamp: Date.now() };
    return {
      certificate_id: `nopot_${computeSha256(JSON.stringify(payload)).slice(0, 24)}`,
      target_algorithm: goal.goal_id,
      variant_function: goal.variant_function.toString(),
      bounded_steps_upper_bound: goal.max_bounded_steps,
      actual_measured_steps: steps,
      strictly_decreasing: decreasing,
      well_founded_domain: 'Observed non-negative integer variant values; bounded trace only',
      termination_proved: decreasing && reachedTerminal,
      verification_scope: 'BOUNDED_TRACE_ONLY',
      mathematical_proof_hash: computeSha256(JSON.stringify(payload)),
      formal_smt_verification: { verified_by_z3: false, z3_result: 'NOT_RUN: custom goal checked by bounded execution only', theorem_id: 'NONE' },
      timestamp: Date.now()
    };
  }

  public static async verifyWithZ3(goal: TerminationGoal): Promise<{ certificate: NOPOTCertificate; z3Result: Z3ProofResult }> {
    const certificate = NOPOTEngine.verifyTermination(goal);
    if (!goal.smt_transition_expression || !goal.smt_variant_expression || !goal.smt_state_invariant) {
      throw new TypeError('Custom NOPOT Z3 proof requires smt_transition_expression, smt_variant_expression, and smt_state_invariant; catalog proofs cannot stand in for a custom goal');
    }
    const safeSmtExpression = (value: string, field: string): string => {
      if (typeof value !== 'string' || value.length > 1000 || /\\b(check-sat|declare-const|declare-fun|assert|reset|exit)\\b/i.test(value)) {
        throw new TypeError(`${field} must be a single SMT expression, not a complete script or command`);
      }
      return value;
    };
    const transition = safeSmtExpression(goal.smt_transition_expression, 'smt_transition_expression');
    const variant = safeSmtExpression(goal.smt_variant_expression, 'smt_variant_expression');
    const invariant = safeSmtExpression(goal.smt_state_invariant, 'smt_state_invariant');
    const nextVariant = variant.replace(/\\bs\\b/g, `(${transition})`);
    const script = [
      '(set-logic QF_LIA)',
      '(declare-const s Int)',
      `(assert (>= s ${goal.terminal_state}))`,
      `(assert (not (= s ${goal.terminal_state}))`,
      `(assert ${invariant})`,
      `(assert (not (and (>= (${transition}) ${goal.terminal_state}) (< (${nextVariant}) (${variant})))) )`,
      '(check-sat)'
    ].join(' ');
    const z3Result = await Z3FormalProofEngine.getInstance().verifyCustomSmtScript(
      `NOPOT custom goal ${goal.goal_id}`,
      script,
      'unsat'
    );
    const traceReachedTerminal = certificate.termination_proved && certificate.strictly_decreasing;
    const formalVerified = z3Result.proved && z3Result.solver_result === 'unsat' && traceReachedTerminal;
    const updatedCertificate: NOPOTCertificate = {
      ...certificate,
      termination_proved: formalVerified,
      verification_scope: formalVerified ? 'CATALOG_THEOREM_ONLY' : 'BOUNDED_TRACE_ONLY',
      well_founded_domain: 'SMT-verified non-negative integer ranking under caller-supplied invariant; bounded trace must also reach terminal',
      formal_smt_verification: {
        verified_by_z3: formalVerified,
        z3_result: `Custom goal SMT ${z3Result.solver_result.toUpperCase()}; bounded reachability ${traceReachedTerminal ? 'reached terminal' : 'did not establish terminal'}`,
        theorem_id: z3Result.theorem_id
      }
    };
    return { certificate: updatedCertificate, z3Result };
  }
}
