/**
 * Selects the generative inference path.
 * Order: first-party local runtime → (optional) external provider only if explicitly allowed.
 * Never invents a successful reply when both are unavailable.
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

    if (this.local.isReady()) {
      const result = await this.local.generate(request);
      return { result, source: 'first_party_local', runtime: info };
    }

    // Do not call external providers from this router. The HTTP layer may
    // separately honor ALLOW_EXTERNAL_MODEL_PROVIDER after this returns.
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
          'No first-party inference runtime is ready. Model weights and engine are not configured. External providers remain disabled unless ALLOW_EXTERNAL_MODEL_PROVIDER=true is set explicitly.',
      },
    };
  }
}
