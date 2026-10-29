/** Shared DFRL expected-result helpers (pure). */
import type { DFRLParadoxItem } from '../src/data/paradoxData';

export function expectedSolverResult(item: DFRLParadoxItem): 'unsat' | 'sat' {
  return item.expected_solver_result === 'sat' ? 'sat' : 'unsat';
}

export function dfrlResultMatchesExpected(
  observed: string,
  item: DFRLParadoxItem
): boolean {
  return observed === expectedSolverResult(item);
}
