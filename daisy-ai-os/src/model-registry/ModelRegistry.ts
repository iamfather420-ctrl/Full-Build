import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ModelDefinition {
  id: string;
  displayName: string;
  version: string;
  architecture: string;
  parameterCount: number;
  contextLength: number;
  format: string;
  quantization: string;
  license: string;
  licenseUrl: string;
  baseModel: string;
  modelCardUrl: string;
  sourceRepository: string;
  sourceRevision: string;
  file: { name: string; sizeBytes: number; sha256: string; downloadUrl: string };
  runtime: { engine: string; executable: string; minimumQwen3Support: string; promptTemplate: string };
  description: string;
}

export interface ModelRegistryDocument {
  schemaVersion: number;
  defaultModelId: string;
  models: ModelDefinition[];
}

export type WeightStatus = 'not_installed' | 'not_a_file' | 'size_mismatch' | 'sha256_mismatch' | 'verified' | 'not_selected';
export type EngineStatus = 'not_configured' | 'not_executable' | 'wrong_executable' | 'executable' | 'not_selected';

export interface RegisteredModelStatus {
  id: string;
  displayName: string;
  version: string;
  architecture: string;
  parameterCount: number;
  contextLength: number;
  format: string;
  quantization: string;
  license: string;
  licenseUrl: string;
  baseModel: string;
  modelCardUrl: string;
  sourceRepository: string;
  sourceRevision: string;
  fileName: string;
  expectedSizeBytes: number;
  expectedSha256: string;
  downloadUrl: string;
  runtime: ModelDefinition['runtime'];
  selected: boolean;
  weights: { status: WeightStatus; actualSizeBytes: number | null };
  engine: { status: EngineStatus };
  ready: boolean;
}

export interface ModelRegistryStatus {
  schemaVersion: number;
  defaultModelId: string;
  selectedModelId: string;
  ready: boolean;
  reason: string;
  models: RegisteredModelStatus[];
}

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const modelsDirectory = path.resolve(moduleDirectory, '../../models');
const registryFile = path.join(modelsDirectory, 'registry.json');
const digestCache = new Map<string, string>();
let registryCache: ModelRegistryDocument | null = null;

function nonEmpty(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function readModelRegistry(): Promise<ModelRegistryDocument> {
  if (registryCache) return registryCache;
  const parsed = JSON.parse(await readFile(registryFile, 'utf8')) as ModelRegistryDocument;
  if (parsed.schemaVersion !== 1 || !parsed.defaultModelId || !Array.isArray(parsed.models) || parsed.models.length === 0) {
    throw new Error('The local model registry has an unsupported or invalid schema.');
  }
  for (const entry of parsed.models) {
    if (!entry.id || !entry.file?.name || !Number.isSafeInteger(entry.file.sizeBytes) || !/^[a-f0-9]{64}$/i.test(entry.file.sha256)) {
      throw new Error('The local model registry contains an invalid model entry.');
    }
  }
  registryCache = parsed;
  return parsed;
}

async function hashFile(filePath: string, size: number, modifiedAtMs: number): Promise<string> {
  const key = `${filePath}\u0000${size}\u0000${modifiedAtMs}`;
  const cached = digestCache.get(key);
  if (cached) return cached;
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) digest.update(chunk as Buffer);
  const value = digest.digest('hex');
  digestCache.set(key, value);
  return value;
}

async function inspectWeights(filePath: string | null, model: ModelDefinition): Promise<{ status: WeightStatus; actualSizeBytes: number | null }> {
  if (!filePath) return { status: 'not_installed', actualSizeBytes: null };
  let info;
  try {
    info = await stat(filePath);
  } catch {
    return { status: 'not_installed', actualSizeBytes: null };
  }
  if (!info.isFile()) return { status: 'not_a_file', actualSizeBytes: info.size };
  if (info.size !== model.file.sizeBytes) return { status: 'size_mismatch', actualSizeBytes: info.size };
  const actualSha = await hashFile(filePath, info.size, info.mtimeMs);
  return actualSha === model.file.sha256
    ? { status: 'verified', actualSizeBytes: info.size }
    : { status: 'sha256_mismatch', actualSizeBytes: info.size };
}

