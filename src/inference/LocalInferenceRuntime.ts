import { access, constants, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { verifyDaisyModelFile, VERIFIED_DAISY_GGUF } from './verifiedDaisyModel';
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

export function extractCompletion(stdout: string, prompt: string): string {
  // llama-cli is invoked with --no-display-prompt, so valid output normally
  // contains only the completion. Retain compatibility with engines that echo
  // the prompt, but do not discard prompt-hidden llama.cpp completions.
  const timingAt = stdout.search(/\n\[ Prompt:/);
  const body = timingAt >= 0 ? stdout.slice(0, timingAt) : stdout;
  const marker = `> ${prompt}`;
  const at = body.lastIndexOf(marker);
  const completion = at >= 0 ? body.slice(at + marker.length) : body;
  return completion
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== '>' && !line.startsWith('build ') && !line.startsWith('model ') && !line.startsWith('ftype ') && !line.includes('/'))
    .join('\n')
    .trim();
}
export function createInferenceChildEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const allowed = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'SystemRoot', 'WINDIR', 'LD_LIBRARY_PATH', 'DAISY_LLAMA_CLI'];
  const child: NodeJS.ProcessEnv = {};
  for (const key of allowed) {
    const value = source[key];
    if (typeof value === 'string') child[key] = value;
  }
  child.DAISY_INFERENCE_OFFLINE = '1'; // Advisory only; this runtime does not enforce OS-level network isolation.
  return child;
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
  private ready = false;
  private probed = false;
  private checksumOk = false;
  private loadState: 'UNAVAILABLE' | 'CHECKSUM_MISMATCH' | 'LOADABLE' | 'READY' | 'INFERENCE_FAILED' = 'UNAVAILABLE';
  private observedSha256: string | null = null;

  constructor(options?: {
    modelPath?: string | null;
    enginePath?: string | null;
    modelId?: string | null;
    modelVersion?: string | null;
  }) {
    this.modelPath = options?.modelPath
      ?? process.env.DAISY_MODEL_PATH
      ?? null;
    this.enginePath = options?.enginePath
      ?? process.env.DAISY_INFERENCE_ENGINE
      ?? null;
    this.modelId = options?.modelId ?? process.env.DAISY_MODEL_ID ?? null;
    this.modelVersion = options?.modelVersion ?? process.env.DAISY_MODEL_VERSION ?? null;
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
        ? 'This process generated text from the pinned Daisy GGUF. Network isolation is not enforced here.'
        : `Load state ${this.loadState}. READY requires a non-empty completion from ${VERIFIED_DAISY_GGUF.release}.`,
    };
  }

  canAttempt(): boolean {
    return this.checksumOk;
  }

  publicStatus(): Omit<InferenceRuntimeInfo, 'modelPath' | 'enginePath'> & {
    loadState: 'UNAVAILABLE' | 'CHECKSUM_MISMATCH' | 'LOADABLE' | 'READY' | 'INFERENCE_FAILED';
    modelSha256: string | null;
    expectedSha256: string;
    release: string;
    activationAuthorized: false;
  } {
    const info = this.getInfo();
    return {
      runtimeId: info.runtimeId,
      modelId: info.modelId,
      modelVersion: info.modelVersion,
      ready: info.ready,
      offlineCapable: false,
      notes: info.notes,
      loadState: this.loadState,
      modelSha256: this.observedSha256,
      expectedSha256: VERIFIED_DAISY_GGUF.sha256,
      release: VERIFIED_DAISY_GGUF.release,
      activationAuthorized: false,
    };
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Probe filesystem once (or again after configuration change). */
  async probe(): Promise<InferenceRuntimeInfo> {
    this.probed = true;
    const previouslyReady = this.ready;
    this.ready = false;
    this.checksumOk = false;
    this.observedSha256 = null;
    this.loadState = 'UNAVAILABLE';
    if (!this.modelPath || !this.enginePath) return this.getInfo();
    const engineOk = await isExecutableFile(path.resolve(this.enginePath));
    const check = await verifyDaisyModelFile(path.resolve(this.modelPath));
    this.observedSha256 = check.sha256;
    if (!check.ok) {
      if (engineOk && check.code === 'CHECKSUM_MISMATCH') this.loadState = 'CHECKSUM_MISMATCH';
      return this.getInfo();
    }
    if (!engineOk) return this.getInfo();
    this.checksumOk = true;
    this.ready = previouslyReady;
    this.loadState = previouslyReady ? 'READY' : 'LOADABLE';
    return this.getInfo();
  }

  async generate(request: InferenceRequest): Promise<InferenceResult> {
    const started = Date.now();
    if (!this.probed) await this.probe();

    const validationError = validateRequest(request);
    if (validationError) {
      return {
        status: 'MALFORMED_INPUT',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: validationError,
        code: 'MALFORMED_INPUT',
      };
    }

    if (!this.checksumOk || !this.modelPath || !this.enginePath) {
      return {
        status: this.loadState === 'CHECKSUM_MISMATCH' ? 'BLOCKED' : 'MODEL_UNAVAILABLE',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: this.loadState === 'CHECKSUM_MISMATCH'
          ? 'Model file does not match the verified Daisy GGUF checksum. No completion was generated.'
          : 'First-party model weights or inference engine are not available. No simulated reply was generated.',
        code: this.loadState === 'CHECKSUM_MISMATCH' ? 'CHECKSUM_MISMATCH' : 'FIRST_PARTY_MODEL_UNAVAILABLE',
      };
    }

    if (request.signal?.aborted) {
      return {
        status: 'CANCELLED',
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: 'Inference cancelled before start.',
        code: 'CANCELLED',
      };
    }

    const timeoutMs = request.timeoutMs ?? DEFAULT_INFERENCE_TIMEOUT_MS;
    const prompt = request.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    try {
      const text = extractCompletion(await this.runEngine(prompt, timeoutMs, request.signal), prompt);
      if (!text.trim()) {
        this.ready = false;
        this.loadState = 'INFERENCE_FAILED';
        return {
          status: 'BLOCKED',
          runtimeId: 'daisy-local-inference/v1',
          modelId: this.modelId,
          modelVersion: this.modelVersion,
          durationMs: Date.now() - started,
          error: 'Local engine returned an empty completion.',
          code: 'EMPTY_LOCAL_COMPLETION',
        };
      }
      this.ready = true;
      this.loadState = 'READY';
      return {
        status: 'OK',
        text: text.trim(),
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
      };
    } catch (err: unknown) {
      this.ready = false;
      this.loadState = 'INFERENCE_FAILED';
      const message = err instanceof Error ? err.message : 'Local inference failed.';
      const status =
        message.includes('TIMEOUT') ? 'TIMEOUT'
          : message.includes('CANCELLED') ? 'CANCELLED'
            : message.includes('RESOURCE') ? 'RESOURCE_EXHAUSTED'
              : 'BLOCKED';
      return {
        status,
        runtimeId: 'daisy-local-inference/v1',
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        durationMs: Date.now() - started,
        error: message,
        code: status === 'TIMEOUT' ? 'INFERENCE_TIMEOUT' : 'LOCAL_INFERENCE_FAILED',
      };
    }
  }

  private runEngine(prompt: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const engine = path.resolve(this.enginePath!);
      const model = path.resolve(this.modelPath!);
      // Generic CLI contract: engine --model <path> --prompt <text>
      // Operators may wrap llama.cpp / similar behind a thin adapter script.
      const child = spawn(engine, ['--model', model, '--prompt', prompt], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: createInferenceChildEnvironment(),
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
