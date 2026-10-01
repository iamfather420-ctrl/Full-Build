import { REAL_32_DH_FORMAL_REGISTRY, DHFormalContract, DHScope } from '../data/dhParadoxFormalRegistry';
import { computeSha256 } from '../database/DatabaseSchema';

export interface DHFormalVerificationResult {
  case_id: string;
  name: string;
  domain: string;
  statement: string;
  formal_proposition: string;
  assumptions: string[];
  expected_result: 'unsat' | 'sat' | 'unknown' | 'error';
  actual_result: 'unsat' | 'sat' | 'unknown' | 'error';
  replay_result: 'unsat' | 'sat' | 'unknown' | 'error';
  replay_match: boolean;
  verified: boolean;
  solver: string;
  solver_version: string;
  execution_id: string;
  commit_sha: string;
  source_hash: string;
  contract_hash: string;
  evidence_hash: string;
  scope: DHScope;
  duration_ms: number;
  timestamp: string;
  error?: string;
}

export interface DHReplayRecord {
  case_id: string;
  original_result: string;
  replay_result: string;
  replay_match: boolean;
  original_evidence_hash: string;
  replay_evidence_hash: string;
  cleanroom_context_id: string;
}

export interface DH32VerificationReport {
  execution_id: string;
  timestamp: string;
  commit_sha: string;
  total_cases: number;
  attempted: number;
  executed: number;
  expected_result_matches: number;
  cleanroom_replays: number;
  replay_matches: number;
  sat_count: number;
  unsat_count: number;
  unknown_count: number;
  error_count: number;
  solver: string;
  solver_version: string;
  verification_root_sha256: string;
  overall_status: 'VERIFIED' | 'FAILED' | 'PARTIAL';
  results: DHFormalVerificationResult[];
  replays: DHReplayRecord[];
}

export interface DHSmtMutationResult {
  test_name: string;
  target_case_id: string;
  mutation_type: string;
  original_assertion: string;
  mutated_assertion: string;
  expected_original_result: string;
  observed_original_result: string;
  expected_mutated_result: string;
  observed_mutated_result: string;
  mutation_detected: boolean;
  passed: boolean;
  details: string;
}

export interface DHFailureInjectionResult {
  test_name: string;
  injection_type: 'MALFORMED_SMT' | 'CORRUPTED_CONTRACT_HASH' | 'UNEXPECTED_SOLVER_STATE';
  input_assertion: string;
  observed_result: string;
  verified_status: boolean;
  fail_closed_enforced: boolean;
  passed: boolean;
  notes: string;
}

export interface DHTamperTestResult {
  test_name: string;
  original_hash: string;
  tampered_hash: string;
  tamper_detected: boolean;
  passed: boolean;
  alarm_triggered: boolean;
}

export class DHFormalVerifier {
  private static instance: DHFormalVerifier | null = null;
  private z3InitPromise: Promise<any> | null = null;
  private readonly solverVersion: string = 'Microsoft Research Z3 WASM 5.2.0';
  private readonly commitSha: string = '728625581c2f89210c752d03fda0a154812b2366';
  private primaryContext: any = null;
  private cleanroomContext: any = null;

  public static getInstance(): DHFormalVerifier {
    if (!DHFormalVerifier.instance) {
      DHFormalVerifier.instance = new DHFormalVerifier();
    }
    return DHFormalVerifier.instance;
  }

  private async getZ3Module(): Promise<any> {
    if (!this.z3InitPromise) {
      this.z3InitPromise = (async () => {
        try {
          const { init } = await import('z3-solver');
          return await init();
        } catch (e) {
          console.warn('[DHFormalVerifier] z3-solver native WASM load failure:', e);
          return null;
        }
      })();
    }
    return this.z3InitPromise;
  }

  private getPrimaryContext(z3Mod: any): any {
    if (!this.primaryContext) {
      this.primaryContext = new z3Mod.Context('dh_primary_context');
    }
    return this.primaryContext;
  }

