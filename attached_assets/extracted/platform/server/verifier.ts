import { ENV } from "./_core/env";

interface VerificationResult {
  score: number; // 0-100
  notes: string;
  approved: boolean;
}

export async function verifyWithAI(
  problemDescription: string,
  solutionContent: string
): Promise<VerificationResult> {
  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  const prompt = `You are an expert solution verifier. Your job is to evaluate whether a proposed solution adequately addresses a given problem.

PROBLEM:
${problemDescription}

PROPOSED SOLUTION:
${solutionContent}

Evaluate the solution on these criteria:
1. Relevance: Does it directly address the problem?
2. Completeness: Is the answer thorough and complete?
3. Accuracy: Is the information correct and reliable?
4. Clarity: Is the solution clearly explained?
5. Actionability: Can the person actually use this solution?

Respond with ONLY a JSON object in this exact format:
{
  "score": <number 0-100>,
  "approved": <true if score >= 70, false otherwise>,
  "notes": "<2-3 sentences explaining the evaluation and score>"
}

Be strict but fair. A score of 70+ means the solution is genuinely helpful and correct.`;

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
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return {
      score: Math.min(100, Math.max(0, Number(result.score) || 0)),
      notes: result.notes ?? "Verification completed.",
      approved: Boolean(result.approved),
    };
  } catch (error) {
    console.error("[Verifier] AI verification failed:", error);
    // Fallback: manual review needed
    return {
      score: 0,
      notes: "Automatic verification failed. Manual review required.",
      approved: false,
    };
  }
}
