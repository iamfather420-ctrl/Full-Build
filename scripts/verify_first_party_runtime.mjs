import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { FirstPartyInferenceRuntime } from '../src/brain/FirstPartyInferenceRuntime';

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

// First-party inference is deliberately disabled until an implementation has been
// validated in this source tree. This keeps the runtime fail-closed and prevents
// the UI from claiming a local model is active without evidence.
const firstPartyRuntime = FirstPartyInferenceRuntime.healthCheck();

// External model providers are disabled by default. Daisy must not send prompts
// to a third party unless the creator explicitly opts in at runtime.
const apiKey = process.env.GEMINI_API_KEY;
const allowExternalModelProvider = process.env.ALLOW_EXTERNAL_MODEL_PROVIDER === 'true';
let ai: GoogleGenAI | null = null;

if (apiKey && allowExternalModelProvider) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'solvex-sovereign-core' } }
  });
} else {
  console.warn(
    'External model provider is disabled by default. Configure a first-party inference runtime, or explicitly set ALLOW_EXTERNAL_MODEL_PROVIDER=true to authorize the existing Gemini adapter.'
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

// Repository unification must perform real clone, provenance, dependency, and
// verification work. Until that implementation exists, do not return simulated
// build configurations or suggest an unauthenticated deployment is ready.
app.post('/api/github/unify', (_req, res) => {
  return res.status(501).json({
    success: false,
    code: 'UNIFICATION_NOT_IMPLEMENTED',
    status: 'BLOCKED',
    message: 'Repository unification is not available until real source acquisition, provenance checks, build verification, and deployment authorization are implemented.'
  });
});

// Daisy uses the canonical foundational instruction and fails closed if either
// that instruction or the configured model provider is unavailable. No fake AI
// replies, purchase-intent directives, or simulated operational success are returned.
app.post('/api/chat', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const rawHistory = Array.isArray(req.body?.messageHistory) ? req.body.messageHistory : [];
  if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required.' });
  if (prompt.length > 20000) return res.status(413).json({ success: false, error: 'Prompt exceeds the allowed size.' });
  if (!foundationalSystemInstruction) return res.status(503).json({ success: false, code: 'FOUNDATIONAL_INSTRUCTION_UNAVAILABLE', status: 'BLOCKED', error: 'Daisy cannot start because its canonical system instruction could not be loaded.' });

  if (!firstPartyRuntime.ok) {
    return res.status(503).json({
      success: false,
      code: firstPartyRuntime.code,
      status: firstPartyRuntime.status,
      error: firstPartyRuntime.message,
    });
  }

  if (!ai) return res.status(503).json({
    success: false,
    code: allowExternalModelProvider ? 'MODEL_PROVIDER_UNAVAILABLE' : 'EXTERNAL_MODEL_PROVIDER_DISABLED',
    status: 'BLOCKED',
    error: allowExternalModelProvider
      ? 'No explicitly authorized model provider is configured. No simulated response was generated.'
      : 'External model providers are disabled. No prompt was sent to a third party; no first-party inference runtime is currently connected.'
  });
  try {
    const history = rawHistory.filter((msg: any) => msg && (msg.sender === 'user' || msg.sender === 'assistant' || msg.sender === 'model') && typeof msg.text === 'string').slice(-20);
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: String(msg.text).slice(0, 8000) }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: { systemInstruction: foundationalSystemInstruction, temperature: 0.1 }
    });
    const replyText = response.text?.trim();
    if (!replyText) return res.status(502).json({ success: false, code: 'EMPTY_MODEL_RESPONSE', status: 'BLOCKED', error: 'The configured model returned no response.' });
    return res.json({ success: true, text: replyText, source: 'configured_model' });
  } catch {
    return res.status(502).json({ success: false, code: 'MODEL_REQUEST_FAILED', status: 'BLOCKED', error: 'The configured model request failed. No simulated response was generated.' });
  }
});

// Setup Vite and Static files
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
    console.log(`🚀 SolveX Sovereign Core server running at http://0.0.0.0:${PORT}`);
  });
}

start();
