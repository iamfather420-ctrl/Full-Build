export type KnowledgeClass = 'VERIFIED' | 'PROVISIONAL' | 'INFERENCE' | 'EXPERIMENTAL' | 'QUARANTINED';

export interface SourceCorroboration {
  publisher: string;
  contentSha256: string;
}

export interface SourceRecord {
  uri?: string;
  publisher?: string;
  authors?: string[];
  publishedAt?: string;
  contentSha256: string;
  corroborations?: SourceCorroboration[];
  kind?: 'observation' | 'inference' | 'experiment';
}

const SHA256 = /^[a-f0-9]{64}$/i;

/** A domain suffix is not evidence. Trusted learning requires corroboration of the same bytes. */
export function classifySource(source: SourceRecord): { klass: KnowledgeClass; trustedForLearning: boolean; reason: string } {
  if (!SHA256.test(source.contentSha256 ?? '')) {
    return { klass: 'QUARANTINED', trustedForLearning: false, reason: 'Content hash is missing or not SHA-256.' };
  }
  if (source.kind === 'inference') {
    return { klass: 'INFERENCE', trustedForLearning: false, reason: 'An inference is not a verified source.' };
  }
  if (source.kind === 'experiment') {
    return { klass: 'EXPERIMENTAL', trustedForLearning: false, reason: 'An experiment is not trusted knowledge until it is corroborated.' };
  }
  const suffixOnly = typeof source.uri === 'string' && /\.(gov|edu)(\/|$)/i.test(source.uri) && !source.publisher;
  if (suffixOnly) {
    return { klass: 'QUARANTINED', trustedForLearning: false, reason: 'A .gov or .edu suffix is not proof of reliability.' };
  }
  const corroborations = source.corroborations ?? [];
  if (corroborations.some((item) => item.contentSha256.toLowerCase() !== source.contentSha256.toLowerCase())) {
    return { klass: 'QUARANTINED', trustedForLearning: false, reason: 'A corroborating source disagrees on the content hash.' };
  }
  const publishers = new Set(corroborations.map((item) => item.publisher.trim()).filter(Boolean));
  const dated = Number.isFinite(Date.parse(source.publishedAt ?? ''));
  if (source.publisher && dated && publishers.size >= 2 && (source.authors?.length ?? 0) > 0) {
    return { klass: 'VERIFIED', trustedForLearning: true, reason: 'Publisher, date, authorship, and two independent hash matches are present.' };
  }
  return { klass: 'PROVISIONAL', trustedForLearning: false, reason: 'The source is retained, but it is not corroborated strongly enough to enter trusted learning.' };
}
