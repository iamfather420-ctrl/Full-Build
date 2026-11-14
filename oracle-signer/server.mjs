import { createServer } from 'node:http';
import { createPrivateKey, createPublicKey, sign, verify, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const host = process.env.SOLVEX_SIGNER_HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 8080);
const token = process.env.SOLVEX_ORACLE_SIGNER_TOKEN ?? '';
const keyPath = process.env.SOLVEX_ORACLE_ED25519_PRIVATE_KEY_FILE ?? '/run/secrets/solvex-oracle-ed25519.pem';
const privateKeyEnv = process.env.SOLVEX_ORACLE_ED25519_PRIVATE_KEY ?? '';
const oracleId = process.env.SOLVEX_ORACLE_ID ?? '';
const maxBodyBytes = 64 * 1024;

if (token.length < 32 || !oracleId) {
  throw new Error('Signer requires SOLVEX_ORACLE_SIGNER_TOKEN (at least 32 chars) and SOLVEX_ORACLE_ID.');
}
const privateKeyPem = privateKeyEnv ? privateKeyEnv.replace(/\\n/g, '\n') : await readFile(keyPath, 'utf8');
const privateKey = createPrivateKey(privateKeyPem);
if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('Signer key must be Ed25519.');
const publicKey = createPublicKey(privateKey);
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const publicKeySha256 = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');

function runKeySelfTest() {
  const canonical = [oracleId, 'solvex-signer-self-test', 'a'.repeat(64), 'ACCEPT', 'b'.repeat(64)].join('\n');
  const bytes = Buffer.from(canonical);
  const signature = sign(null, bytes, privateKey);
  return verify(null, bytes, publicKey, signature);
}
const keySelfTestPassed = runKeySelfTest();
if (!keySelfTestPassed) throw new Error('Ed25519 signer self-test failed.');


const STAGE14_AUDIENCE = 'solvex-stage14-evaluator';
const TRUSTED_REPOSITORY = 'iamfather420-ctrl/Full-Build';
const TRUSTED_REPOSITORY_ID = '1388681071';
const TRUSTED_PUSH_REFS = new Set([
  'refs/heads/main',
  'refs/heads/fix/46-gate-baseline-lifecycle-sandbox',
]);
let githubJwksCache;

async function verifyGitHubOidcToken(candidate) {
  try {
    const parts = candidate.split('.');
    if (parts.length !== 3) return false;
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const workflowPrefix = `${TRUSTED_REPOSITORY}/.github/workflows/ci.yml@`;
    const trustedWorkflow = typeof claims.workflow_ref === 'string' && claims.workflow_ref.startsWith(workflowPrefix);
    const trustedPush = claims.event_name === 'push' &&
      TRUSTED_PUSH_REFS.has(claims.ref) &&
      claims.workflow_ref === `${workflowPrefix}${claims.ref}`;
    const trustedPullRequest = claims.event_name === 'pull_request' &&
      claims.base_ref === 'main' &&
      claims.head_ref === 'fix/46-gate-baseline-lifecycle-sandbox' &&
      claims.head_repository === TRUSTED_REPOSITORY &&
      String(claims.head_repository_id) === TRUSTED_REPOSITORY_ID &&
      trustedWorkflow;
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
        claims.iss !== 'https://token.actions.githubusercontent.com' ||
        !audiences.includes(STAGE14_AUDIENCE) ||
        !Number.isFinite(claims.exp) || claims.exp <= now ||
        (Number.isFinite(claims.nbf) && claims.nbf > now) ||
        claims.repository !== TRUSTED_REPOSITORY ||
        String(claims.repository_id) !== TRUSTED_REPOSITORY_ID ||
        !(trustedPush || trustedPullRequest)) return false;

    if (!githubJwksCache || githubJwksCache.expiresAt <= Date.now()) {
      const response = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks', {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return false;
      const jwks = await response.json();
      if (!Array.isArray(jwks.keys)) return false;
      githubJwksCache = { keys: jwks.keys, expiresAt: Date.now() + 10 * 60_000 };
    }
    const jwk = githubJwksCache.keys.find(key => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) return false;
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    return verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url')
    );
  } catch {
    return false;
  }
}

function safeTokenEqual(candidate) {
  if (typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
function send(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function validHash(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    while (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  }
  catch { return send(res, 400, { error: 'invalid_url' }); }
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/healthz' || pathname === '/')) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, oracleId }));
  }
  if (req.method === 'GET' && pathname === '/selftest') {
    return send(res, 200, {
      ok: keySelfTestPassed,
      oracleId,
      keyType: privateKey.asymmetricKeyType,
      signatureVerified: keySelfTestPassed,
      publicKeyPem,
      publicKeySha256
    });
  }
  if (req.method !== 'POST' || pathname !== '/attest') return send(res, 404, { error: 'not_found' });
  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  // Short-lived GitHub Actions OIDC is the normal CI identity. The legacy
  // bearer remains only as a backwards-compatible break-glass path.
  if (!safeTokenEqual(bearer) && !(await verifyGitHubOidcToken(bearer))) {
    return send(res, 401, { error: 'unauthorized' });
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBodyBytes) return send(res, 413, { error: 'payload_too_large' });
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (payload?.protocol !== 'solvex-openai-attestation-v1' ||
        payload.oracleId !== oracleId ||
        typeof payload.modelId !== 'string' || !payload.modelId ||
        !validHash(payload.inputSha256) || !validHash(payload.rationaleSha256) ||
        !['ACCEPT', 'REJECT'].includes(payload.verdict)) {
      return send(res, 400, { error: 'invalid_attestation_payload' });
    }
    const canonical = [
      payload.oracleId,
      payload.modelId,
      payload.inputSha256,
      payload.verdict,
      payload.rationaleSha256
    ].join('\n');
    const signature = sign(null, Buffer.from(canonical), privateKey).toString('base64');
    return send(res, 200, {
      oracleId: payload.oracleId,
      modelId: payload.modelId,
      inputSha256: payload.inputSha256,
      verdict: payload.verdict,
      rationaleSha256: payload.rationaleSha256,
      signature
    });
  } catch {
    return send(res, 400, { error: 'invalid_request' });
  }
});
server.listen(port, host, () => process.stdout.write(`SolveX oracle signer listening on ${host}:${port}\n`));
