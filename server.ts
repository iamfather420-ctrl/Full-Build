import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'node:path';
import { readFileSync, statSync, accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NeonStore } from './src/database/NeonPersistence';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function daisyReadiness() {
  const modelPath = process.env.DAISY_MODEL_PATH || '/opt/daisy/model.gguf';
  const enginePath = process.env.DAISY_LLAMA_CLI || '/usr/local/bin/llama-cli';
  let modelStatus = 'MODEL_DOWNLOAD_PENDING';
  try {
    const raw = readFileSync('/tmp/daisy-model-status.json', 'utf8');
    modelStatus = String(JSON.parse(raw).status || modelStatus);
  } catch {
    // The background model initializer may not have written its first status yet.
  }
  let modelBytes = 0;
  try {
    modelBytes = statSync(modelPath).size;
  } catch {
    // Model is not yet present.
  }
  let engineAvailable = false;
  try {
    accessSync(enginePath, constants.X_OK);
    engineAvailable = true;
  } catch {
    // Runtime binary is unavailable.
  }
  const databaseConfigured = Boolean(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL ||
    process.env.Database_url || process.env.DATABASE_URL_FALLBACK
  );
  // Configuration is not connection evidence. Probe Neon with a real SELECT 1
  // before advertising readiness; connection errors remain fail-closed.
  let databaseConnected = false;
  if (databaseConfigured) {
    try {
      databaseConnected = await NeonStore.getInstance().connect();
    } catch {
      databaseConnected = false;
    }
  }
  const modelVerified = modelStatus === 'MODEL_FILE_VERIFIED' &&
    modelBytes === Number(process.env.DAISY_MODEL_BYTES || 105454176);
  return {
    status: databaseConnected && modelVerified && engineAvailable ? 'ready' : 'not_ready',
    database: { configured: databaseConfigured, connected: databaseConnected },
    model: { status: modelStatus, verified: modelVerified, bytes: modelBytes },
    inferenceEngine: { available: engineAvailable },
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 8080);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb', strict: true }));

  // Liveness must never wait for model download, database access, or inference.
  app.get('/healthz', (_req, res) => res.status(200).json({
    status: 'ok',
    payments_enabled: false,
  }));
  app.get('/readyz', async (_req, res) => {
    const readiness = await daisyReadiness();
    res.setHeader('Cache-Control', 'no-store');
    res.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
  });

  // The isolated model-conversation smoke test must not load auth, Neon, or
  // outreach modules. This mode intentionally exposes no application API.
  if (process.env.DAISY_INFERENCE_SMOKE_ONLY === 'true') {
    app.get('/api/*', (_req, res) => res.status(503).json({
      success: false,
      code: 'INFERENCE_SMOKE_ONLY',
      message: 'Application APIs are disabled in isolated model-verification mode.',
    }));
  } else {
    const { default: apiRouter } = await import('./src/server/apiRouter');
    app.use('/api', apiRouter);
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false, fallthrough: true }));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[SOLVEX] listening on 0.0.0.0:${port}; payments disabled; Daisy initialization is asynchronous`);
  });
}

startServer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
