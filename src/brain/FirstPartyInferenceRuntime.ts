/**
 * First-party inference only. No Gemini / OpenAI / Anthropic / other SaaS generation.
 * Generation stays BLOCKED until local weights + optional local runner are present.
 */
import { spawnSync } from 'node:child_process';
import { FirstPartyModelRegistry, type RegistrySnapshot } from './FirstPartyModelRegistry';

export type FirstPartyInferenceStatus = 'READY' | 'BLOCKED' | 'UNAVAILABLE';

export interface FirstPartyInferenceResult {
  ok: boolean;
  status: FirstPartyInferenceStatus;
  code: string;
  message: string;
  source: 'first-party-runtime' | 'disabled';
  text?: string;
  registry?: RegistrySnapshot;
}

function denyThirdParty(): FirstPartyInferenceResult {
  return {
    ok: false,
    status: 'BLOCKED',
    code: 'THIRD_PARTY_CLOUD_INFERENCE_PROHIBITED',
    message:
      'Third-party cloud model providers are prohibited on the first-party path. Install local GGUF/ONNX under models/ and use a local runner only.',
    source: 'disabled',
  };
}

export class FirstPartyInferenceRuntime {
  public static isEnabled(): boolean {
    return process.env.FIRST_PARTY_INFERENCE_ENABLED === 'true';
  }

  /** External SaaS keys must never enable this path. */
  public static isThirdPartyRequested(): boolean {
    if (process.env.ALLOW_EXTERNAL_MODEL_PROVIDER === 'true') return true;
    if ((process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim()) {
      // Keys may exist in env for other tooling; they do not activate first-party generation.
      return false;
    }
    return false;
  }

  public static registrySnapshot(): RegistrySnapshot {
    return FirstPartyModelRegistry.snapshot();
  }

  public static healthCheck(): FirstPartyInferenceResult {
    if (!this.isEnabled()) {
      const reg = this.registrySnapshot();
      return {
        ok: false,
        status: 'BLOCKED',
        code: 'FIRST_PARTY_INFERENCE_DISABLED',
        message:
          'First-party inference is disabled (set FIRST_PARTY_INFERENCE_ENABLED=true after installing local weights). No third-party model was called.',
        source: 'disabled',
        registry: reg,
      };
    }

    const reg = this.registrySnapshot();
    if (!reg.ready_for_inference) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'MODEL_WEIGHTS_MISSING',
        message:
          'Local model weights are not ready: ' +
          (reg.blockers.join('; ') || 'no primary GGUF') +
          '. Place files under models/gguf/ per models/README.md. No third-party API was used.',
        source: 'first-party-runtime',
        registry: reg,
      };
    }

    const runner = (process.env.FIRST_PARTY_INFERENCE_RUNTIME || '').trim();
    if (!runner) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'LOCAL_RUNNER_NOT_CONFIGURED',
        message:
          'Weights are present but FIRST_PARTY_INFERENCE_RUNTIME is unset. Point it at a local binary (e.g. llama-cli). Cloud APIs are not used.',
        source: 'first-party-runtime',
        registry: reg,
      };
    }

    return {
      ok: true,
      status: 'READY',
      code: 'FIRST_PARTY_READY',
      message: 'Local weights and runner configuration present. Generation uses local process only.',
      source: 'first-party-runtime',
      registry: reg,
    };
  }

  public static generateResponse(
    prompt: string,
    _history: Array<{ role: 'user' | 'model'; text: string }> = []
  ): FirstPartyInferenceResult {
    // Never fall through to third-party on this class.
    if (process.env.FORCE_THIRD_PARTY_CHAT === 'true') {
      return denyThirdParty();
    }

    const health = this.healthCheck();
    if (!health.ok) return health;

    const runner = (process.env.FIRST_PARTY_INFERENCE_RUNTIME || '').trim();
    const modelPath = health.registry?.primary_chat?.absolute_path;
    if (!modelPath) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'MODEL_PATH_MISSING',
        message: 'Primary model path missing after health check.',
        source: 'first-party-runtime',
        registry: health.registry,
      };
    }

    // Args: FIRST_PARTY_INFERENCE_RUNTIME_ARGS as JSON array, or default [-m, path, -p, prompt]
    let args: string[] = [];
    const rawArgs = (process.env.FIRST_PARTY_INFERENCE_RUNTIME_ARGS || '').trim();
    if (rawArgs.startsWith('[')) {
      try {
        args = JSON.parse(rawArgs).map(String);
      } catch {
        return {
          ok: false,
          status: 'UNAVAILABLE',
          code: 'INVALID_RUNTIME_ARGS',
          message: 'FIRST_PARTY_INFERENCE_RUNTIME_ARGS must be a JSON string array when set.',
          source: 'first-party-runtime',
        };
      }
    } else if (rawArgs) {
      args = rawArgs.split(/\s+/).filter(Boolean);
    } else {
      args = ['-m', modelPath, '-p', prompt, '-n', '128'];
    }

    // Substitute placeholders
    args = args.map((a) =>
      a.replaceAll('{model}', modelPath).replaceAll('{prompt}', prompt)
    );

    const result = spawnSync(runner, args, {
      encoding: 'utf8',
      timeout: Number(process.env.FIRST_PARTY_INFERENCE_TIMEOUT_MS || 120000),
      env: {
        ...process.env,
        // Strip common cloud keys from child env so local runner cannot accidentally call SaaS.
        GEMINI_API_KEY: '',
        GOOGLE_API_KEY: '',
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: '',
        XAI_API_KEY: '',
      },
      maxBuffer: 4 * 1024 * 1024,
    });

    if (result.error) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'LOCAL_RUNNER_ERROR',
        message: `Local runner failed to start: ${result.error.message}. No third-party API was called.`,
        source: 'first-party-runtime',
        registry: health.registry,
      };
    }

    if (result.status !== 0) {
      const errText = (result.stderr || result.stdout || '').toString().slice(0, 2000);
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'LOCAL_RUNNER_NONZERO',
        message: `Local runner exited ${result.status}. ${errText || 'No output'}`,
        source: 'first-party-runtime',
        registry: health.registry,
      };
    }

    const text = (result.stdout || '').toString().trim();
    if (!text) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'LOCAL_RUNNER_EMPTY',
        message: 'Local runner returned empty stdout. No third-party API was called.',
        source: 'first-party-runtime',
        registry: health.registry,
      };
    }

    return {
      ok: true,
      status: 'READY',
      code: 'FIRST_PARTY_GENERATED',
      message: 'Response generated by local first-party runner.',
      source: 'first-party-runtime',
      text,
      registry: health.registry,
    };
  }
}
