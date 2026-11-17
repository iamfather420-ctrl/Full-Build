import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ExternalProverId = 'lean4' | 'isabelle' | 'coq';

const PROVER_IDENTITY: Record<ExternalProverId, { env: string; basenames: Set<string>; versionArgs: string[]; versionPattern: RegExp }> = {
  lean4: { env: 'SOLVEX_LEAN_BIN', basenames: new Set(['lean', 'lean.exe']), versionArgs: ['--version'], versionPattern: /Lean \(version \d+/ },
  isabelle: { env: 'SOLVEX_ISABELLE_BIN', basenames: new Set(['isabelle', 'isabelle.exe']), versionArgs: ['version'], versionPattern: /Isabelle20\d{2}/ },
  coq: { env: 'SOLVEX_COQC_BIN', basenames: new Set(['coqc', 'coqc.exe']), versionArgs: ['--version'], versionPattern: /Coq Proof Assistant/ },
};

const GAP = /\b(sorry|admit(?:ted)?|axiom|sorryAx)\b/i;
const authenticExecutionReceipts = new WeakSet<object>();

export function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

export function sourceIsClosed(source: string): { ok: boolean; reason?: string } {
  const match = source.match(GAP);
  if (match) return { ok: false, reason: `proof source contains a forbidden gap (${match[1]})` };
  return { ok: true };
}

export function assessProverRun(input: {
  basename: string;
  expectedBasenames: ReadonlySet<string>;
  versionText: string;
  versionPattern: RegExp;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  sourceClosed: boolean;
  executionReceipt?: object;
}): { verified: boolean; reason: string } {
  if (!input.executionReceipt || !authenticExecutionReceipts.has(input.executionReceipt)) return { verified: false, reason: 'missing authentic prover execution receipt' };
  if (!input.sourceClosed) return { verified: false, reason: 'proof source is not closed' };
  if (!input.expectedBasenames.has(input.basename)) return { verified: false, reason: `prover identity rejected (${input.basename || 'missing'})` };
  if (!input.versionPattern.test(input.versionText)) return { verified: false, reason: 'prover version probe did not identify the expected prover' };
  if (input.exitCode !== 0) return { verified: false, reason: `prover exit status ${input.exitCode ?? 'missing'}` };
  const combined = `${input.stdout}\n${input.stderr}`;
  if (GAP.test(combined) || /\berror:/i.test(combined) || /\bUnfinished\b/.test(combined)) {
    return { verified: false, reason: 'prover output contains an error or an admitted gap' };
  }
  return { verified: true, reason: 'prover exited 0 and the output contained no admitted gap' };
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function resolveBinary(id: ExternalProverId): { binary: string | null; reason?: string } {
  const spec = PROVER_IDENTITY[id];
  const configured = process.env[spec.env];
  if (configured === 'UNAVAILABLE') return { binary: null, reason: `${id} is not installed (forced unavailable)` };
  if (configured) return { binary: configured };
  const candidates = [...spec.basenames].map((name) => name);
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of pathEntries) {
    for (const name of candidates) {
      const candidate = path.join(dir, name);
      if (existsSync(candidate)) return { binary: candidate };
    }
  }
  return { binary: null, reason: `${id} is not installed` };
}

export interface ProverEvidence {
  prover: ExternalProverId;
  prover_execution_verified: boolean;
  executed: boolean;
  exit_code: number | null;
  binary_basename: string | null;
  binary_sha256: string | null;
  source_sha256: string;
  stdout_sha256: string | null;
  stderr_sha256: string | null;
  version_sha256: string | null;
  reason: string;
}

function hashSources(relativePaths: string[]): { closed: boolean; reason?: string; digest: string; text: string } {
  const root = repoRoot();
  const parts = relativePaths.map((relativePath) => {
    const absolute = path.join(root, relativePath);
    const text = readFileSync(absolute, 'utf8');
    return `${relativePath}\n${text}`;
  });
  const text = parts.join('\n---\n');
  const closed = sourceIsClosed(text);
  return { closed: closed.ok, reason: closed.reason, digest: sha256(text), text };
}

export function runExternalProver(id: ExternalProverId, relativeSources: string[], args: string[]): ProverEvidence {
  const sources = hashSources(relativeSources);
  const base: ProverEvidence = {
    prover: id,
    prover_execution_verified: false,
    executed: false,
    exit_code: null,
    binary_basename: null,
    binary_sha256: null,
    source_sha256: sources.digest,
    stdout_sha256: null,
    stderr_sha256: null,
    version_sha256: null,
    reason: sources.reason ?? `${id} was not executed`,
  };
  if (!sources.closed) return base;
  const resolved = resolveBinary(id);
  const timeoutMs = id === 'isabelle' ? 600_000 : 180_000;
  if (!resolved.binary || !existsSync(resolved.binary)) {
    return { ...base, reason: resolved.reason ?? `${id} is not installed` };
  }
  let basename = path.basename(resolved.binary);
  let binaryHash: string | null = null;
  try {
    const real = realpathSync(resolved.binary);
    basename = path.basename(real);
    const size = statSync(real).size;
    binaryHash = size <= 80 * 1024 * 1024 ? sha256(readFileSync(real)) : null;
  } catch {
    return { ...base, reason: `${id} is not installed` };
  }
  const spec = PROVER_IDENTITY[id];
  const version = spawnSync(resolved.binary, spec.versionArgs, { encoding: 'utf8', timeout: timeoutMs, cwd: repoRoot() });
  if (version.error && (version.error as NodeJS.ErrnoException).code === 'ENOENT') {
    return { ...base, binary_basename: basename, binary_sha256: binaryHash, reason: `${id} is not installed` };
  }
  const versionText = `${version.stdout ?? ''}\n${version.stderr ?? ''}`;
  if (version.error || version.status !== 0) {
    return { ...base, binary_basename: basename, binary_sha256: binaryHash, exit_code: version.status, reason: `${id} version probe failed` };
  }
  const proof = spawnSync(resolved.binary, args, { encoding: 'utf8', timeout: timeoutMs, cwd: repoRoot(), maxBuffer: 8 * 1024 * 1024 });
  const stdout = proof.stdout ?? '';
  const stderr = proof.stderr ?? '';
  if (proof.error) {
    return { ...base, executed: false, exit_code: proof.status, binary_basename: basename, binary_sha256: binaryHash, stdout_sha256: sha256(stdout), stderr_sha256: sha256(stderr), version_sha256: sha256(versionText), reason: `${id} execution could not be completed: ${proof.error.message}` };
  }
  const executionReceipt = Object.freeze({});
  authenticExecutionReceipts.add(executionReceipt);
  const assessment = assessProverRun({
    basename,
    expectedBasenames: spec.basenames,
    versionText,
    versionPattern: spec.versionPattern,
    exitCode: proof.status,
    stdout,
    stderr,
    sourceClosed: true,
    executionReceipt,
  });
  return {
    ...base,
    prover_execution_verified: assessment.verified,
    executed: proof.error == null,
    exit_code: proof.status,
    binary_basename: basename,
    binary_sha256: binaryHash,
    stdout_sha256: sha256(stdout),
    stderr_sha256: sha256(stderr),
    version_sha256: sha256(versionText),
    reason: assessment.reason,
  };
}

export function verifyLeanProof(): ProverEvidence {
  return runExternalProver('lean4', ['formal/lean/BoundedZeno.lean'], ['formal/lean/BoundedZeno.lean']);
}

export function verifyIsabelleProof(): ProverEvidence {
  return runExternalProver('isabelle', ['formal/isabelle/ROOT', 'formal/isabelle/BoundedZeno.thy'], ['build', '-D', 'formal/isabelle']);
}

export function verifyCoqProof(): ProverEvidence {
  const outputDirectory = path.join(tmpdir(), 'solvex-coq-proof');
  mkdirSync(outputDirectory, { recursive: true });
  return runExternalProver('coq', ['formal/coq/BoundedZeno.v'], ['-q', '-no-glob', '-o', path.join(outputDirectory, 'BoundedZeno.vo'), 'formal/coq/BoundedZeno.v']);
}