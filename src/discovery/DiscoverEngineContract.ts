import { z } from 'zod';

const shortText = z.string().min(1).max(2_000);
const textList = z.array(z.string().max(2_000)).max(100);
const httpsUrl = z.string().url().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Only HTTPS source URLs are accepted.');

/**
 * Caller-supplied discovery records are not authenticated source evidence.
 * A matched passage is not proof that the source metadata or claim is true.
 */
export const DiscoveryRecordSchema = z.object({
  id: shortText,
  source: z.enum(['openalex', 'arxiv']),
  title: shortText,
  abstract: z.string().min(1).max(48_000),
  year: z.number().int().min(1000).max(3000).nullable(),
  url: httpsUrl,
  field: z.string().max(500),
  lens: z.string().max(500),
  keywords: textList,
  metrics: textList,
  citations: z.number().int().min(0).max(1_000_000_000),
  type: shortText,
  providerId: z.string().max(1_000).optional(),
  sourceVerification: z.enum(['verified_metadata', 'metadata_mismatch', 'unverified']).optional(),
  sourceVerificationDetail: z.string().max(2_000).optional(),
}).strict();

export const EvidenceClaimSchema = z.object({
  id: shortText,
  text: z.string().min(1).max(8_000),
  kind: z.enum(['descriptive', 'numeric', 'causal', 'comparative', 'performance']),
  sourceId: shortText,
  sourceUrl: httpsUrl,
  sourceTitle: shortText,
  locator: z.object({
    kind: z.literal('abstract_sentence'),
    sentenceIndex: z.number().int().min(0).max(10_000),
    quote: z.string().min(1).max(8_000),
  }).strict(),
  quantitativeTokens: textList,
  corroboratingSourceIds: z.array(shortText).max(100),
  corroborationStatus: z.literal('candidate_only_unassessed'),
  reviewStatus: z.enum(['human_review_required', 'insufficient_evidence', 'conflicting']),
  evidenceGrade: z.literal('metadata_verified_abstract_only'),
  limitations: textList,
}).strict();

export const DiscoveryAssertionRequestSchema = z.object({
  discovery: DiscoveryRecordSchema,
  claim: EvidenceClaimSchema,
}).strict().superRefine((value, context) => {
  if (value.claim.sourceId !== value.discovery.id) {
    context.addIssue({ code: 'custom', path: ['claim', 'sourceId'], message: 'Claim sourceId must match discovery id.' });
  }
  if (value.claim.sourceUrl !== value.discovery.url) {
    context.addIssue({ code: 'custom', path: ['claim', 'sourceUrl'], message: 'Claim sourceUrl must match discovery url.' });
  }
  if (value.claim.sourceTitle !== value.discovery.title) {
    context.addIssue({ code: 'custom', path: ['claim', 'sourceTitle'], message: 'Claim sourceTitle must match discovery title.' });
  }
});

export type DiscoveryRecord = z.infer<typeof DiscoveryRecordSchema>;
export type EvidenceClaimRecord = z.infer<typeof EvidenceClaimSchema>;
export type DiscoveryAssertionRequest = z.infer<typeof DiscoveryAssertionRequestSchema>;
