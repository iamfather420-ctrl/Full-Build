import ts from 'typescript';

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

/** Type-check a virtual, isolated TypeScript module. Submitted source is never emitted or executed. */
export function verifyStaticTyping(source: string): StaticTypingResult {
  const version = ts.version;
  if (typeof source !== 'string' || source.trim().length === 0) {
    return { passed: false, compiler: 'typescript', compiler_version: version, strict: true,
      diagnostics: [{ code: 0, message: 'Source must be a non-empty TypeScript module.' }] };
  }
  if (source.length > 100_000) {
    return { passed: false, compiler: 'typescript', compiler_version: version, strict: true,
      diagnostics: [{ code: 0, message: 'Source exceeds the 100 KB static-check limit.' }] };
  }
  const fileName = '/__solvex_stage7_input__.ts';
  const options: ts.CompilerOptions = {
    strict: true, noEmit: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true, exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true, types: []
  };
  const host = ts.createCompilerHost(options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  host.fileExists = path => path === fileName || originalFileExists(path);
  host.readFile = path => path === fileName ? source : originalReadFile(path);
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
    path === fileName
      ? ts.createSourceFile(path, source, languageVersion, true)
      : originalGetSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([fileName], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map(d => {
    const position = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : undefined;
    return {
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      ...(position ? { line: position.line + 1, column: position.character + 1 } : {})
    };
  });
  return { passed: diagnostics.length === 0, compiler: 'typescript',
    compiler_version: version, strict: true, diagnostics };
}