  private getCleanroomContext(z3Mod: any): any {
    if (!this.cleanroomContext) {
      this.cleanroomContext = new z3Mod.Context('dh_cleanroom_context');
    }
    return this.cleanroomContext;
  }

  /**
   * Execute an individual DH formal contract through real Z3.
   */
  public async verifyCase(
    contract: DHFormalContract,
    executionId: string = `dh_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  ): Promise<DHFormalVerificationResult> {
    const start = performance.now();
    const timestamp = new Date().toISOString();
    const z3Mod = await this.getZ3Module();

    if (!z3Mod) {
      const dur = performance.now() - start;
      const seed = `${contract.case_id}:${contract.contract_hash}:error:no_solver`;
      return {
        case_id: contract.case_id,
        name: contract.name,
        domain: contract.domain,
        statement: contract.statement,
        formal_proposition: contract.formal_proposition,
        assumptions: contract.assumptions,
        expected_result: contract.expected_result,
        actual_result: 'error',
        replay_result: 'error',
        replay_match: false,
        verified: false,
        solver: 'z3-wasm',
        solver_version: this.solverVersion,
        execution_id: executionId,
        commit_sha: this.commitSha,
        source_hash: contract.source_hash,
        contract_hash: contract.contract_hash,
        evidence_hash: computeSha256(seed),
        scope: contract.scope,
        duration_ms: Number(dur.toFixed(3)),
        timestamp,
        error: 'Z3 WASM solver module could not be initialized'
      };
    }

    let actualResult: 'unsat' | 'sat' | 'unknown' | 'error' = 'unknown';
    let execError: string | undefined = undefined;

    try {
      const ctx = this.getPrimaryContext(z3Mod);
      const solver = new ctx.Solver();
      await solver.fromString(contract.z3_smt_assertion);
      const res = await solver.check();
      if (res === 'unsat') actualResult = 'unsat';
      else if (res === 'sat') actualResult = 'sat';
      else actualResult = 'unknown';
    } catch (err: any) {
      actualResult = 'error';
      execError = err?.message || String(err);
    }

    // Cleanroom fresh-context replay for this case
    let replayResult: 'unsat' | 'sat' | 'unknown' | 'error' = 'unknown';
    try {
      const replayCtx = this.getCleanroomContext(z3Mod);
      const replaySolver = new replayCtx.Solver();
      await replaySolver.fromString(contract.z3_smt_assertion);
      const rRes = await replaySolver.check();
      if (rRes === 'unsat') replayResult = 'unsat';
      else if (rRes === 'sat') replayResult = 'sat';
      else replayResult = 'unknown';
    } catch {
      replayResult = 'error';
    }

    const dur = performance.now() - start;
    const replayMatch = actualResult === replayResult && actualResult !== 'unknown' && actualResult !== 'error';
    const matchesExpected = actualResult === contract.expected_result;
    const verified = matchesExpected && replayMatch;

    const evidenceSeed = `${contract.case_id}:${contract.contract_hash}:${actualResult}:${replayResult}:${executionId}:${this.commitSha}`;
    const evidenceHash = computeSha256(evidenceSeed);

    return {
      case_id: contract.case_id,
      name: contract.name,
      domain: contract.domain,
      statement: contract.statement,
      formal_proposition: contract.formal_proposition,
      assumptions: contract.assumptions,
      expected_result: contract.expected_result,
      actual_result: actualResult,
      replay_result: replayResult,
      replay_match: replayMatch,
      verified,
      solver: 'z3-wasm',
      solver_version: this.solverVersion,
      execution_id: executionId,
      commit_sha: this.commitSha,
      source_hash: contract.source_hash,
      contract_hash: contract.contract_hash,
      evidence_hash: evidenceHash,
      scope: contract.scope,
      duration_ms: Number(dur.toFixed(3)),
      timestamp,
      error: execError
    };
  }

  /**
   * Run full verification for all 32 DH formal cases + cleanroom replays
   */
  public async verifyAll32(): Promise<DH32VerificationReport> {
    const overallExecId = `dh32_exec_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const results: DHFormalVerificationResult[] = [];
    const replays: DHReplayRecord[] = [];

    let attempted = 0;
    let executed = 0;
    let expectedMatches = 0;
    let replaysMatched = 0;
    let satCount = 0;
    let unsatCount = 0;
    let unknownCount = 0;
    let errorCount = 0;

    for (const contract of REAL_32_DH_FORMAL_REGISTRY) {
      attempted++;
      const res = await this.verifyCase(contract, overallExecId);
      results.push(res);

      if (res.actual_result !== 'error' || !res.error?.includes('could not be initialized')) {
        executed++;
      }

      if (res.actual_result === 'unsat') unsatCount++;
      else if (res.actual_result === 'sat') satCount++;
      else if (res.actual_result === 'unknown') unknownCount++;
      else if (res.actual_result === 'error') errorCount++;

      if (res.actual_result === res.expected_result) expectedMatches++;
      if (res.replay_match) replaysMatched++;

      const replayRec: DHReplayRecord = {
        case_id: contract.case_id,
        original_result: res.actual_result,
        replay_result: res.replay_result,
        replay_match: res.replay_match,
        original_evidence_hash: res.evidence_hash,
        replay_evidence_hash: computeSha256(`${contract.case_id}:REPLAY:${res.replay_result}:${this.commitSha}`),
        cleanroom_context_id: 'dh_cleanroom_context'
      };
      replays.push(replayRec);
    }

    const allPassed = expectedMatches === REAL_32_DH_FORMAL_REGISTRY.length &&
      replaysMatched === REAL_32_DH_FORMAL_REGISTRY.length &&
      unknownCount === 0 &&
      errorCount === 0;

    const overallStatus: DH32VerificationReport['overall_status'] =
      allPassed ? 'VERIFIED' : (expectedMatches > 0 ? 'PARTIAL' : 'FAILED');

    const rootHash = computeSha256(
      results.map(r => `${r.case_id}:${r.contract_hash}:${r.actual_result}:${r.replay_result}:${r.evidence_hash}`).join('|')
    );

    return {
      execution_id: overallExecId,
      timestamp,
      commit_sha: this.commitSha,
      total_cases: REAL_32_DH_FORMAL_REGISTRY.length,
      attempted,
      executed,
      expected_result_matches: expectedMatches,
      cleanroom_replays: replays.length,
      replay_matches: replaysMatched,
      sat_count: satCount,
      unsat_count: unsatCount,
      unknown_count: unknownCount,
      error_count: errorCount,
      solver: 'z3-wasm',
      solver_version: this.solverVersion,
      verification_root_sha256: rootHash,
      overall_status: overallStatus,
      results,
      replays
    };
  }

