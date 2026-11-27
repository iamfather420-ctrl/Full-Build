import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { NodeRegistry } from '../nodes/NodeRegistry';
import { InferenceRouter } from '../inference/InferenceRouter';
import { getLocalInferenceRuntime } from '../inference/LocalInferenceRuntime';
import type { InferenceMessage } from '../inference/InferenceRuntime';
import { DiscoveryAssertionRequestSchema } from '../discovery/DiscoverEngineContract';
import { submitAssertion } from '../discovery/DiscoverEngineClient';
import { attestGeneratedReply, buildConversationMessages } from '../brain/DaisyConversationProtocol';
import { DAISY_LOC_GRAMMAR_EVIDENCE } from '../inference/daisyLocGrammarEvidence';

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

function discoveryConfig(): { baseUrl: string; token: string } | null {
  const rawUrl = process.env.DAISY_DISCOVER_ENGINE_URL?.trim();
  const token = process.env.DAISY_DISCOVER_ENGINE_TOKEN?.trim();
  if (!rawUrl || !token || token.length < 32) return null;
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const localDevelopmentHttp = process.env.NODE_ENV !== 'production'
      && url.protocol === 'http:'
      && localHosts.has(hostname);
    if ((url.protocol !== 'https:' && !localDevelopmentHttp) ||
        url.username || url.password || url.search || url.hash) return null;
    return { baseUrl: url.toString(), token };
  } catch {
    return null;
  }
}

function blocked(res: Response, status: number, code: string, message: string) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ success: false, status: 'BLOCKED', code, message });
}

router.get('/status', async (req, res) => {
  const tenant = tenantId(req);
  if (!tenant) return blocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  try {
    const runtime = getLocalInferenceRuntime();
    const [instruction, info] = await Promise.all([
      loadCanonicalInstruction(),
      runtime.probe(),
    ]);
    const nodes = NodeRegistry.getInstance().getAllNodes();
    const modelLoadable = runtime.canAttempt();
    const runtimeEvidence = runtime.publicStatus();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      status: modelLoadable && instruction ? 'CONFIGURED_NOT_LOAD_TESTED' : 'BLOCKED',
      inference: {
        chatEnabled: Boolean(modelLoadable && instruction),
        state: !instruction ? 'BLOCKED_INSTRUCTION_UNAVAILABLE'
          : runtimeEvidence.loadState === 'LOADABLE' ? 'LOADABLE_NOT_YET_INFERRED'
            : runtimeEvidence.loadState === 'READY' ? 'READY_AFTER_REAL_INFERENCE'
              : 'BLOCKED_MODEL_OR_ENGINE_MISSING',
        runtimeId: info.runtimeId,
        modelId: info.modelId,
        modelVersion: info.modelVersion,
        loadState: runtimeEvidence.loadState,
        modelSha256: runtimeEvidence.modelSha256,
        expectedSha256: runtimeEvidence.expectedSha256,
        offlineCapable: false,
      },
      languageTraining: {
        trainingStatus: DAISY_LOC_GRAMMAR_EVIDENCE.training_status,
        trainingRunId: DAISY_LOC_GRAMMAR_EVIDENCE.workflow_run_id,
        datasetSha256: DAISY_LOC_GRAMMAR_EVIDENCE.dataset_sha256,
        inferenceStatus: DAISY_LOC_GRAMMAR_EVIDENCE.inference_status,
        modelLoaded: runtimeEvidence.loadState === 'READY',
        activationAuthorized: DAISY_LOC_GRAMMAR_EVIDENCE.activation_authorized,
      },
      systemInstruction: {
        available: Boolean(instruction),
        sha256: instruction?.sha256 ?? null,
        source: instruction ? 'repository-file' : 'unavailable',
      },
      discovery: {
        reviewConfigured: Boolean(discoveryConfig()),
        sourceSearchAvailable: false,
        resultPolicy: 'WITHHELD_ONLY',
        connectionChecked: false,
      },
      brain: {
        registeredNodeDefinitions: nodes.length,
        nodeExecutionRunByThisRequest: false,
        tetherTopology: 'NOT_ASSERTED_BY_THIS_ENDPOINT',
      },
    });
  } catch {
    return blocked(res, 503, 'DAISY_STATUS_UNAVAILABLE', 'Daisy runtime status could not be verified.');
  }
});

