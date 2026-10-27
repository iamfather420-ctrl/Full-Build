import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { InferenceRouter } from '../src/inference/InferenceRouter';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Load the canonical creator-approved instruction. If it is missing, Daisy chat
// fails closed rather than silently running under an incomplete or improvised prompt.
let foundationalSystemInstruction: string | null = null;
const instructionPaths = [
  path.join(process.cwd(), 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md'),
  path.join(process.cwd(), '..', 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md'),
  path.join(process.cwd(), 'Solvex-core', 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md')
];
for (const instructionPath of instructionPaths) {
  try {
    foundationalSystemInstruction = readFileSync(instructionPath, 'utf8').trim();
    if (foundationalSystemInstruction) break;
  } catch {
    // Try the next known repository-root location.
  }
}

// First-party inference is preferred. External providers stay opt-in only.
const apiKey = process.env.GEMINI_API_KEY;
const allowExternalModelProvider = process.env.ALLOW_EXTERNAL_MODEL_PROVIDER === 'true';
let ai: GoogleGenAI | null = null;
const inferenceRouter = new InferenceRouter();

if (apiKey && allowExternalModelProvider) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'solvex-sovereign-core' } }
  });
} else {
  console.warn(
    'External model provider is disabled by default. Configure DAISY_MODEL_PATH + DAISY_INFERENCE_ENGINE for first-party inference, or set ALLOW_EXTERNAL_MODEL_PROVIDER=true only if explicitly authorized.'
  );
}

// Payment creation is deliberately disabled. Never fabricate transaction IDs,
// checkout URLs, provider responses, or a successful payment intent.
app.post('/api/pay/create', (_req, res) => {
  return res.status(410).json({
    success: false,
    code: 'PAYMENTS_DISABLED',
    status: 'BLOCKED',
    message: 'Payment processing is disabled pending a separately reviewed PayPal integration.'
  });
});

// Return only repositories actually received from GitHub. No fabricated fallback dataset.
app.post('/api/github/repos', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) {
    return res.status(400).json({ success: false, error: 'A valid GitHub username is required.' });
  }
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'solvex-sovereign-unifier' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch('https://api.github.com/users/' + encodeURIComponent(username) + '/repos?sort=updated&per_page=30', { headers });
    if (!response.ok) {
      return res.status(502).json({ success: false, code: 'GITHUB_LOOKUP_FAILED', upstreamStatus: response.status, error: 'GitHub did not return a successful repository listing; no substitute data was used.' });
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return res.status(502).json({ success: false, code: 'INVALID_GITHUB_RESPONSE' });
    const result = data.map((repo: any) => ({ id: repo.id, name: repo.name, description: repo.description, url: repo.html_url, stars: repo.stargazers_count, language: repo.language, updatedAt: repo.updated_at }));
    return res.json({ success: true, repos: result, source: 'github_api' });
  } catch {
    return res.status(502).json({ success: false, code: 'GITHUB_LOOKUP_UNAVAILABLE', error: 'GitHub repository lookup failed; no simulated repository data was returned.' });
  }
});

app.post('/api/github/unify', (_req, res) => {
  return res.status(501).json({
    success: false,
    code: 'UNIFICATION_NOT_IMPLEMENTED',
    status: 'BLOCKED',
    message: 'Repository unification is not available until real source acquisition, provenance checks, build verification, and deployment authorization are implemented.'
  });
});

// Inference status for operators (no secrets).
app.get('/api/inference/status', async (_req, res) => {
  const outcome = await inferenceRouter.resolveChat({
    messages: [{ role: 'user', content: 'ping' }],
    timeoutMs: 1,
  }).catch(() => null);
  // Re-probe without relying on the dummy generate path for status-only.
  const { getLocalInferenceRuntime } = await import('../src/inference/LocalInferenceRuntime');
  const info = await getLocalInferenceRuntime().probe();
  return res.json({
    first_party: info,
    external_provider_opt_in: allowExternalModelProvider,
    external_provider_configured: Boolean(ai),
    foundational_instruction_loaded: Boolean(foundationalSystemInstruction),
  });
});

// Daisy: foundational instruction required. Prefer first-party local inference.
// External Gemini only if explicitly opted in. Never invent successful intelligence.
app.post('/api/chat', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const rawHistory = Array.isArray(req.body?.messageHistory) ? req.body.messageHistory : [];
  if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required.' });
  if (prompt.length > 20000) return res.status(413).json({ success: false, error: 'Prompt exceeds the allowed size.' });
  if (!foundationalSystemInstruction) {
    return res.status(503).json({
      success: false,
      code: 'FOUNDATIONAL_INSTRUCTION_UNAVAILABLE',
      status: 'BLOCKED',
      error: 'Daisy cannot start because its canonical system instruction could not be loaded.',
    });
  }

  const history = rawHistory
    .filter((msg: any) => msg && (msg.sender === 'user' || msg.sender === 'assistant' || msg.sender === 'model' || msg.sender === 'ai') && typeof msg.text === 'string')
    .slice(-20);

  const messages = [
    { role: 'system' as const, content: foundationalSystemInstruction },
    ...history.map((msg: any) => ({
      role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(msg.text).slice(0, 8000),
    })),
    { role: 'user' as const, content: prompt },
  ];

  // 1) First-party local runtime
  const localOutcome = await inferenceRouter.resolveChat({ messages, timeoutMs: 60_000 });
  if (localOutcome.result.status === 'OK' && localOutcome.result.text) {
    return res.json({
      success: true,
      text: localOutcome.result.text,
      source: 'first_party_local',
      runtime: localOutcome.result.runtimeId,
      modelId: localOutcome.result.modelId,
      modelVersion: localOutcome.result.modelVersion,
      durationMs: localOutcome.result.durationMs,
    });
  }

  // 2) Optional external provider (explicit opt-in only)
  if (ai) {
    try {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = history.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: String(msg.text).slice(0, 8000) }],
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: { systemInstruction: foundationalSystemInstruction, temperature: 0.1 },
      });
      const replyText = response.text?.trim();
      if (!replyText) {
        return res.status(502).json({
          success: false,
          code: 'EMPTY_MODEL_RESPONSE',
          status: 'BLOCKED',
          error: 'The configured external model returned no response.',
        });
      }
      return res.json({ success: true, text: replyText, source: 'configured_external_model' });
    } catch {
      return res.status(502).json({
        success: false,
        code: 'MODEL_REQUEST_FAILED',
        status: 'BLOCKED',
        error: 'The configured external model request failed. No simulated response was generated.',
      });
    }
  }

  // 3) Fail closed — report the first-party blocker honestly
  return res.status(503).json({
    success: false,
    code: localOutcome.result.code || 'FIRST_PARTY_MODEL_UNAVAILABLE',
    status: 'BLOCKED',
    error: localOutcome.result.error
      || 'External model providers are disabled. No prompt was sent to a third party; no first-party inference runtime is currently connected.',
    runtime: localOutcome.runtime,
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SolveX Sovereign Core server running at http://0.0.0.0:${PORT}`);
  });
}

start();
