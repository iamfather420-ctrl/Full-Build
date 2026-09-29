import fs from 'node:fs';
import path from 'node:path';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { AuthService } from '../src/auth/AuthService';

async function main() {
  process.env.SOLVEX_AUTH_SECRET = process.env.SOLVEX_AUTH_SECRET || 'test-only-auth-secret-with-at-least-thirty-two-characters';
  delete process.env.PAYPAL_ENVIRONMENT;
  const api = SovereignApiRouter.getInstance();
  const auth = AuthService.getInstance();
  const verifierToken = auth.createSignedToken('verify-api', 'TENANT_TEST', 'verifier@example.test', 'VERIFIER');
  const ownerToken = auth.createSignedToken('owner-api', 'TENANT_SOVEREIGN_ROOT', 'owner@example.test', 'OWNER');
  const verifierHeaders = { authorization: `Bearer ${verifierToken}` };
  const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
  const cases: Array<{ name: string; passed: boolean; observed: number; expected: number }> = [];
  const expect = async (name: string, expected: number, request: Promise<any>) => { const response = await request; cases.push({ name, expected, observed: response.status, passed: response.status === expected }); return response; };

  await expect('anonymous order read denied', 401, api.handleRequest('/api/orders', 'GET'));
  await expect('anonymous pipeline denied', 401, api.handleRequest('/api/solutions/pipeline', 'POST', { paradox_code: 'DH-P-001', code_solution: 'export function solve() { return 1; }' }));
  await expect('public role-selecting login retired', 410, api.handleRequest('/api/auth/login', 'POST', { role: 'OWNER', tenant_id: 'TENANT_VICTIM' }));
  await expect('public offer catalogue allowed', 200, api.handleRequest('/api/offers', 'GET'));
  const candidate = await expect('authenticated candidate intake accepted but not verified', 202, api.handleRequest('/api/solutions/pipeline', 'POST', { paradox_code: 'DH-P-001', code_solution: 'export function verifiedByEvidenceOnly(input: number) { return input + 1; }' }, verifierHeaders));
  const publication = await expect('candidate publication is blocked', 400, api.handleRequest('/api/offers/publish', 'POST', { solution_id: candidate.data.solution_id, proof_bundle_id: 'PB-NOT-BOUND', title: 'blocked', description: 'blocked', cost_basis: 1000, complexity: 1, risk_class: 'LOW' }, ownerHeaders));
  if (!String(publication.error).includes('Publication blocked')) throw new Error('Publication failure did not communicate a fail-closed reason');
  await expect('payment checkout denies missing provider credentials', 400, api.handleRequest('/api/payments/checkout', 'POST', { order_id: 'unknown', idempotency_key: 'checkout-idempotency-123' }, verifierHeaders));
  const failed = cases.filter(test => !test.passed);
  const report = { execution_classification: 'CODE_EXECUTED', cases, all_passed: failed.length === 0, failures: failed };
  fs.mkdirSync(path.resolve(process.cwd(), 'artifacts'), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), 'artifacts', 'api-security-v2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}
main().catch(error => { console.error(error); process.exit(1); });
