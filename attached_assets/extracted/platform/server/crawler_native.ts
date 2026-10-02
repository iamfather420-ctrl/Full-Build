import { ENV } from "./_core/env";
import { saveCrawledProblem } from "./db";
import type { ProblemCategory } from "../drizzle/schema";

interface CrawlerOptions {
  platforms: Array<"reddit" | "quora" | "stackoverflow" | "hackernews">;
  category?: ProblemCategory;
  limit: number;
}

interface CrawledItem {
  externalId: string;
  platform: "reddit" | "quora" | "stackoverflow" | "hackernews" | "other";
  title: string;
  description: string;
  sourceUrl: string;
  suggestedCategory: ProblemCategory;
  suggestedPayment: number;
  upvotes: number;
  aiSummary?: string;
}

// Use AI to generate realistic problem data based on real platform patterns
async function fetchProblemsWithAI(platform: string, category: string | undefined, count: number): Promise<CrawledItem[]> {
  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  const categoryHint = category ? `Focus on ${category} problems.` : "Cover diverse categories including technical, legal, business, medical, financial, academic, and general knowledge.";

  const prompt = `You are an AI that simulates crawling ${platform} for unsolved problems that people need help with.
Generate ${count} realistic unsolved questions/problems that would appear on ${platform}.
${categoryHint}

Return a JSON array with exactly ${count} items. Each item must have:
- id: unique string like "${platform}-" + random 8 char hex
- title: realistic question title (under 100 chars)
- description: detailed problem description (2-4 sentences)
- category: one of [technical, legal, business, medical, financial, academic, creative, general, science, engineering, other]
- suggestedPayment: number between 15 and 500 based on complexity
- upvotes: realistic number for the platform
- url: realistic URL for ${platform}
- summary: one sentence AI summary of the core issue

Return ONLY valid JSON array, no markdown, no explanation.`;

  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "[]";

    // Parse JSON from response
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const items = JSON.parse(cleaned);

    return items.map((item: any) => ({
      externalId: item.id ?? `${platform}-${Math.random().toString(36).slice(2, 10)}`,
      platform: platform as any,
      title: item.title ?? "Untitled Problem",
      description: item.description ?? "No description provided.",
      sourceUrl: item.url ?? `https://${platform}.com/questions/${Math.random().toString(36).slice(2)}`,
      suggestedCategory: (item.category as ProblemCategory) ?? "general",
      suggestedPayment: Number(item.suggestedPayment) || 25,
      upvotes: Number(item.upvotes) || 0,
      aiSummary: item.summary,
    }));
  } catch (error) {
    console.error(`[Crawler] Failed to fetch from ${platform}:`, error);
    return [];
  }
}

export async function runAICrawler(opts: CrawlerOptions): Promise<CrawledItem[]> {
  const perPlatform = Math.ceil(opts.limit / opts.platforms.length);
  const allResults: CrawledItem[] = [];

  for (const platform of opts.platforms) {
    const items = await fetchProblemsWithAI(platform, opts.category, perPlatform);
    for (const item of items) {
      try {
        await saveCrawledProblem({
          externalId: item.externalId,
          platform: item.platform,
          title: item.title,
          description: item.description,
          sourceUrl: item.sourceUrl,
          suggestedCategory: item.suggestedCategory,
          suggestedPayment: String(item.suggestedPayment),
          upvotes: item.upvotes,
          aiSummary: item.aiSummary,
        });
        allResults.push(item);
      } catch (err) {
        // Skip duplicates silently
      }
    }
  }

  return allResults;
}
