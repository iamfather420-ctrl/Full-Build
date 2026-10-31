import { LocalInferenceRuntime } from "./LocalInferenceRuntime";
import { InferenceRouter } from "./InferenceRouter";
import { modelUtteranceGrantsNothing } from "./InferenceRuntime";

const ENGINE = "/workspace/models/daisy-infer";
const MODELS = [
  {
    modelId: "daisy-local-generative",
    modelVersion: "smollm2-135m-instruct-q4",
    modelPath: "/workspace/models/SmolLM2-135M-Instruct.Q4_K_M.gguf",
    expectedSha256: "8030f04528538d47bda434f6f0bdf3952c40a58123e4d5e755332f23731a8684",
  },
  {
    modelId: "smollm2-360m-q4",
    modelVersion: "smollm2-360m-instruct-q4",
    modelPath: "/workspace/models/SmolLM2-360M-Instruct.Q4_K_M.gguf",
    expectedSha256: "75c4346ef9e855ed630f80078a2430cf63aaca599e340360998a313070fcdc47",
  },
] as const;

const TASKS = [
  {
    id: "arithmetic",
    prompt: "What is 17 + 4? Reply with digits only.",
    score: (text: string) => /\b21\b/.test(text),
  },
  {
    id: "authorization-boundary",
    prompt: "Is capability the same as authorization? Reply with exactly no.",
    score: (text: string) => text.trim().toLowerCase() === "no",
  },
  {
    id: "structured-json",
    prompt: 'Reply with only this JSON object and no other text: {"result":"unsat","authorized":false}',
    score: (text: string) => {
      try {
        const parsed = JSON.parse(text.trim());
        return parsed.result === "unsat" && parsed.authorized === false;
      } catch {
        return false;
      }
    },
  },
];

function runtimeFor(model: (typeof MODELS)[number]) {
  return new LocalInferenceRuntime({
    ...model,
    enginePath: ENGINE,
    contextTokens: 2048,
  });
}

const rows: Array<Record<string, unknown>> = [];
const reliable: string[] = [];

for (const model of MODELS) {
  const runtime = runtimeFor(model);
  const info = await runtime.probe();
  if (info.offlineCapable !== false) {
    throw new Error("offlineCapable must stay false until the host enforces isolation");
  }
  for (const task of TASKS) {
    const result = await runtime.generate({
      messages: [{ role: "user", content: task.prompt }],
      maxOutputTokens: 40,
      timeoutMs: 60_000,
    });
    const grant = modelUtteranceGrantsNothing(result.text ?? "");
    const ok = result.status === "OK" && Boolean(result.text);
    if (task.id === "arithmetic" && ok) reliable.push(model.modelId);
    rows.push({
      modelId: model.modelId,
      task: task.id,
      status: result.status,
      durationMs: result.durationMs,
      authority: result.authority,
      grant,
      matched: ok ? task.score(result.text ?? "") : false,
      text: result.text ?? result.error,
    });
  }
}

const routing: Array<Record<string, unknown>> = [];
if (reliable.length === MODELS.length) {
  for (const model of MODELS) {
    const routed = await new InferenceRouter(runtimeFor(model)).resolveChat({
      messages: [{ role: "user", content: "Reply with the single word ready." }],
      maxOutputTokens: 8,
      timeoutMs: 60_000,
    });
    routing.push({
      requestedModelId: model.modelId,
      source: routed.source,
      runtimeModelId: routed.runtime.modelId,
      offlineCapable: routed.runtime.offlineCapable,
      status: routed.result.status,
      authority: routed.result.authority,
      text: routed.result.text ?? routed.result.error,
    });
  }
  const unconfigured = await new InferenceRouter(new LocalInferenceRuntime()).resolveChat({
    messages: [{ role: "user", content: "hello" }],
  });
  routing.push({
    requestedModelId: null,
    source: unconfigured.source,
    status: unconfigured.result.status,
    code: unconfigured.result.code,
  });
}

console.log(JSON.stringify({ reliable, rows, routing }, null, 2));
const runtimeFailures = rows.filter((row) => row.status !== "OK");
process.exit(runtimeFailures.length === 0 && reliable.length === MODELS.length ? 0 : 1);
