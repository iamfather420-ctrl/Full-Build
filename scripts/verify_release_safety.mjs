import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const auth = read('src/auth/AuthService.ts');
const neon = read('src/database/NeonPersistence.ts');
const api = read('src/api/ApiRouter.ts');
const runtime = read('scripts/verify_production_runtime.ts');
const workflow = read('.github/workflows/verify-authoritative.yml');
const packageJson = JSON.parse(read('package.json'));
const nativeDaisy = read('Solvex-core/server_native.ts');
const inferenceRouter = read('src/inference/InferenceRouter.ts');
const firstPartyVerifier = read('scripts/verify_first_party_runtime.mjs');
const stage14Oracle = read('src/security/IndependentModelOracle.ts');
const outreachGateway = read('artifacts/api-server/src/outreach-index.ts');
const outreachEngine = read('artifacts/api-server/src/lib/outreach.ts');
const envExample = read('.env.example');
const nativePackage = JSON.parse(read('Solvex-core/package_native.json'));
const nativeReadme = read('Solvex-core/README_native.md');
const firstPartyOnlySources = [
  nativeDaisy, inferenceRouter, firstPartyVerifier, stage14Oracle,
  outreachGateway, outreachEngine, envExample, JSON.stringify(nativePackage), nativeReadme
].join('\n');
for (const forbidden of [
  'GoogleGenAI', '@google/genai', 'GEMINI_API_KEY', 'ALLOW_EXTERNAL_MODEL_PROVIDER',
  'ALLOW_EXTERNAL_OUTREACH_PROVIDER', 'OPENAI_API_KEY', 'SOLVEX_FLY',
  'api.openai.com', 'generativelanguage.googleapis.com', 'gemini-', 'gpt-4o-mini',
  'full-build.fly.dev', 'solvex-oracle-signer-isolated'
]) {
  assert.equal(firstPartyOnlySources.includes(forbidden), false,
    'Daisy inference and Stage 14 must not contain third-party AI provider code: ' + forbidden);
}
assert.ok(stage14Oracle.includes('FIRST_PARTY_ORACLE_UNAVAILABLE'),
  'Stage 14 must remain explicitly blocked until a first-party independent oracle is implemented');
assert.equal(stage14Oracle.includes('fetch('), false,
  'Stage 14 must not make remote evaluator or signer requests');
assert.equal(packageJson.dependencies?.['@google/genai'], undefined,
  'the unused third-party Gemini SDK must not remain a direct runtime dependency');
assert.match(outreachGateway, /app\.post\(["']\/api\/stage14\/evaluate["'][\s\S]*?res\.status\(410\)/,
  'the server-side Stage 14 evaluator endpoint must be explicitly disabled');
assert.doesNotMatch(outreachGateway, /api\.openai\.com|OPENAI_API_KEY|solvex-single-openai-evaluator-v1/,
  'the Stage 14 gateway must not retain a remote AI evaluator');
assert.match(outreachEngine, /BLOCKED: Daisy first-party outreach inference is unavailable/,
  'outreach must fail closed when local inference is unavailable');
assert.doesNotMatch(outreachEngine, /api\.openai\.com|OPENAI_API_KEY|ALLOW_EXTERNAL_OUTREACH_PROVIDER|SOLVEX_FLY/,
  'outreach must not contain an external AI fallback');
assert.doesNotMatch(envExample, /GEMINI_API_KEY|OPENAI_API_KEY|ALLOW_EXTERNAL_MODEL_PROVIDER|ALLOW_EXTERNAL_OUTREACH_PROVIDER|SOLVEX_FLY/,
  'the environment template must not advertise third-party AI provider credentials');
assert.equal(nativePackage.dependencies?.['@google/genai'], undefined,
  'the native subproject manifest must not reintroduce a third-party AI SDK');
assert.doesNotMatch(nativeReadme, /GEMINI_API_KEY|OPENAI_API_KEY|GoogleGenAI|Gemini|OpenAI/,
  'native server documentation must describe the local-only runtime');

assert.match(auth, /createSignedToken[\s\S]*throw new Error\('BLOCKED:/,
  'local token creation must fail closed');
assert.match(auth, /verifyToken[\s\S]*return \{ valid: false,/,
  'unconfigured token verification must reject tokens');
assert.match(auth, /authorize[\s\S]*return \{ authorized: false,/,
  'authorization must fail closed without verified identity');
assert.match(api, /if \(method !== 'GET'\)/,
  'the current API router must reject mutations');
assert.match(api, /path !== '\/api\/system\/health'[\s\S]*path !== '\/api\/system\/status'/,
  'the current API router must expose only the documented read-only system endpoints');
assert.match(api, /authentication_enabled: false/);
assert.match(api, /payments_enabled: false/);
assert.match(api, /readiness: production\.readiness/,
  'the API must report the actual readiness state rather than hard-code a production claim');
assert.match(api, /const ready = runtimeHealthy && production\.readiness === 'READY'/,
  'the readiness endpoint must remain blocked unless runtime and production gates are ready');
assert.doesNotMatch(runtime, /runMigrations\s*\(/,
  'production readiness verification must not mutate the schema');
assert.match(workflow, /PAYMENTS_ENABLED:\s*'false'/,
  'authoritative workflow must keep payments disabled');
assert.match(workflow, /uses:\s*oven-sh\/setup-bun@v2/,
  'authoritative workflow must install Bun');
assert.match(workflow, /bun install --frozen-lockfile/,
  'authoritative workflow must install from the committed frozen Bun lockfile');
assert.doesNotMatch(workflow, /npm (?:install|ci|run)\b/,
  'authoritative workflow must not use npm against the stale npm lockfile');

const workflowScripts = [...workflow.matchAll(/^\s*run:\s*bun run ([\w:-]+)\s*$/gm)]
  .map((match) => match[1]);
const missingWorkflowScripts = workflowScripts.filter((name) => !packageJson.scripts[name]);
assert.deepEqual(missingWorkflowScripts, [],
  'every bun run command in the authoritative workflow must exist in package.json');

assert.ok(packageJson.scripts['verify:release-safety'], 'release safety command must be declared');
assert.ok(packageJson.scripts['verify:payments-disabled'], 'payments-disabled command must be declared');

const migrationMethod = neon.slice(neon.indexOf('public async runMigrations'), neon.indexOf('public async verifyRequiredTables'));
const genericWriteMethod = neon.slice(neon.indexOf('public async insertRecord'), neon.indexOf('public async findTenantRecords'));
assert.match(neon, /backend: 'PERSISTENCE_UNAVAILABLE',[\s\S]*configured: false/,
  'unconfigured Neon must not be reported as an active SQLite backend');
assert.match(migrationMethod, /BLOCKED: generic Neon migrations are disabled/);
assert.match(genericWriteMethod, /BLOCKED: generic Neon writes are disabled/);
assert.doesNotMatch(neon, /CREATE TABLE IF NOT EXISTS|ALTER TABLE|INSERT INTO/,
  'legacy generic Neon persistence must not mutate or write to the incompatible schema');
console.log('PASS: fail-closed security, payments, and first-party-only AI paths; frozen Bun install; workflow commands match package scripts.');
