import { AUTHORITATIVE_32_DH_CONTRACTS } from '../formal/dhAuthoritativeFormalContracts';
import { REAL_88_PARADOX_REGISTRY } from '../data/paradoxData';
import { DFRLFormalVerifier, type DFRL88VerificationReport } from './DFRLFormalVerifier';
import { DHFormalVerifier, type DH32VerificationReport } from './DHFormalVerifier';

export type CorpusStatus = 'NOT_RUN' | 'BLOCKED' | 'FAILED' | 'PARTIAL' | 'VERIFIED';

export interface CorpusPublicSummary {
  required: 120;
  dfrl: number;
  dh: number;
  status: CorpusStatus;
  executed: number;
  blocked: number;
  failed: number;
  passed: number;
  detail: string;
}

export function corpusShape(): { ok: boolean; dfrl: number; dh: number; reason?: string } {
  const dfrlCodes = REAL_88_PARADOX_REGISTRY.map((item) => item.code);
  const dhCodes = AUTHORITATIVE_32_DH_CONTRACTS.map((item) => item.case_id);
  const dfrl = new Set(dfrlCodes).size;
  const dh = new Set(dhCodes).size;
  if (dfrlCodes.length !== 88 || dfrl !== 88) {
    return { ok: false, dfrl, dh, reason: `DFRL corpus is ${dfrlCodes.length} records, ${dfrl} unique. It must be 88.` };
  }
  if (dhCodes.length !== 32 || dh !== 32) {
    return { ok: false, dfrl, dh, reason: `DH corpus is ${dhCodes.length} records, ${dh} unique. It must be 32.` };
  }
  return { ok: true, dfrl: 88, dh: 32 };
}

export function summarizeCorpus(
  shapeOk: boolean,
  shapeReason: string | undefined,
  dfrl: Pick<DFRL88VerificationReport, 'executed' | 'not_executed_count' | 'unsat_count' | 'error_count' | 'overall_status'> | null,
  dh: Pick<DH32VerificationReport, 'executed' | 'error_count' | 'expected_result_matches' | 'overall_status'> | null,
): CorpusPublicSummary {
  if (!shapeOk || !dfrl || !dh) {
    return {
      required: 120,
      dfrl: 88,
      dh: 32,
      status: 'FAILED',
      executed: 0,
      blocked: 0,
      failed: 120,
      passed: 0,
      detail: shapeReason || 'Corpus shape is not 88 + 32.',
    };
  }

  const executed = dfrl.executed + dh.executed;
  const blocked = dfrl.not_executed_count + (dh.executed === 0 ? dh.error_count : 0);
  const solverNeverRan = dfrl.not_executed_count === 88 && dh.executed === 0;
  const passed = dfrl.unsat_count + dh.expected_result_matches;

  if (solverNeverRan) {
    return {
      required: 120,
      dfrl: 88,
      dh: 32,
      status: 'BLOCKED',
      executed: 0,
      blocked: 120,
      failed: 0,
      passed: 0,
      detail: 'Solver did not run. Stored VERIFIED stamps are not a result. Nothing is certified.',
    };
  }

  const verified = dfrl.overall_status === 'VERIFIED' && dh.overall_status === 'VERIFIED';
  const failed = verified ? 0 : Math.max(0, 120 - passed - blocked);
  return {
    required: 120,
    dfrl: 88,
    dh: 32,
    status: verified ? 'VERIFIED' : executed > 0 ? 'PARTIAL' : 'FAILED',
    executed,
    blocked,
    failed,
    passed: verified ? 120 : passed,
    detail: verified
      ? 'All 120 executed cases matched. This does not prove products outside the corpus.'
      : 'The suite did not close. A partial or failed run cannot publish a product.',
  };
}

export async function runCorpus120(): Promise<CorpusPublicSummary> {
  const shape = corpusShape();
  if (!shape.ok) return summarizeCorpus(false, shape.reason, null, null);
  const dfrl = await DFRLFormalVerifier.getInstance().verifyAll88();
  const dh = await DHFormalVerifier.getInstance().verifyAll32();
  return summarizeCorpus(true, undefined, dfrl, dh);
}
