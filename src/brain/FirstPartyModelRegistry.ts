/**
 * First-party model registry — local offline assets only.
 * Third-party cloud generation providers are prohibited on this path.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type ModelSlotStatus =
  | 'SLOT_EMPTY'
  | 'FILE_PRESENT'
  | 'HASH_MISMATCH'
  | 'TOO_SMALL'
  | 'READY'
  | 'REGISTRY_UNREADABLE';

export interface RegisteredModel {
  id: string;
  role: string;
  format: string;
  relative_path: string;
  expected_sha256: string | null;
  min_bytes: number;
  status: string;
  notes?: string;
}

export interface ModelPresence {
  id: string;
  role: string;
  format: string;
  absolute_path: string;
  exists: boolean;
  size_bytes: number;
  sha256: string | null;
  slot_status: ModelSlotStatus;
  detail: string;
}

export interface RegistrySnapshot {
  ok: boolean;
  third_party_cloud_prohibited: true;
  model_root: string;
  primary_chat: ModelPresence | null;
  models: ModelPresence[];
  ready_for_inference: boolean;
  blockers: string[];
}

const PROHIBITED = [
  'google_gemini',
  'openai',
  'anthropic',
  'xai_api',
  'cohere',
  'mistral_cloud',
] as const;

function resolveModelRoot(): string {
  const envRoot = (process.env.DAISY_MODEL_ROOT || '').trim();
  if (envRoot) return path.resolve(envRoot);
  return path.resolve(process.cwd(), 'models');
}

function loadRegistryFile(modelRoot: string): { models: RegisteredModel[]; error?: string } {
  const candidates = [
    path.join(modelRoot, 'registry.json'),
    path.resolve(process.cwd(), 'models', 'registry.json'),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      const models = Array.isArray(raw?.models) ? (raw.models as RegisteredModel[]) : [];
      return { models };
    } catch (e: any) {
      return { models: [], error: e?.message || 'registry parse failed' };
    }
  }
  return { models: [], error: 'models/registry.json not found' };
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function inspectModel(modelRoot: string, m: RegisteredModel): ModelPresence {
  const absolute = path.resolve(modelRoot, m.relative_path);
  const base: ModelPresence = {
    id: m.id,
    role: m.role,
    format: m.format,
    absolute_path: absolute,
    exists: false,
    size_bytes: 0,
    sha256: null,
    slot_status: 'SLOT_EMPTY',
    detail: 'Weight file not installed',
  };

  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return base;
  }

  const size = fs.statSync(absolute).size;
  base.exists = true;
  base.size_bytes = size;

  if (size < (m.min_bytes || 1)) {
    base.slot_status = 'TOO_SMALL';
    base.detail = `File too small (${size} < ${m.min_bytes})`;
    return base;
  }

  // Hash only when expected_sha256 is set (large files: optional until operator pins).
  if (m.expected_sha256 && m.expected_sha256.length === 64) {
    try {
      const digest = sha256File(absolute);
      base.sha256 = digest;
      if (digest.toLowerCase() !== m.expected_sha256.toLowerCase()) {
        base.slot_status = 'HASH_MISMATCH';
        base.detail = 'SHA-256 does not match registry expected_sha256';
        return base;
      }
    } catch (e: any) {
      base.slot_status = 'REGISTRY_UNREADABLE';
      base.detail = e?.message || 'hash failed';
      return base;
    }
  }

  base.slot_status = m.expected_sha256 ? 'READY' : 'FILE_PRESENT';
  base.detail = m.expected_sha256
    ? 'File present and hash verified'
    : 'File present; pin expected_sha256 in registry.json for full READY';
  return base;
}

export class FirstPartyModelRegistry {
  public static prohibitedProviders(): readonly string[] {
    return PROHIBITED;
  }

  public static snapshot(): RegistrySnapshot {
    const modelRoot = resolveModelRoot();
    const { models: registered, error } = loadRegistryFile(modelRoot);
    const blockers: string[] = [];

    if (error) blockers.push(error);

    const models = registered.map((m) => inspectModel(modelRoot, m));
    const primary =
      models.find((m) => m.role === 'primary_chat') ||
      models.find((m) => m.format === 'gguf') ||
      null;

    if (!primary || !primary.exists) {
      blockers.push('Primary chat GGUF not installed under models/gguf/');
    } else if (primary.slot_status === 'HASH_MISMATCH' || primary.slot_status === 'TOO_SMALL') {
      blockers.push(`Primary model slot: ${primary.detail}`);
    }

    // FILE_PRESENT without pin is enough to attempt local runner; READY requires hash.
    const readyForInference =
      !!primary &&
      primary.exists &&
      (primary.slot_status === 'READY' || primary.slot_status === 'FILE_PRESENT') &&
      blockers.length === 0;

    return {
      ok: blockers.length === 0 && models.length > 0,
      third_party_cloud_prohibited: true,
      model_root: modelRoot,
      primary_chat: primary,
      models,
      ready_for_inference: readyForInference,
      blockers,
    };
  }
}
