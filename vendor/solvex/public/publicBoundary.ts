import { AuthService } from '../auth/AuthService';
import { DaisyActivationGate } from '../brain/DaisyActivationGate';
import { DurableStore } from '../database/DurableStore';

export const ENGINE_LIFECYCLE = [
  'Receive',
  'Analyze',
  'Explore',
  'Design',
  'Produce',
  'Test',
  'Verify',
  'Review',
  'Authorize',
  'Package',
  'Publish or hold',
  'Monitor',
] as const;

export type IntegrationState = 'implemented' | 'blocked' | 'missing';

export interface IntegrationFact {
  name: string;
  state: IntegrationState;
  detail: string;
}

export interface PublicPicture {
  domain: string;
  daisy_activation: 'INACTIVE' | 'ACTIVE' | 'BLOCKED';
  daisy_reason: string;
  corpus_required: 120;
  corpus_public_raw: false;
  verified_public_offers: number;
  payments: 'disabled';
  authentication: 'disabled';
  publish_authorized: false;
  publish_block: string;
  chain_valid: boolean;
  audit_records: number;
  open_proposals: number;
}

export type ProposalResult =
  | { ok: true; id: string; state: 'PROPOSED'; publishable: false; verified: false }
  | { ok: false; error: string };

const PUBLIC_TENANT = 'public-unauthenticated';

export function integrationFacts(): IntegrationFact[] {
  const picture = publicOperatingPicture();
  return [
    {
      name: 'Daisy coordination',
      state: picture.daisy_activation === 'ACTIVE' ? 'implemented' : 'blocked',
      detail: picture.daisy_reason,
    },
    {
      name: 'Model registry',
      state: 'blocked',
      detail: 'GitHub inference runtime is present. No weight file was in that tree or the full-build archive, so chat stays blocked.',
    },
    {
      name: 'Solution engine',
      state: 'blocked',
      detail: 'The stage pipeline exists. Public intake stops at PROPOSED and does not produce or publish.',
    },
    {
      name: 'Marketplace',
      state: 'implemented',
      detail: 'Only a persisted, published, verified offer can list. This session does not invent one.',
    },
    {
      name: 'Payments',
      state: 'blocked',
      detail: 'PayPal capture, escrow, and checkout stay disabled.',
    },
    {
      name: 'Authentication',
      state: 'blocked',
      detail: 'No OIDC session. Production login stays off.',
    },
    {
      name: 'Human authorization',
      state: 'missing',
      detail: 'No production approver is wired, so AUTHORIZED cannot be reached from this screen.',
    },
    {
      name: 'Audit chain',
      state: picture.chain_valid ? 'implemented' : 'blocked',
      detail: 'Hash-linked local records. Not a signed production ledger.',
    },
    {
      name: 'Tenant database',
      state: 'missing',
      detail: 'No live isolated database is connected for release.',
    },
    {
      name: 'Corpus execution',
      state: 'blocked',
      detail: 'A full pass is not claimed. Passing the 120 would not prove unrelated behavior anyway.',
    },
  ];
}

export function publicOperatingPicture(): PublicPicture {
  const store = DurableStore.getInstance();
  const chain = store.verifyChain();
  const state = store.getState();
  const offers = Object.values(state.offers).filter(
    (offer) => offer.published === true && offer.verification_status === 'VERIFIED',
  );
  const gate = DaisyActivationGate.read();
  const auth = AuthService.getInstance().authorize(null, 'publish_offer');
  return {
    domain: 'uarefake.space',
    daisy_activation: gate?.status ?? 'BLOCKED',
    daisy_reason: gate?.reason ?? 'No activation record. The brain stays fail-closed.',
    corpus_required: 120,
    corpus_public_raw: false,
    verified_public_offers: offers.length,
    payments: 'disabled',
    authentication: 'disabled',
    publish_authorized: false,
    publish_block: auth.reason,
    chain_valid: chain.valid,
    audit_records: chain.total_records,
    open_proposals: Object.values(state.problems).filter((problem) => problem.status === 'PROPOSED').length,
  };
}

export function proposeProblem(raw: string): ProposalResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length < 8) return { ok: false, error: 'Describe the problem in at least a few words.' };
  if (text.length > 2000) return { ok: false, error: 'That request is too long for this intake.' };

  const auth = AuthService.getInstance().authorize(null, 'run_solution_engine');
  const store = DurableStore.getInstance();
  const id = `prob_${Date.now().toString(36)}`;
  store.getState().problems[id] = {
    id,
    tenant_id: PUBLIC_TENANT,
    raw_problem: text,
    normalized_title: text.slice(0, 80),
    domain: 'UNCLASSIFIED',
    detected_constraints: ['NO_SESSION', 'PAYMENTS_DISABLED', 'CORPUS_PRIVATE'],
    invariants: [],
    status: 'PROPOSED',
    created_at: Date.now(),
    version: 'intake-1',
  };
  store.appendAudit(PUBLIC_TENANT, 'public-intake', 'PROBLEM_PROPOSED', 'problem', id, {
    state: 'PROPOSED',
    execution: 'blocked',
    reason: auth.reason,
  });
  return { ok: true, id, state: 'PROPOSED', publishable: false, verified: false };
}
