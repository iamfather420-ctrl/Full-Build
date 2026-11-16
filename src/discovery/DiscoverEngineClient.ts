export interface DiscoveryReview {
  service: string;
  publishable: boolean;
  withheld: boolean;
  reviewStatus: 'human_review_required' | 'insufficient_evidence';
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
  return { status: response.status, review };
}
