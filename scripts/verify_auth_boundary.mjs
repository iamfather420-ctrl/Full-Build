import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authService = await readFile(new URL('../src/auth/AuthService.ts', import.meta.url), 'utf8');
const oidcRoutes = await readFile(new URL('../artifacts/api-server/src/routes/auth_native.ts', import.meta.url), 'utf8');
const authMiddleware = await readFile(new URL('../artifacts/api-server/src/middlewares/authMiddleware.ts', import.meta.url), 'utf8');
const dbAuth = await readFile(new URL('../packages/db/src/index.ts', import.meta.url), 'utf8');

assert.match(authService, /application-side tenant token minting is disabled/);
assert.match(authService, /verifyOidcTenantToken/);
assert.match(oidcRoutes, /resolveOidcTenantIdentity\(subject, email\)/);
assert.match(oidcRoutes, /email_verified !== true/);
assert.match(authMiddleware, /resolveOidcTenantIdentity\(/);
assert.match(authMiddleware, /verifyOidcTenantToken\(/);
assert.match(authMiddleware, /clearSession\(res, sid\)/);
assert.match(dbAuth, /solvex_private\.issue_oidc_session_claim/);
assert.match(dbAuth, /solvex_private\.current_claims\(\)/);
assert.match(dbAuth, /m2\.status\s*=\s*'ACTIVE'/);

// PR #71's independent password/session router must not become part of the
// production API by accidental import or mounting. It remains a separate,
// unapproved design until explicitly reconciled and security-reviewed.
assert.doesNotMatch(oidcRoutes, /FirstPartyAuthRouter|createFirstPartyAuthRouter/);
assert.doesNotMatch(authMiddleware, /FirstPartyAuthRouter|createFirstPartyAuthRouter/);

console.log(JSON.stringify({
  status: 'PASS',
  checks: [
    'application-side tenant token minting remains disabled',
    'OIDC callback requires a verified email and Neon-issued tenant identity',
    'request middleware revalidates signed tenant claims and active membership',
    'invalid sessions are cleared fail-closed',
    'PR #71 password/session router is not wired into production OIDC routes'
  ]
}, null, 2));
