import { createHash } from 'node:crypto';
import { access, appendFile, constants, mkdir, open, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  DEFAULT_INFERENCE_TIMEOUT_MS,
  InferenceRequest,
  InferenceResult,
  InferenceRuntime,
  InferenceRuntimeInfo,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_PROMPT_CHARS,
} from './InferenceRuntime';

const MAX_OUTPUT_TOKENS = 512;
const MIN_TIMEOUT_MS = 1_000;
const DEFAULT_CONTEXT_TOKENS = 8192;
const AUDIT_PATH = process.env.DAISY_AUDIT_LOG ?? '/workspace/artifacts/inference-audit.jsonl';

async function sha256File(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function fileMagic(filePath: string): Promise<string> {
  const handle = await open(filePath, 'r');
  try {
    const buf = Buffer.alloc(4);
    await handle.read(buf, 0, 4, 0);
    return buf.toString('utf8');
  } finally {
    await handle.close();
  }
}

function clampTimeout(requested: number | undefined): number {
  const value = requested ?? DEFAULT_INFERENCE_TIMEOUT_MS;
  if (!Number.isFinite(value)) return DEFAULT_INFERENCE_TIMEOUT_MS;
  return Math.max(MIN_TIMEOUT_MS, Math.min(Math.floor(value), DEFAULT_INFERENCE_TIMEOUT_MS));
}

function clampOutputTokens(requested: number | undefined): number {
  const value = requested ?? 160;
  if (!Number.isFinite(value)) return 160;
  return Math.max(1, Math.min(Math.floor(value), MAX_OUTPUT_TOKENS));
}

async function writeAudit(entry: Record<string, string | number | boolean | null>): Promise<void> {
  try {
    await mkdir(path.dirname(AUDIT_PATH), { recursive: true });
    await appendFile(AUDIT_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // A missing log must not be rewritten as a successful inference.
  }
}

async function isNonEmptyReadableFile(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size <= 0) return false;
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function isExecutableFile(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function validateRequest(request: InferenceRequest): string | null {
  if (!request || !Array.isArray(request.messages) || request.messages.length === 0) {
    return 'Messages are required.';
  }
  if (request.messages.length > MAX_HISTORY_MESSAGES + 2) {
    return 'Message history exceeds the allowed size.';
  }
  let total = 0;
  for (const msg of request.messages) {
    if (!msg || typeof msg.content !== 'string' || !['system', 'user', 'assistant'].includes(msg.role)) {
      return 'Each message must include a valid role and string content.';
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return 'A message exceeds the allowed size.';
    }
    total += msg.content.length;
  }
  if (total > MAX_PROMPT_CHARS) {
    return 'Combined prompt size exceeds the allowed limit.';
  }
  return null;
}

/**
 * Local first-party inference runtime.
 *
 * Requires:
 * - DAISY_MODEL_PATH: path to model weights (e.g. GGUF)
 * - DAISY_INFERENCE_ENGINE: path to a local CLI engine (e.g. llama-cli) that accepts
 *   --model, --prompt, and prints completion text to stdout
 * - optional DAISY_MODEL_ID / DAISY_MODEL_VERSION for evidence labels
 *
 * Without both model and engine present and readable, every generate() call returns
 * MODEL_UNAVAILABLE / BLOCKED. No mock or third-party fallback is performed here.
 */
export class LocalInferenceRuntime implements InferenceRuntime {
  private readonly modelPath: string | null;
  private readonly enginePath: string | null;
  private readonly modelId: string | null;
  private readonly modelVersion: string | null;
  private readonly expectedSha256: string | null;
  private readonly contextTokens: number;
  private modelSha256: string | null = null;
  private blockReason: string | null = null;
  private ready = false;
  private probed = false;

  constructor(options?: {
    modelPath?: string | null;
    enginePath?: string | null;
    modelId?: string | null;
    modelVersion?: string | null;
    expectedSha256?: string | null;
    contextTokens?: number | null;
  }) {
    this.modelPath = options?.modelPath
      ?? process.env.DAISY_MODEL_PATH
      ?? null;
    this.enginePath = options?.enginePath
      ?? process.env.DAISY_INFERENCE_ENGINE
      ?? null;
    this.modelId = options?.modelId ?? process.env.DAISY_MODEL_ID ?? null;
    this.modelVersion = options?.modelVersion ?? process.env.DAISY_MODEL_VERSION ?? null;
    this.expectedSha256 = (options?.expectedSha256 ?? process.env.DAISY_MODEL_SHA256 ?? null)?.toLowerCase() ?? null;
    const requestedContext = options?.contextTokens ?? Number(process.env.DAISY_N_CTX ?? DEFAULT_CONTEXT_TOKENS);
    this.contextTokens = Number.isFinite(requestedContext)
      ? Math.max(256, Math.min(Math.floor(requestedContext), DEFAULT_CONTEXT_TOKENS))
      : DEFAULT_CONTEXT_TOKENS;
  }

  getInfo(): InferenceRuntimeInfo {
    return {
      runtimeId: 'daisy-local-inference/v1',
      modelId: this.modelId,
      modelVersion: this.modelVersion,
      modelPath: this.modelPath,
      enginePath: this.enginePath,
      ready: this.ready,
      offlineCapable: false,
      notes: this.ready
        ? 'Local model and engine paths are present; generative calls use the first-party engine only. Network isolation is not enforced by this runtime, so offline capability is not attested.'
        : 'Model weights and/or inference engine are not configured. Generative inference remains BLOCKED. Network isolation is not enforced by this runtime, so offline capability is not attested. Formal verification and deterministic logic are separate subsystems.',
    };
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Probe filesystem once (or again after configuration change). */
  async probe(): Promise<InferenceRuntimeInfo> {
    this.probed = true;
    this.ready = false;
    this.modelSha256 = null;
    this.blockReason = null;
    if (!this.modelPath || !this.enginePath) {
      this.blockReason = 'Model path or engine path is not configured.';
      return this.getInfo();
    }
    if (!this.expectedSha256 || !/^[a-f0-9]{64}$/.test(this.expectedSha256)) {
      this.blockReason = 'Model SHA-256 is not configured. Identity is unverified.';
      return this.getInfo();
    }
    const modelPath = path.resolve(this.modelPath);
    const enginePath = path.resolve(this.enginePath);
    if (modelPath === enginePath) {
      this.blockReason = 'Engine path and model path are the same file.';
      return this.getInfo();
    }
    const modelOk = await isNonEmptyReadableFile(modelPath);
    const engineOk = await isExecutableFile(enginePath);
    if (!modelOk || !engineOk) {
      this.blockReason = 'Model file or engine binary is missing, empty, or not executable.';
      return this.getInfo();
    }
    try {
      if (await fileMagic(modelPath) !== 'GGUF') {
        this.blockReason = 'Model file is not a GGUF.';
        return this.getInfo();
      }
      const digest = await sha256File(modelPath);
      this.modelSha256 = digest;
      if (digest !== this.expectedSha256) {
        this.blockReason = 'Model SHA-256 does not match the recorded identity.';
        return this.getInfo();
      }
      this.ready = true;
    } catch {
      this.blockReason = 'Model identity could not be read.';
      this.ready = false;
    }
    return this.getInfo();
  }

  async generate(request: InferenceRequest): Promise<InferenceResult> {
    const started = Date.now();
    if (!this.probed) await this.probe();
    const finish = async (result: InferenceResult): Promise<InferenceResult> => {
      const stamped: InferenceResult = { ...result, authority: 'none' };
      await writeAudit({
        ts: new Date().toISOString(),
        status: stamped.status,
        code: stamped.code ?? null,
        runtimeId: stamped.runtimeId,
        modelId: stamped.modelId,
        modelVersion: stamped.modelVersion,
        modelSha256: this.modelSha256,
        durationMs: stamped.durationMs,
        promptChars: Array.isArray(request?.messages)
          ? request.messages.reduce((sum, message) => sum + (message?.content?.length ?? 0), 0)
          : 0,
        outputChars: stamped.text?.length ?? 0,
        authority: 'none',
      });
      return stamped;
    };

    const validationError = validateRequest(request);
    if (validationError) {
      return finish({
        status: 'MALFORMED_INPUT',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: validationError,
        code: 'MALFORMED_INPUT',
      });
    }

    if (!this.ready || !this.modelPath || !this.enginePath) {
      return finish({
        status: 'MODEL_UNAVAILABLE',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: this.blockReason ?? 'First-party model weights or inference engine are not available. No simulated reply was generated.',
        code: 'FIRST_PARTY_MODEL_UNAVAILABLE',
      });
    }

    if (request.signal?.aborted) {
      return finish({
        status: 'CANCELLED',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: 'Inference cancelled before start.',
        code: 'CANCELLED',
      });
    }

    const timeoutMs = clampTimeout(request.timeoutMs);
    const maxOutputTokens = clampOutputTokens(request.maxOutputTokens);
    const prompt = request.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    try {
      const text = await this.runEngine(prompt, timeoutMs, maxOutputTokens, request.signal);
      if (!text.trim()) {
        return finish({
          status: 'BLOCKED',
          runtimeId: 'daisy-local-inference/v1',
          modelId: this.modelId,
          modelVersion: this.modelVersion,
          durationMs: Date.now() - started,
          error: 'Local engine returned an empty completion.',
          code: 'EMPTY_LOCAL_COMPLETION',
        });
      }
      return finish({
        status: 'OK',
        text: text.trim(),
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Local inference failed.';
      const status =
        message.includes('TIMEOUT') ? 'TIMEOUT'
          : message.includes('CANCELLED') ? 'CANCELLED'
            : message.includes('RESOURCE') ? 'RESOURCE_EXHAUSTED'
              : 'BLOCKED';
      return finish({
        status,
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: message,
        code: status === 'TIMEOUT' ? 'INFERENCE_TIMEOUT' : status === 'CANCELLED' ? 'CANCELLED' : status === 'RESOURCE_EXHAUSTED' ? 'RESOURCE_EXHAUSTED' : 'LOCAL_INFERENCE_FAILED',
      });
    }
  }

  private runEngine(prompt: string, timeoutMs: number, maxOutputTokens: number, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const engine = path.resolve(this.enginePath!);
      const model = path.resolve(this.modelPath!);
      // Generic CLI contract: engine --model <path> --prompt <text>
      // Operators may wrap llama.cpp / similar behind a thin adapter script.
      const child = spawn(engine, ['--model', model, '--prompt', prompt], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DAISY_INFERENCE_OFFLINE: '1',
          DAISY_MAX_OUTPUT_TOKENS: String(maxOutputTokens),
          DAISY_N_CTX: String(this.contextTokens),
        },
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish(() => reject(new Error('TIMEOUT: local inference exceeded the configured limit.')));
      }, timeoutMs);

      const onAbort = () => {
        child.kill('SIGKILL');
        finish(() => reject(new Error('CANCELLED: inference aborted by caller.')));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
        // Soft memory guard: abort if output grows unbounded.
        if (stdout.length > 2_000_000) {
          child.kill('SIGKILL');
          finish(() => reject(new Error('RESOURCE_EXHAUSTED: completion exceeded size limit.')));
        }
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (err) => {
        finish(() => reject(new Error(`LOCAL_ENGINE_ERROR: ${err.message}`)));
      });
      child.on('close', (code) => {
        signal?.removeEventListener('abort', onAbort);
        if (code === 0) {
          finish(() => resolve(stdout));
        } else {
          finish(() => reject(new Error(
            `LOCAL_ENGINE_EXIT_${code ?? 'null'}: ${stderr.trim().slice(0, 500) || 'engine failed'}`,
          )));
        }
      });
    });
  }
}

let singleton: LocalInferenceRuntime | null = null;

export function getLocalInferenceRuntime(): LocalInferenceRuntime {
  if (!singleton) singleton = new LocalInferenceRuntime();
  return singleton;
}
