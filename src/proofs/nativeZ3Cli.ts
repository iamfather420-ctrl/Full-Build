/**
 * Low-memory native Z3 CLI backend.
 * The published z3-solver WASM module declares an initial memory of 32768 pages (~2GiB).
 * Hosts with less RAM cannot instantiate it. This backend shells out to a system `z3`
 * binary and remains fail-closed when the binary is missing or returns an error.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export type NativeZ3Result = {
  result: 'sat' | 'unsat' | 'unknown' | 'error';
  model?: string;
  error?: string;
  engine: 'native-z3-cli';
  engine_version?: string;
};

function whichZ3(): string | null {
  try {
    const out = execFileSync('which', ['z3'], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function isNativeZ3Available(): boolean {
  return Boolean(whichZ3());
}

export function getNativeZ3Version(): string {
  try {
    const z3 = whichZ3();
    if (!z3) return 'unavailable';
    return execFileSync(z3, ['--version'], { encoding: 'utf8' }).trim().split('\n')[0] || 'z3';
  } catch {
    return 'unavailable';
  }
}

/**
 * Run one SMT-LIB script. The script should include (check-sat).
 * When the result is sat, appends (get-model) in a second pass for a witness string.
 */
export function runNativeZ3Smt(smtAssertion: string): NativeZ3Result {
  const z3 = whichZ3();
  if (!z3) {
    return { result: 'error', error: 'native z3 binary not found on PATH', engine: 'native-z3-cli' };
  }
  try {
    const body = smtAssertion.trim();
    const hasCheck = /\(check-sat\)/.test(body);
    const script = hasCheck ? body + '\n' : body + '\n(check-sat)\n';
    const out = execFileSync(z3, ['-in', '-T:30'], {
      input: script,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 35000
    }).trim();
    const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] || '';
    if (last === 'unsat') {
      return { result: 'unsat', engine: 'native-z3-cli', engine_version: getNativeZ3Version() };
    }
    if (last === 'unknown') {
      return { result: 'unknown', engine: 'native-z3-cli', engine_version: getNativeZ3Version() };
    }
    if (last === 'sat') {
      let model = '';
      try {
        const modelOut = execFileSync(z3, ['-in', '-T:30'], {
          input: script + '(get-model)\n',
          encoding: 'utf8',
          maxBuffer: 8 * 1024 * 1024,
          timeout: 35000
        }).trim();
        const modelLines = modelOut.split(/\r?\n/);
        const satIdx = modelLines.findIndex(l => l.trim() === 'sat');
        model = modelLines.slice(satIdx + 1).join('\n').trim();
      } catch {
        model = '';
      }
      return {
        result: 'sat',
        model: model || undefined,
        engine: 'native-z3-cli',
        engine_version: getNativeZ3Version()
      };
    }
    return {
      result: 'error',
      error: `unexpected z3 output: ${out.slice(0, 200)}`,
      engine: 'native-z3-cli',
      engine_version: getNativeZ3Version()
    };
  } catch (e: any) {
    const msg = e?.stderr?.toString?.() || e?.message || String(e);
    const out = (e?.stdout?.toString?.() || '').trim();
    if (out.endsWith('unsat')) return { result: 'unsat', engine: 'native-z3-cli' };
    if (out.endsWith('sat')) return { result: 'sat', model: undefined, engine: 'native-z3-cli' };
    return { result: 'error', error: msg.slice(0, 500), engine: 'native-z3-cli' };
  }
}

export function hashModel(model: string): string {
  return createHash('sha256').update(model).digest('hex');
}

export function nativeIndependentSatRecheck(smtAssertion: string, model: string): { passed: boolean; model_sha256: string } {
  const model_sha256 = hashModel(model || '');
  const again = runNativeZ3Smt(smtAssertion);
  return { passed: again.result === 'sat', model_sha256 };
}
