export interface GateObservation {
  id: string;
  status: string;
  name?: string;
}

export interface GateDisposition {
  id: string;
  observed_status: string;
  resolution: 'RETAINED';
  may_pass: false;
  reason: string;
}

const REQUIRED: Record<string, { status: string; reason: string }> = {
  'GATE-11': {
    status: 'EXTERNAL_PROVIDER_REQUIRED',
    reason: 'Neon and PayPal are not configured. No credentials were invented. Stripe stays prohibited.',
  },
  'GATE-12': {
    status: 'BLOCKED',
    reason: 'The order lifecycle stops because verified identity is required. No order was deployed.',
  },
  'GATE-14': {
    status: 'BLOCKED',
    reason: 'The environment is not production, and the provider and identity blockers remain.',
  },
  'GATE-46': {
    status: 'BLOCKED',
    reason: 'Master closure stays blocked while GATE-11, GATE-12, and GATE-14 are not passed. That is the fail-closed result, not a production certification.',
  },
};

/** Records the honest disposition. It cannot rewrite a blocked gate to PASSED. */
export function disposeBlockedGates(observations: GateObservation[]): { ok: boolean; dispositions: GateDisposition[]; findings: string[] } {
  const findings: string[] = [];
  const dispositions: GateDisposition[] = [];
  for (const [id, required] of Object.entries(REQUIRED)) {
    const observed = observations.find((gate) => gate.id === id);
    if (!observed) {
      findings.push(`BLOCKED: ${id} was not in the evidence.`);
      continue;
    }
    if (observed.status !== required.status) {
      findings.push(`BLOCKED: ${id} is ${observed.status}, not the retained status ${required.status}.`);
    }
    dispositions.push({
      id,
      observed_status: observed.status,
      resolution: 'RETAINED',
      may_pass: false,
      reason: required.reason,
    });
  }
  return { ok: findings.length === 0 && dispositions.every((item) => item.may_pass === false), dispositions, findings };
}
