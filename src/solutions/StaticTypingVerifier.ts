import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tscPath = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');

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
 * Checks a submitted TypeScript module with the installed tsc CLI.
 * The source is written only to a unique OS temporary directory, compiled
 * with noEmit, and removed in a finally block. It is never executed.
 */
export function verifyStaticTyping(source: string): StaticTypingResult {
  const versionRun = spawnSync(process.execPath, [tscPath, '--version'], { encoding: 'utf8' });
  const version = (versionRun.stdout || versionRun.stderr || 'unknown').trim().replace(/^Version /, '');

  if (typeof source !== 'string' || source.trim().length === 0) {
    return {
      passed: false,
      compiler: 'typescript',
      compiler_version: version,
      strict: true,
      diagnostics: [{ code: 0, message: 'Source must be a non-empty TypeScript module.' }]
    };
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'solvex-stage7-'));
  const sourceFile = path.join(tempDir, 'input.ts');
  try {
    writeFileSync(sourceFile, source, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    const result = spawnSync(process.execPath, [
      tscPath,
      '--noEmit',
      '--strict',
      '--target', 'ES2022',
      '--module', 'ESNext',
      '--moduleResolution', 'Bundler',
      '--skipLibCheck',
      '--pretty', 'false',
      '--exactOptionalPropertyTypes',
      '--noUncheckedIndexedAccess',
      sourceFile
    ], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });

    if (result.error) {
      return {
        passed: false, compiler: 'typescript', compiler_version: version, strict: true,
        diagnostics: [{ code: 0, message: result.error.message }]
      };
    }

    const output = (result.stdout + '\n' + result.stderr).trim();
    const diagnostics = output
      ? output.split(/\r?\n/).filter(Boolean).map(line => {
          const match = line.match(/input\.ts\((\d+),(\d+)\): error TS(\d+): (.*)/);
          return match
            ? { line: Number(match[1]), column: Number(match[2]), code: Number(match[3]), message: match[4] }
            : { code: 0, message: line };
        })
      : [];

    return {
      passed: result.status === 0 && diagnostics.length === 0,
      compiler: 'typescript',
      compiler_version: version,
      strict: true,
      diagnostics
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
