import { computeSha256 } from '../database/DatabaseSchema';

export interface SatWitnessCheck {
  result: 'sat' | 'unsat' | 'unknown' | 'error';
  model_sha256: string;
  assertion_count: number;
  passed: boolean;
  error?: string;
}

/**
 * Extract only scalar zero-argument Bool/Int/Real definitions from a Z3 model.
 * Unsupported or empty models fail closed; the verifier must not call SAT alone
 * a witness proof. The extracted assignments are asserted alongside the original
 * source SMT in a new, independent Z3 context.
 */
function extractScalarAssignments(modelText: string): string[] {
  const assignments: string[] = [];
  let cursor = 0;
  while (true) {
    const start = modelText.indexOf('(define-fun', cursor);
    if (start < 0) break;
    let depth = 0;
    let end = -1;
    for (let i = start; i < modelText.length; i++) {
      if (modelText[i] === '(') depth++;
      else if (modelText[i] === ')') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end < 0) throw new Error('Malformed model: unterminated define-fun.');
    const expression = modelText.slice(start + '(define-fun'.length, end - 1).trim();
    const match = expression.match(/^([^\s()]+)\s+\(\)\s+(Bool|Int|Real)\s+([\s\S]+)$/);
    if (!match) {
      throw new Error('Unsupported SAT witness model: only scalar zero-argument Bool/Int/Real values are independently checked.');
    }
    const [, name, , value] = match;
    if (!/^[A-Za-z_][A-Za-z0-9_.$-]*$/.test(name)) {
      throw new Error('Unsupported symbol name in SAT witness model.');
    }
    assignments.push(`(assert (= ${name} ${value.trim()}))`);
    cursor = end;
  }
  if (assignments.length === 0) throw new Error('SAT model contained no independently checkable scalar assignments.');
  return assignments;
}

export async function independentlyCheckSatWitness(
  z3Module: any,
  sourceSmt: string,
  modelText: string
): Promise<SatWitnessCheck> {
  const modelSha256 = computeSha256(modelText);
  try {
    const assignments = extractScalarAssignments(modelText);
    const contextName = `sat_witness_recheck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const context = new z3Module.Context(contextName);
    const solver = new context.Solver();
    const baseAssertion = sourceSmt.replace(/\(check-sat\)/g, '');
    await solver.fromString(`${baseAssertion}\n${assignments.join('\n')}\n`);
    const result = await solver.check();
    const normalized: SatWitnessCheck['result'] =
      result === 'sat' ? 'sat' : result === 'unsat' ? 'unsat' : 'unknown';
    return {
      result: normalized,
      model_sha256: modelSha256,
      assertion_count: assignments.length,
      passed: normalized === 'sat'
    };
  } catch (error: any) {
    return {
      result: 'error',
      model_sha256: modelSha256,
      assertion_count: 0,
      passed: false,
      error: error?.message || String(error)
    };
  }
}
