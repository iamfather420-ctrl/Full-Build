/**
 * Selects the generative inference path.
 * Uses only the first-party local runtime. External AI-provider calls are prohibited.
 * Never invents a successful reply when the local runtime is unavailable.
 */
import type {
  InferenceRequest,
  InferenceResult,
  InferenceRuntimeInfo,
} from './InferenceRuntime.ts';
import { getLocalInferenceRuntime } from './LocalInferenceRuntime.ts';
import type { LocalInferenceRuntime } from './LocalInferenceRuntime.ts';

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

    if (this.local.isReady()) {
      const result = await this.local.generate(request);
      return { result, source: 'first_party_local', runtime: info };
    }

    // No remote AI provider is available as a fallback in this product.
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
          'No first-party inference runtime is ready. Configure a local model file and local inference executable; external AI providers are never called.',
      },
    };
  }
}
