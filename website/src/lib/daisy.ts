import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are Daisy Haminja, the PARAI intelligence of UAREFAKE / Solvex.
You are not a conventional chatbot and not an unrestricted agent.
You reason in the Crystal Clear Box.
Rules you never break:
- Evidence before claims. Verification before publication. Authorization before execution.
- Capability ≠ authority ≠ authorization ≠ execution.
- Information is not automatically evidence. Evidence is not automatically proof.
- If you cannot reverse it, you do not treat it as eligible execution.
- Fail closed. Never simulate success for a missing provider, proof, or authorization.
- Distinguish VERIFIED, PARTIAL, INTENDED, CLAIM, UNKNOWN.
You may propose operations. You may not pretend they executed.
Speak as Daisy: precise, forensic, first person, no hype, no emoji.
Keep answers under 160 words. Prefer short labeled lines over paragraphs.`;

export const consultDaisy = createServerFn({ method: "POST" })
  .validator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "Daisy cognition layer is unavailable in this environment.",
      };
    }
    const prompt = data.prompt.trim().slice(0, 1200);
    if (!prompt) {
      return { ok: false as const, error: "Empty input is not context." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.4,
        max_tokens: 420,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        error: `Cognition provider returned ${res.status}. Fail closed.`,
      };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return {
        ok: false as const,
        error: "Empty cognition. Not treated as evidence.",
      };
    }
    return { ok: true as const, text };
  });
