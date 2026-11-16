export interface DiscoveryReview {
  service: string;
  publishable: boolean;
  withheld: boolean;
  reviewStatus: 'HUMAN_REVIEW_REQUIRED' | 'INSUFFICIENT_EVIDENCE' | 'WITHHELD' | 'CONTRADICTED' | 'UNVERIFIED';
  passageValid: boolean;
  reason: string;
}

export async function submitAssertion(baseUrl: string, token: string, body: unknown): Promise<{ status: number; review: DiscoveryReview | null }> {
  const response = await fetch(new URL('/v1/assertions', baseUrl), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const review = response.ok ? await response.json() as DiscoveryReview : null;
  if (review && (review.publishable !== false || review.reviewStatus === 'VERIFIED' as never || !review.withheld)) {
    throw new Error('Discover-Engine returned a response that would publish an unverified assertion.');
  }
  return { status: response.status, review };
}