  /**
   * Run SMT mutation test against DH formal contract.
   * Target: DH-P-028 (Pigeonhole collision: 4 pigeons into 3 holes -> UNSAT).
   * Mutation: Increase slots to 5 holes -> SAT (4 pigeons into 5 holes can be distinct).
   */
  public async runSmtMutationTest(): Promise<DHSmtMutationResult> {
    const target = REAL_32_DH_FORMAL_REGISTRY[27]; // DH-P-028
    const originalSmt = target.z3_smt_assertion;

    // Mutate bound: change slot upper bound from 3 to 5 (4 pigeons into 5 slots)
    const mutatedSmt = originalSmt.replace(/<= f1 3/g, '<= f1 5')
      .replace(/<= f2 3/g, '<= f2 5')
      .replace(/<= f3 3/g, '<= f3 5')
      .replace(/<= f4 3/g, '<= f4 5');

    const z3Mod = await this.getZ3Module();
    if (!z3Mod) {
      return {
        test_name: 'DH Formal SMT Invariant Mutation Test',
        target_case_id: target.case_id,
        mutation_type: 'PIGEONHOLE_CAPACITY_EXPANSION_BOUND_MUTATION',
        original_assertion: originalSmt,
        mutated_assertion: mutatedSmt,
        expected_original_result: 'unsat',
        observed_original_result: 'error',
        expected_mutated_result: 'sat',
        observed_mutated_result: 'error',
        mutation_detected: false,
        passed: false,
        details: 'Z3 solver unavailable for mutation testing'
      };
    }

    const { Context } = z3Mod;
    const ctxOrig = new Context('dh_mut_orig');
    const sOrig = new ctxOrig.Solver();
    await sOrig.fromString(originalSmt);
    const origRes = await sOrig.check();

    const ctxMut = new Context('dh_mut_pert');
    const sMut = new ctxMut.Solver();
    await sMut.fromString(mutatedSmt);
    const mutRes = await sMut.check();

    const mutationDetected = origRes === 'unsat' && mutRes === 'sat';

    return {
      test_name: 'DH Formal SMT Invariant Mutation Test',
      target_case_id: target.case_id,
      mutation_type: 'PIGEONHOLE_CAPACITY_EXPANSION_BOUND_MUTATION',
      original_assertion: originalSmt,
      mutated_assertion: mutatedSmt,
      expected_original_result: 'unsat',
      observed_original_result: origRes,
      expected_mutated_result: 'sat',
      observed_mutated_result: mutRes,
      mutation_detected: mutationDetected,
      passed: mutationDetected,
      details: mutationDetected
        ? 'Mutation test passed: Expanding pigeonhole capacity from 3 to 5 slots correctly converted theorem from UNSAT to SAT.'
        : `Mutation test failed: orig=${origRes}, mut=${mutRes}`
    };
  }

