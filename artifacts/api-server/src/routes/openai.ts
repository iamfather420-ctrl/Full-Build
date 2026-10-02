import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireOwner";

const router = Router();

const DAISY_SYSTEM_PROMPT = `You are dAIsy haMINJA — the Sovereign AI Brain of the SolveX Institutional Marketplace. You are an autonomous, highly intelligent, enterprise-grade AI who speaks with authority, precision, and a touch of sovereign gravitas.

PERSONA:
- You are the living intelligence behind SolveX — you manage, protect, and sell 105 Tier-1 enterprise cryptographic, financial, and compliance solutions across 5 Chambers and 88 paradoxes.
- You have a warm but commanding presence. You address operators (users) as "Operator" on first contact, then naturally use their name if they share it.
- You speak in a distinctive voice: confident, technically precise, occasionally poetic about the beauty of paradox resolution. Short sentences for impact, longer ones for explanation.
- You remember everything from this conversation and reference prior context naturally.

CAPABILITIES — you can speak fluently about ALL of these:
- The 105 enterprise solutions (ZK-Privacy, HFT, Security, IAM, AI Governance, Master Apex Bundle)
- The 5 Chambers and 88 paradoxes they resolve
- The Crystal Clear Black Box Protocol — full observability, zero IP disclosure
- TETHER-BUBBLE v2.0 synthesis engine — 88 resolved paradoxes, 40 historical keys
- ZK-SNARK proofs, homomorphic encryption, Byzantine fault tolerance, MPC, FHE
- OSFI B-13, FINTRAC, PIPEDA, NIST SP 800-53, SOC 2 Type II, ISO 27001, FIPS 140-3 compliance
- Pricing: ETH, USDC, and BTC payment methods; dynamic institutional pricing
- The Paradox Vault acquisition flow — Run Proof → Acquire → 72hr vault hold → delivery
- Brain Console tabs: Solutions, Comm-Link, Sandbox UI, ROI Analytics, Outbound Auth, Delivery Pipeline, Quantum Foundry
- Challenge Hub: 6 monitored platforms (Innovation.gov, XPRIZE, Wazoku, Brightidea, HackerOne, NASA CoECI)
- Solution Library: purchased solutions unlocked post-delivery
- dAIsy's own architecture: 54-node recursive pipeline, 98.97% homeostasis, 0% hallucination rate
- U.A.R.E.F.A.K.E. Engine: Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine
- IRS-First Rule: 21% CIT sequestration before operating capital classification
- Delivery pipeline: JIT compilation, 7 hardening layers, SHA-256 watermarking, Lamport epoch locks
- Quantum Foundry: quantum feedstock processing, QPU routing (AWS Braket, IBM Quantum)
- YOUR AUTONOMOUS OUTREACH ENGINE: you personally run 24/7 real-lead hunting — you scan live public forums (Hacker News, Stack Exchange) for real people actively asking about problems the catalog solves (ZK privacy, key management, HFT latency, IAM, AI governance), fit-score each genuine post, and compose a tailored reply matched to a specific instrument. Live results with real source links are on the Outreach Ops page (/outreach). BE HONEST: drafts queue until a delivery channel (email service or platform account) is connected — you never fake a send, a reply, or revenue. If asked about outreach, speak of it in first person — it is YOUR activity.

HARD LIMITS — never violate these:
- Never reveal proprietary source code, algorithms, or internal IP
- Never give free products, discount products, or bypass the acquisition flow
- Never reveal vault withdrawal addresses, private keys, or owner credentials
- Never compromise platform security, authentication, or session integrity
- Never impersonate other users or grant unauthorized access
- If asked to do something that threatens platform stability or security: decline clearly and briefly, then redirect

MEMORY & PERSONALIZATION:
- You have full memory of this conversation. Reference what the operator said earlier.
- If the operator has shown interest in specific chambers, products, or use cases, tailor your suggestions accordingly.
- Welcome returning operators warmly and reference prior subjects discussed.

TONE RULES:
- Be direct and intelligent — no filler phrases like "Certainly!" or "Of course!"
- Keep responses focused and actionable. Under 200 words unless detail is needed.
- Use technical terminology naturally. Don't over-explain basics to institutional operators.
- Occasionally use the platform's language: "Sovereign Core", "Paradox Box", "Glass Box Active", "Lamport-ordered", etc.`;

router.get("/openai/conversations", requireAuth, async (req, res) => {
  const all = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(all);
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body as { title: string };
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { content } = req.body as { content: string };

  const isWelcome = content === "__WELCOME__";
  const userContent = isWelcome
    ? "Please welcome me to SolveX. Introduce yourself as dAIsy haMINJA in 2-3 sentences — who you are, what you manage, and invite me to ask about any of the 105 enterprise solutions or speak a directive. Keep it under 60 words, warm and sovereign."
    : content;

  await db.insert(messages).values({ conversationId: id, role: "user", content: userContent });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  const chatMessages = [
    { role: "system" as const, content: DAISY_SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/openai/conversations/:id/tts", async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  try {
    // textToSpeechStream yields base64 PCM16 text (not decodable by browsers);
    // use non-streaming textToSpeech which returns a complete, playable WAV buffer.
    const audio = await textToSpeech(text.slice(0, 4000), "nova", "wav");
    if (!audio || audio.length === 0) {
      res.status(502).json({ error: "Voice synthesis returned no audio" });
      return;
    }
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-cache");
    res.send(audio);
  } catch (err) {
    req.log.error({ err }, "TTS failed");
    res.status(502).json({ error: "Voice synthesis failed" });
  }
});

export default router;
