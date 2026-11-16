import { createHash } from 'node:crypto';

export type EvidenceStatus = 'verified_fact' | 'unverified_claim' | 'contradiction' | 'insufficient_evidence';

export interface EvidenceSource {
  id: string;
  sha256: string;
  text: string;
}

export interface SolverVerdict {
  solverId: string;
  verdict: 'support' | 'withhold' | 'contradict';
  inputSha256: string;
}

export interface Assertion {
  id: string;
  text: string;
  sources: EvidenceSource[];
  solvers: SolverVerdict[];
}

export interface Classification {
  status: EvidenceStatus;
  publishable: boolean;
  reason: string;
  assertionSha256: string;
}

function canonical(assertion: Assertion): string {
  return JSON.stringify({ id: assertion.id, text: assertion.text.trim() });
}

export function assertionSha256(assertion: Assertion): string {
  return createHash('sha256').update(canonical(assertion)).digest('hex');
}

function sourceAgrees(sources: EvidenceSource[]): boolean {
  const texts = sources.map((source) => source.text.trim().toLowerCase());
  return texts.every((text) => text === texts[0]);
}

/**
 * Classifies a recorded assertion. An unverified or conflicting record can never
 * become a verified fact, regardless of any caller-supplied success flag.
 */
export function classifyAssertion(assertion: Assertion): Classification {
  const digest = assertionSha256(assertion);
  const withheld = (status: EvidenceStatus, reason: string): Classification => ({
    status, publishable: false, reason, assertionSha256: digest,
  });
  if (!assertion.id || !assertion.text.trim()) return withheld('insufficient_evidence', 'Assertion has no identity or text.');
  if (assertion.sources.length === 0) return withheld('insufficient_evidence', 'No source record was supplied.');
  if (assertion.sources.some((source) => !/^[a-f0-9]{64}$/.test(source.sha256) || createHash('sha256').update(source.text).digest('hex') !== source.sha256)) {
    return withheld('insufficient_evidence', 'A source checksum does not match its bytes.');
  }
  if (!sourceAgrees(assertion.sources)) return withheld('contradiction', 'Source texts disagree.');
  if (assertion.solvers.some((solver) => solver.verdict === 'contradict')) return withheld('contradiction', 'An independent solver contradicted the assertion.');
  const supporters = new Map<string, SolverVerdict>();
  for (const solver of assertion.solvers) {
    if (solver.verdict === 'support' && solver.inputSha256 === digest) supporters.set(solver.solverId, solver);
  }
  if (supporters.size < 2) return withheld('unverified_claim', 'Fewer than two independent solvers supported the exact assertion hash.');
  return {
    status: 'verified_fact',
    publishable: true,
    reason: 'Two independent solvers supported the same assertion hash and the source bytes matched.',
    assertionSha256: digest,
  };
}
