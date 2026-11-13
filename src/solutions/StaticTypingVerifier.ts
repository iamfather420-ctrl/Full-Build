import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

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
 * Type-checks submitted source as an isolated TypeScript module.
 * The compiler is run with noEmit: source is never executed or emitted.
 */
export function verifyStaticTyping(source: string): StaticTypingResult {
  if (typeof source !== 'string' || source.trim().length === 0) {
    return {
      passed: false,
      compiler: 'typescript',
      compiler_version: ts.version,
      strict: true,
      diagnostics: [{ code: 0, message: 'Source must be a non-empty TypeScript module.' }]
    };
  }

  const virtualFile = path.resolve('.', '.solvex-stage7-input.ts');
  const normalizedVirtualFile = path.normalize(virtualFile);
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    types: [],
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    allowImportingTsExtensions: true
  };

  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);

  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (path.normalize(path.resolve(fileName)) === normalizedVirtualFile) {
      return ts.createSourceFile(fileName, source, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  host.fileExists = fileName =>
    path.normalize(path.resolve(fileName)) === normalizedVirtualFile || originalFileExists(fileName);
  host.readFile = fileName =>
    path.normalize(path.resolve(fileName)) === normalizedVirtualFile ? source : originalReadFile(fileName);

  const program = ts.createProgram([virtualFile], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => {
    const position = diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : undefined;
    return {
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'),
      ...(position ? { line: position.line + 1, column: position.character + 1 } : {})
    };
  });

  return {
    passed: diagnostics.length === 0,
    compiler: 'typescript',
    compiler_version: ts.version,
    strict: true,
    diagnostics
  };
}
