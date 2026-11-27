export interface GitHubResponse {
  status: number;
  body: unknown;
  remaining: string | null;
}

export interface GitHubClient {
  getJson(url: string): Promise<GitHubResponse>;
  getText(url: string): Promise<{ status: number; body: string }>;
}

export function liveGitHubClient(fetchImpl: typeof fetch = fetch): GitHubClient {
  return {
    async getJson(url) {
      const response = await fetchImpl(url, {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "solvex-full-build-readiness",
          "x-github-api-version": "2022-11-28",
        },
      });
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = { unparsed: text.slice(0, 240) };
        }
      }
      return {
        status: response.status,
        body,
        remaining: response.headers.get("x-ratelimit-remaining"),
      };
    },
    async getText(url) {
      const response = await fetchImpl(url, {
        headers: {
          accept: "application/vnd.github.raw+json",
          "user-agent": "solvex-full-build-readiness",
        },
      });
      return { status: response.status, body: await response.text() };
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
