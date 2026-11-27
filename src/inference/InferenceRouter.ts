/**
 * Selects the generative inference path.
 * Uses the first-party local runtime only. No external provider fallback exists.
 * Never invents a successful reply when local inference is unavailable.
 */
import {
  InferenceRequest,
  InferenceResult,
  InferenceRuntimeInfo,
} from './InferenceRuntime';
import { getLocalInferenceRuntime, LocalInferenceRuntime } from './LocalInferenceRuntime';

export interface ChatInferenceOutcome {
  result: InferenceResult;
  source: 'first_party_local' | 'none';
  runtime: InferenceRuntimeInfo;
}

export class InferenceRouter {
  private readonly local: LocalInferenceRuntime;

  constructor(local: LocalInferenceRuntime = getLocalInferenceRuntime()) {
    this.local = local;
  }

  async resolveChat(request: InferenceRequest): Promise<ChatInferenceOutcome> {
    await this.local.probe();
    const info = this.local.getInfo();

    if (this.local.canAttempt()) {
      const result = await this.local.generate(request);
      return { result, source: result.status === 'OK' ? 'first_party_local' : 'none', runtime: this.local.getInfo() };
    }

    // No third-party AI API fallback is permitted by the first-party-only policy.
    return {
      source: 'none',
      runtime: info,
      result: {
        status: 'MODEL_UNAVAILABLE',
        runtimeId: info.runtimeId,
        modelId: info.modelId,
        modelVersion: info.modelVersion,
        durationMs: 0,
        code: 'FIRST_PARTY_MODEL_UNAVAILABLE',
        error:
          'No first-party inference runtime is ready. Model weights and engine are not configured. External AI providers are prohibited by project policy.',
      },
    };
  }
}
