import { createHash, randomUUID } from 'node:crypto';

export type BubbleVerification = 'UNREVIEWED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CONFLICTED';
export type BubbleTrainingEligibility = 'INELIGIBLE' | 'ELIGIBLE';
export type BubbleLicenseStatus = 'UNKNOWN' | 'AUTHORIZED' | 'RESTRICTED' | 'PROHIBITED';

export interface LearningBubbleInput {
  content: string;
  source: { source_id: string; source_type: string; uri?: string; captured_at: string; content_sha256: string };
  evidence_refs: string[];
  verification: BubbleVerification;
  license_status: BubbleLicenseStatus;
  paradox_ids: string[];
  node_ids: string[];
  synapse_ids: string[];
  context?: Record<string, unknown>;
  contradiction_refs?: string[];
  parent_bubble_ids?: string[];
}

export interface LearningBubble extends LearningBubbleInput {
  bubble_id: string;
  version: number;
  content_sha256: string;
  training_eligibility: BubbleTrainingEligibility;
  created_at: string;
  updated_at: string;
}

export interface LearningBubbleStore {
  get(id: string): LearningBubble | undefined;
  put(bubble: LearningBubble): void;
  list(): LearningBubble[];
}

/** In-memory implementation for local tests and prototyping. Inject a durable store for production. */
export class InMemoryLearningBubbleStore implements LearningBubbleStore {
  private readonly records = new Map<string, LearningBubble>();
  get(id: string): LearningBubble | undefined { return this.records.get(id); }
  put(bubble: LearningBubble): void { this.records.set(bubble.bubble_id, bubble); }
  list(): LearningBubble[] { return [...this.records.values()]; }
}

function deriveEligibility(input: LearningBubbleInput): BubbleTrainingEligibility {
  return input.verification === 'VERIFIED'
    && input.license_status === 'AUTHORIZED'
    && input.evidence_refs.length > 0
    && input.source.content_sha256 === createHash('sha256').update(input.content).digest('hex')
    && input.contradiction_refs?.length === 0
    ? 'ELIGIBLE'
    : 'INELIGIBLE';
}

export class LearningBubbleRegistry {
  constructor(private readonly store: LearningBubbleStore) {}

  create(input: LearningBubbleInput): LearningBubble {
    this.validate(input);
    const now = new Date().toISOString();
    const bubble: LearningBubble = {
      ...input,
      bubble_id: randomUUID(),
      version: 1,
      content_sha256: createHash('sha256').update(input.content).digest('hex'),
      training_eligibility: deriveEligibility(input),
      created_at: now,
      updated_at: now,
    };
    this.store.put(bubble);
    return bubble;
  }

  revise(id: string, input: LearningBubbleInput): LearningBubble {
    this.validate(input);
    const previous = this.store.get(id);
    if (!previous) throw new Error(`Learning Bubble ${id} was not found.`);
    const revised: LearningBubble = {
      ...input,
      bubble_id: id,
      version: previous.version + 1,
      content_sha256: createHash('sha256').update(input.content).digest('hex'),
      training_eligibility: deriveEligibility(input),
      created_at: previous.created_at,
      updated_at: new Date().toISOString(),
    };
    this.store.put(revised);
    return revised;
  }

  getTrainingEligible(): LearningBubble[] {
    return this.store.list().filter((bubble) => bubble.training_eligibility === 'ELIGIBLE');
  }

  private validate(input: LearningBubbleInput): void {
    if (!input.content?.trim()) throw new Error('Learning Bubble content is required.');
    if (!input.source?.source_id?.trim() || !input.source.source_type?.trim()) throw new Error('Source identity and type are required.');
    if (!/^[a-f0-9]{64}$/i.test(input.source.content_sha256 ?? '')) throw new Error('Source content SHA-256 is required.');
    if (!Number.isFinite(Date.parse(input.source.captured_at))) throw new Error('Source capture timestamp must be valid.');
    if (!Array.isArray(input.evidence_refs) || !Array.isArray(input.paradox_ids) || !Array.isArray(input.node_ids) || !Array.isArray(input.synapse_ids)) {
      throw new Error('Evidence, paradox, node, and synapse references must be arrays.');
    }
    if (input.source.content_sha256 !== createHash('sha256').update(input.content).digest('hex') && input.verification === 'VERIFIED') {
      throw new Error('Verified Bubble content must match the source content hash.');
    }
  }
}