async function inspectEngine(enginePath: string | null, expectedExecutable: string): Promise<EngineStatus> {
  if (!enginePath) return 'not_configured';
  const basename = path.basename(enginePath).toLowerCase();
  if (basename !== expectedExecutable.toLowerCase() && basename !== `${expectedExecutable.toLowerCase()}.exe`) {
    return 'wrong_executable';
  }
  try {
    const info = await stat(enginePath);
    if (!info.isFile()) return 'not_executable';
    await access(enginePath, constants.X_OK);
    return 'executable';
  } catch {
    return 'not_executable';
  }
}

export async function getModelRegistryStatus(options: {
  document?: ModelRegistryDocument;
  modelId?: string | null;
  modelPath?: string | null;
  enginePath?: string | null;
} = {}): Promise<ModelRegistryStatus> {
  const document = options.document ?? await readModelRegistry();
  const selectedModelId = nonEmpty(options.modelId ?? process.env.DAISY_MODEL_ID) ?? document.defaultModelId;
  const selected = document.models.find((model) => model.id === selectedModelId) ?? null;
  const configuredPath = nonEmpty(options.modelPath ?? process.env.DAISY_MODEL_PATH);
  const selectedPath = selected
    ? path.resolve(configuredPath ?? path.join(modelsDirectory, selected.file.name))
    : null;
  const enginePath = nonEmpty(options.enginePath ?? process.env.DAISY_INFERENCE_ENGINE);
  const weights = selected ? await inspectWeights(selectedPath, selected) : { status: 'not_selected' as const, actualSizeBytes: null };
  const engineStatus = selected ? await inspectEngine(enginePath, selected.runtime.executable) : 'not_selected' as const;
  const ready = !!selected && weights.status === 'verified' && engineStatus === 'executable';
  const reason = !selected
    ? 'The selected model ID is not present in the local registry.'
    : weights.status === 'not_installed'
      ? `Registered model weights are not installed. Run the local model download script or configure DAISY_MODEL_PATH.`
      : weights.status === 'not_a_file'
        ? 'The configured model path is not a regular file.'
        : weights.status === 'size_mismatch'
          ? 'The local weights size does not match the registered artifact.'
          : weights.status === 'sha256_mismatch'
            ? 'The local weights SHA-256 does not match the registered artifact.'
            : engineStatus === 'not_configured'
              ? 'Weights are verified, but DAISY_INFERENCE_ENGINE is not configured.'
              : engineStatus === 'wrong_executable'
                ? `The configured executable is not the registered ${selected.runtime.executable} runtime.`
                : engineStatus === 'not_executable'
                ? 'Weights are verified, but the configured local inference executable is unavailable or not executable.'
                : 'Registered model weights and local inference executable are ready.';

  const models = await Promise.all(document.models.map(async (model): Promise<RegisteredModelStatus> => {
    const isSelected = model.id === selectedModelId;
    const modelWeights = isSelected ? weights : { status: 'not_selected' as const, actualSizeBytes: null };
    const modelEngineStatus = isSelected ? engineStatus : 'not_selected' as const;
    return {
      id: model.id,
      displayName: model.displayName,
      version: model.version,
      architecture: model.architecture,
      parameterCount: model.parameterCount,
      contextLength: model.contextLength,
      format: model.format,
      quantization: model.quantization,
      license: model.license,
      licenseUrl: model.licenseUrl,
      baseModel: model.baseModel,
      modelCardUrl: model.modelCardUrl,
      sourceRepository: model.sourceRepository,
      sourceRevision: model.sourceRevision,
      fileName: model.file.name,
      expectedSizeBytes: model.file.sizeBytes,
      expectedSha256: model.file.sha256,
      downloadUrl: model.file.downloadUrl,
      runtime: model.runtime,
      selected: isSelected,
      weights: modelWeights,
      engine: { status: modelEngineStatus },
      ready: isSelected && ready,
    };
  }));

  return { schemaVersion: document.schemaVersion, defaultModelId: document.defaultModelId, selectedModelId, ready, reason, models };
}