router.post('/chat', async (req, res) => {
  const tenant = tenantId(req);
  if (!tenant) return blocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  if (!allowRequest(tenant)) return blocked(res, 429, 'TENANT_RATE_LIMITED', 'The Daisy chat request limit has been reached.');
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) return blocked(res, 400, 'INVALID_CHAT_REQUEST', 'The chat request is invalid or exceeds the allowed size.');
  const instruction = await loadCanonicalInstruction();
  if (!instruction) return blocked(res, 503, 'FOUNDATIONAL_INSTRUCTION_UNAVAILABLE', 'The canonical Daisy instruction is unavailable. No response was generated.');

  let messages: InferenceMessage[];
  try {
    messages = buildConversationMessages(instruction.text, parsed.data.history, parsed.data.prompt);
  } catch {
    return blocked(res, 400, 'INVALID_CONVERSATION_CONTEXT', 'The conversation context is invalid. No inference request was made.');
  }
  try {
    const outcome = await inference.resolveChat({ messages, timeoutMs: 60_000, maxOutputTokens: 2_048 });
    res.setHeader('Cache-Control', 'no-store');
    if (outcome.result.status !== 'OK') {
      return res.status(503).json({
        success: false,
        status: 'MODEL_UNAVAILABLE',
        code: outcome.result.code ?? 'FIRST_PARTY_INFERENCE_BLOCKED',
        message: 'First-party Daisy inference is unavailable. No simulated reply was generated.',
      });
    }
    let reply: ReturnType<typeof attestGeneratedReply>;
    try {
      reply = attestGeneratedReply(outcome.result.text);
    } catch {
      return blocked(res, 503, 'INVALID_MODEL_COMPLETION', 'The local model returned an invalid completion. No reply was delivered.');
    }
    return res.json({
      success: true,
      status: 'OK',
      text: reply.text,
      replyEvidence: reply.evidence,
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

router.post('/discovery/review', async (req, res) => {
  const tenant = tenantId(req);
  if (!tenant) return blocked(res, 401, 'AUTHENTICATED_TENANT_REQUIRED', 'An authenticated SolveX tenant session is required.');
  if (!allowRequest(tenant)) return blocked(res, 429, 'TENANT_RATE_LIMITED', 'The Daisy request limit has been reached.');
  if (Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8') > 60_000) {
    return blocked(res, 400, 'INVALID_DISCOVERY_ASSERTION', 'The discovery assertion exceeds the allowed request size.');
  }
  const parsed = DiscoveryAssertionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return blocked(res, 400, 'INVALID_DISCOVERY_ASSERTION', 'The discovery assertion is invalid or incomplete.');
  }
  const config = discoveryConfig();
  if (!config) {
    return blocked(res, 503, 'DISCOVERY_NOT_CONFIGURED', 'Withheld-only Discover-Engine review is not configured. No outbound request was made.');
  }
  try {
    const result = await submitAssertion(config.baseUrl, config.token, parsed.data);
    res.setHeader('Cache-Control', 'no-store');
    if (!result.review) {
      return blocked(res, 503, 'DISCOVERY_REVIEW_UNAVAILABLE', 'Discover-Engine did not return a valid withheld-only review.');
    }
    return res.status(200).json({
      status: 'WITHHELD',
      publishable: false,
      withheld: true,
      review: result.review,
    });
  } catch {
    return blocked(res, 503, 'DISCOVERY_REVIEW_FAILED', 'Discover-Engine review failed. No assertion was published.');
  }
});

export default router;
