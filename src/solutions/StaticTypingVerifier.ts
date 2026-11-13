import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface StaticTypingDiagnostic {
  code: number;
  message: string;
  line?: number;
  column?: number;
}

export interface StaticTypingResult {
  passed: boolean;
  compiler: 'typescript';
  compiler_version: string;
  strict: true;
  diagnostics: StaticTypingDiagnostic[];
}

/**
 * Strictly type-checks an isolated TypeScript module with the repository's
 * installed compiler. The source is never executed and all temporary files
 * are removed even when the compiler fails or times out.
 */
export function verifyStaticTyping(source: string): StaticTypingResult {
  const root = process.cwd();
  const tscPath = path.resolve(root, 'node_modules/typescript/bin/tsc');
  const run = (args: string[]) => spawnSync(process.execPath, [tscPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 1024 * 1024
  });

  const versionRun = run(['--version']);
  const versionOutput = (versionRun.stdout || versionRun.stderr || '').trim();
  const version = versionOutput.replace(/^Version\s+/i, '') || 'unknown';

  if (typeof source !== 'string' || source.trim().length === 0) {
    return {
      passed: false, compiler: 'typescript', compiler_version: version, strict: true,
      diagnostics: [{ code: 0, message: 'Source must be a non-empty TypeScript module.' }]
    };
  }

  if (versionRun.error || versionRun.status !== 0) {
    return {
      passed: false, compiler: 'typescript', compiler_version: version, strict: true,
      diagnostics: [{ code: 0, message: versionRun.error?.message || versionOutput || 'Unable to start TypeScript compiler.' }]
    };
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'solvex-stage7-'));
  const sourceFile = path.join(tempDir, 'input.ts');
  try {
    writeFileSync(sourceFile, source, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    const result = run([
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--target', 'ES2022',
      '--module', 'ESNext',
      '--moduleResolution', 'Bundler',
      '--skipLibCheck',
      '--pretty', 'false',
      '--exactOptionalPropertyTypes',
      '--noUncheckedIndexedAccess',
      '--typeRoots', path.resolve(root, 'node_modules/@types'),
      sourceFile
    ]);

    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    const diagnostics: StaticTypingDiagnostic[] = output
      ? output.split(/\r?\n/).filter(Boolean).map(line => {
          const match = line.match(/input\.ts(?:\((\d+),(\d+)\)|:(\d+):(\d+)):\s*error TS(\d+):\s*(.*)/);
          if (!match) return { code: 0, message: line };
          return {
            line: Number(match[1] || match[3]),
            column: Number(match[2] || match[4]),
            code: Number(match[5]),
            message: match[6]
          };
        })
      : [];

    const passed = !result.error && result.status === 0 && diagnostics.length === 0;
    if (result.error) diagnostics.push({ code: 0, message: result.error.message });
    if (result.signal) diagnostics.push({ code: 0, message: `TypeScript compiler terminated by signal ${result.signal}.` });
    if (result.status !== 0 && diagnostics.length === 0) {
      diagnostics.push({ code: 0, message: `TypeScript compiler exited with status ${String(result.status)}.` });
    }

    return {
      passed, compiler: 'typescript', compiler_version: version, strict: true, diagnostics
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
