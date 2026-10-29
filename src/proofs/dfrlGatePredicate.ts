/**
 * Shared GATE-06 / verify_120 DFRL pass predicate.
 * Theorem-specific operators may expect sat OR unsat; all-unsat is obsolete.
 */
import type { DFRL88VerificationReport } from './DFRLFormalVerifier';

export function dfrl88ExpectedMatches(report: DFRL88VerificationReport): number {
  return report.results.filter((r) => r.proved).length;
}

export function isDfrl88GatePassed(report: DFRL88VerificationReport): boolean {
  return (
    report.overall_status === 'VERIFIED' &&
    report.total_operators === 88 &&
    report.executed === 88 &&
    report.results.length === 88 &&
    dfrl88ExpectedMatches(report) === 88 &&
    report.unknown_count === 0 &&
    report.error_count === 0
  );
}

export function dfrl88GateDetails(report: DFRL88VerificationReport): Record<string, unknown> {
  return {
    total_propositions: report.total_propositions,
    attempted: report.attempted,
    executed: report.executed,
    expected_result_matches: dfrl88ExpectedMatches(report),
    unsat_count: report.unsat_count,
    sat_count: report.sat_count,
    overall_status: report.overall_status,
    authored_models_count: report.authored_models_count,
    generated_models_count: report.generated_models_count,
    deterministic_replays_matched: report.deterministic_replays_matched,
    solver_engine: report.solver_engine,
    solver_version: report.solver_version,
    root_sha256: report.verification_root_sha256,
    predicate:
      'overall_status===VERIFIED && executed===88 && every result.proved (expected sat|unsat)',
  };
}
