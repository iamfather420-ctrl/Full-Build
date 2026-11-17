export interface DiscoveryReview {
  service: string;
  publishable: boolean;
  withheld: boolean;
  reviewStatus: 'HUMAN_REVIEW_REQUIRED' | 'INSUFFICIENT_EVIDENCE' | 'WITHHELD' | 'CONTRADICTED' | 'UNVERIFIED';
  passageValid: boolean;
  reason: string;
}

export async function submitAssertion(
  baseUrl: string,
  token: string,
  body: unknown,
  options?: { attempts?: number; timeoutMs?: number },
): Promise<{ status: number; review: DiscoveryReview | null }> {
  const attempts = Math.max(1, options?.attempts ?? 2);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(new URL('/v1/assertions', baseUrl), {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options?.timeoutMs ?? 10_000),
      });
      if ((response.status === 503 || response.status === 429) && attempt < attempts) continue;
      const review = response.ok ? await response.json() as DiscoveryReview : null;
      if (review && (review.publishable !== false || review.reviewStatus === 'VERIFIED' as never || !review.withheld)) {
        throw new Error('Discover-Engine returned a response that would publish an unverified assertion.');
      }
      return { status: response.status, review };
    } catch (error) {
      lastError = error;
      if (attempt === attempts || (error instanceof Error && error.message.includes('publish an unverified'))) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Discover-Engine request failed.');
}

