export type FirstPartyInferenceStatus = 'READY' | 'BLOCKED' | 'UNAVAILABLE';

export interface FirstPartyInferenceResult {
  ok: boolean;
  status: FirstPartyInferenceStatus;
  code: string;
  message: string;
  source: 'first-party-runtime' | 'disabled';
}

export class FirstPartyInferenceRuntime {
  public static isEnabled(): boolean {
    return process.env.FIRST_PARTY_INFERENCE_ENABLED === 'true';
  }

  public static healthCheck(): FirstPartyInferenceResult {
    if (!this.isEnabled()) {
      return {
        ok: false,
        status: 'BLOCKED',
        code: 'FIRST_PARTY_INFERENCE_DISABLED',
        message: 'A first-party inference runtime is not enabled. Daisy will not claim a local model is active until the runtime is explicitly configured and verified.',
        source: 'disabled',
      };
    }

    const configuredRuntime = (process.env.FIRST_PARTY_INFERENCE_RUNTIME || process.env.FIRST_PARTY_INFERENCE_PATH || '').trim();
    if (!configuredRuntime) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        code: 'FIRST_PARTY_INFERENCE_UNAVAILABLE',
        message: 'FIRST_PARTY_INFERENCE_ENABLED is true, but no verified runtime implementation was configured.',
        source: 'first-party-runtime',
      };
    }

    return {
      ok: false,
      status: 'UNAVAILABLE',
      code: 'FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED',
      message: 'The runtime entrypoint is present in configuration, but no verified first-party inference implementation exists in this source tree yet.',
      source: 'first-party-runtime',
    };
  }

  public static generateResponse(
    _prompt: string,
    _history: Array<{ role: 'user' | 'model'; text: string }> = []
  ): FirstPartyInferenceResult {
    const result = this.healthCheck();
    if (!result.ok) {
      return result;
    }

    return {
      ok: false,
      status: 'UNAVAILABLE',
      code: 'FIRST_PARTY_INFERENCE_NOT_IMPLEMENTED',
      message: 'No verified first-party inference implementation is available in this source tree yet.',
      source: 'first-party-runtime',
    };
  }
}