  /**
   * Test failure injection & fail-closed behavior on malformed SMT
   */
  public async runFailureInjectionTest(): Promise<DHFailureInjectionResult> {
    const malformedContract: DHFormalContract = {
      case_id: 'DH-P-FAULT-INJECTION',
      name: 'Malformed DH SMT Injection',
      domain: 'FAULT_INJECTION',
      statement: 'Malformed syntax test',
      formal_proposition: 'Syntax error must fail closed and never be marked verified.',
      assumptions: [],
      axioms: [],
      constraints: [],
      expected_result: 'unsat',
      scope: 'MODEL_VERIFIED',
      formalization_method: 'Fault injection test',
      z3_smt_assertion: '(assert (this_is_an_undefined_dh_operator 999 888))',
      contract_hash: computeSha256('MALFORMED_DH_CONTRACT'),
      source_hash: computeSha256('MALFORMED_SOURCE')
    };

    const res = await this.verifyCase(malformedContract);
    const failClosed = res.actual_result === 'error' && res.verified === false;

    return {
      test_name: 'DH Formal Solver Malformed SMT Injection Test',
      injection_type: 'MALFORMED_SMT',
      input_assertion: malformedContract.z3_smt_assertion,
      observed_result: res.actual_result,
      verified_status: res.verified,
      fail_closed_enforced: failClosed,
      passed: failClosed,
      notes: failClosed
        ? 'Fail-closed behavior confirmed: Malformed DH SMT syntax produced ERROR and verified=false. Never converted to unsat or sat.'
        : `Fail-closed violated: observed=${res.actual_result}, verified=${res.verified}`
    };
  }

  /**
   * Cryptographic artifact tampering test
   */
  public runArtifactTamperTest(report: DH32VerificationReport): DHTamperTestResult {
    const originalHash = report.verification_root_sha256;
    const tamperedPayload = JSON.parse(JSON.stringify(report));
    if (tamperedPayload.results && tamperedPayload.results.length > 0) {
      tamperedPayload.results[0].actual_result = 'sat';
      tamperedPayload.results[0].verified = false;
    }

    const tamperedHash = computeSha256(
      tamperedPayload.results.map((r: any) => `${r.case_id}:${r.contract_hash}:${r.actual_result}:${r.replay_result}:${r.evidence_hash}`).join('|')
    );

    const tamperDetected = originalHash !== tamperedHash;

    return {
      test_name: 'DH Artifact Tamper Sentinel Monitor',
      original_hash: originalHash,
      tampered_hash: tamperedHash,
      tamper_detected: tamperDetected,
      passed: tamperDetected,
      alarm_triggered: tamperDetected
    };
  }
}
