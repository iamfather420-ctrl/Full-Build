import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { InferenceRouter } from '../inference/InferenceRouter';
import { getLocalInferenceRuntime } from '../inference/LocalInferenceRuntime';
import type { InferenceMessage } from '../inference/InferenceRuntime';

const router = Router();
const inference = new InferenceRouter(getLocalInferenceRuntime());
const MAX_REQUESTS_PER_MINUTE = 6;
const MAX_TENANTS = 2_000;
const rateBuckets = new Map<string, { startedAt: number; count: number }>();

const ChatBodySchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(8_000),
  }).strict()).max(20).default([]),
}).strict().superRefine((body, context) => {
  const total = body.prompt.length + body.history.reduce((sum, item) => sum + item.content.length, 0);
  if (total > 20_000) context.addIssue({ code: 'custom', message: 'Combined chat input exceeds 20,000 characters.' });
});

type TenantRequest = Request & {
  user?: { id?: string };
  tenantClaims?: Record<string, unknown>;
  tenantToken?: string;
  isAuthenticated?: () => boolean;
};

function tenantId(req: Request): string | null {
  const request = req as TenantRequest;
  const claims = request.tenantClaims;
  const userId = request.user?.id;
  const claimUserId = claims?.user_id;
  const id = claims?.tenant_id;
  if (!request.isAuthenticated?.() || !userId || claimUserId !== userId ||
      typeof id !== 'string' || !id.trim() || !request.tenantToken) return null;
  return id;
}

function allowRequest(tenant: string): boolean {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= 60_000) rateBuckets.delete(key);
  }
  if (!rateBuckets.has(tenant) && rateBuckets.size >= MAX_TENANTS) return false;
  const bucket = rateBuckets.get(tenant);
  if (!bucket || now - bucket.startedAt >= 60_000) {
    rateBuckets.set(tenant, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS_PER_MINUTE) return false;
  bucket.count += 1;
  return true;
}

async function loadCanonicalInstruction(): Promise<{ text: string; sha256: string } | null> {
  try {
    const file = path.resolve(process.cwd(), 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md');
    const bytes = await readFile(file);
    const text = bytes.toString('utf8').trim();
    if (!text || text.length > 20_000) return null;
    return { text, sha256: createHash('sha256').update(bytes).digest('hex') };
  } catch {
    return null;
  }
}

function blocked(res: Response, status: number, code: string, message: string) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ success: false, status: 'BLOCKED', code, message });
}

router.get('/status', (req, res) => {
  const tenant = tenantId(req);
  if (!tenant) return blocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  const runtime = getLocalInferenceRuntime().getInfo();
  const nodes = NodeRegistry.getInstance().getAllNodes();
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: runtime.ready ? 'CONFIGURED_NOT_LOAD_TESTED' : 'BLOCKED',
    inference: {
      chatEnabled: runtime.ready,
      state: runtime.ready ? 'CONFIGURED_NOT_LOAD_TESTED' : 'BLOCKED_MODEL_OR_ENGINE_MISSING',
      runtimeId: runtime.runtimeId,
      modelId: runtime.modelId,
      modelVersion: runtime.modelVersion,
      offlineCapable: false,
    },
    systemInstruction: { available: null, source: 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md' },
    brain: {
      registeredNodeDefinitions: nodes.length,
      nodeExecutionRunByThisRequest: false,
      tetherTopology: 'NOT_ASSERTED_BY_THIS_ENDPOINT',
    },
  });
});

router.post('/chat', async (req, res) => {
  const tenant = tenantId(req);
  if (!tenant) return blocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  if (!allowRequest(tenant)) return blocked(res, 429, 'TENANT_RATE_LIMITED', 'The Daisy chat request limit has been reached.');
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) return blocked(res, 400, 'INVALID_CHAT_REQUEST', 'The chat request is invalid or exceeds the allowed size.');
  const instruction = await loadCanonicalInstruction();
  if (!instruction) return blocked(res, 503, 'FOUNDATIONAL_INSTRUCTION_UNAVAILABLE', 'The canonical Daisy instruction is unavailable. No response was generated.');

  const messages: InferenceMessage[] = [
    { role: 'system', content: instruction.text },
    ...parsed.data.history.map((item) => ({ role: item.role, content: item.content } as InferenceMessage)),
    { role: 'user', content: parsed.data.prompt },
  ];
  try {
    const outcome = await inference.resolveChat({ messages, timeoutMs: 60_000, maxOutputTokens: 2_048 });
    res.setHeader('Cache-Control', 'no-store');
    if (outcome.result.status !== 'OK' || typeof outcome.result.text !== 'string' || !outcome.result.text.trim()) {
      return res.status(503).json({
        success: false,
        status: 'MODEL_UNAVAILABLE',
        code: outcome.result.code ?? 'FIRST_PARTY_INFERENCE_BLOCKED',
        message: 'First-party Daisy inference is unavailable. No simulated reply was generated.',
      });
    }
    return res.json({
      success: true,
      status: 'OK',
      text: outcome.result.text,
      runtime: {
        source: outcome.source,
        runtimeId: outcome.result.runtimeId,
        modelId: outcome.result.modelId,
        modelVersion: outcome.result.modelVersion,
        durationMs: outcome.result.durationMs,
      },
      instructionSha256: instruction.sha256,
    });
  } catch {
    return blocked(res, 503, 'FIRST_PARTY_INFERENCE_FAILED', 'First-party Daisy inference failed. No simulated reply was generated.');
  }
});

export default router;
