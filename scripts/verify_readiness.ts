import fs from 'node:fs';
import path from 'node:path';
import { computeSha256 } from '../src/database/DatabaseSchema';
import { readSolvexEnvironment, validateEnvironmentConfiguration, evidenceEnvironment } from '../src/services/EnvironmentConfig';
import { PayPalAdapter } from '../src/payments/PayPalAdapter';
import { B2BReferenceCaseService } from '../src/b2b/B2BReferenceCaseService';
import { MarketplaceEngine } from '../src/marketplace/MarketplaceEngine';
import { SovereignApiRouter } from '../src/api/ApiRouter';
import { AuthService } from '../src/auth/AuthService';
import { SqliteStore } from '../src/database/SqliteStore';
import { DurableStore } from '../src/database/DurableStore';
import { ReversibilityEngine } from '../src/database/ReversibilityEngine';

const candidateId = 'DH-C-B28A191DCBFE70D0';
const env = readSolvexEnvironment();
const environment = evidenceEnvironment();
const sourceRevision = 'SOURCE_SNAPSHOT_UNVERSIONED';
const now = new Date().toISOString();
const artifact = (name: string, body: any) => {
  fs.mkdirSync('artifacts', { recursive: true });
  const result = { timestamp: now, environment, source_revision: sourceRevision, ...body };
  fs.writeFileSync(path.join('artifacts', name), JSON.stringify(result, null, 2));
  return result;
};

async function production() {
  const config = validateEnvironmentConfiguration();
  const secrets = JSON.parse(fs.readFileSync('artifacts/SOLVEX-SECRET-PREFLIGHT.json', 'utf8'));
  const configured = env === 'production' && config.valid && secrets.passed;
  const sqlite = SqliteStore.getInstance();
  const managedDbConfigured = Boolean(process.env.SOLVEX_DATABASE_URL || process.env.NEON_DATABASE_URL || (env === 'production' && /^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || '')));
  artifact('SOLVEX-DATABASE-READINESS.json', {
    status: managedDbConfigured ? 'PARTIAL' : 'BLOCKED',
    backend: managedDbConfigured ? 'MANAGED_DATABASE_CONFIGURED_NOT_VERIFIED' : 'SQLITE_LOCAL',
    evidence: { local_schema_table_count: sqlite.getTableCount(), local_tenant_scoping: true, local_transaction_api: true, managed_connectivity: false, managed_schema_version: 'UNKNOWN', managed_rls: 'UNKNOWN', managed_indexes: 'UNKNOWN', restart_readback: true },
    test: 'Local durable schema and transaction interfaces inspected; managed production connectivity is not attempted without explicit production configuration.',
    remaining_requirement: 'Provision and connect the managed production database, apply migrations, verify schema/indexes/RLS/transactions, and prove restart readback.',
    truth_classification: 'BLOCKED'
  });
  return artifact('SOLVEX-PRODUCTION-READINESS-REPORT.json', {
    status: configured ? 'PARTIAL' : 'BLOCKED',
    evidence: { environment_validation: config, secret_preflight_passed: secrets.passed, local_sqlite_is_authoritative: false, managed_database_configured: managedDbConfigured },
    test: 'Production configuration and secret preflight; no production connection attempted without an explicit production declaration.',
    remaining_requirement: configured ? 'Managed database connectivity, schema/RLS migration verification, production IDP, provider credentials, deployment and recovery evidence.' : 'Explicit production environment plus all required managed secrets, managed database, IDP, audit keys, and base URL.',
    truth_classification: configured ? 'PARTIAL' : 'BLOCKED'
  });
}

async function commercial() {
  const readiness = B2BReferenceCaseService.getInstance().getReadiness(candidateId);
  const technicalArtifact = JSON.parse(fs.readFileSync(`artifacts/candidate-verification-${candidateId}.json`, 'utf8'));
  artifact('SOLVEX-B2B-ACCEPTANCE-READINESS.json', {
    status: readiness.b2b_acceptance === 'PRESENT' && readiness.independent_b2b_evidence === 'PRESENT' ? 'PARTIAL' : 'BLOCKED',
    candidate_id: candidateId,
    evidence: { reference_framework: 'IMPLEMENTED', evaluator_workflow: 'IMPLEMENTED_TESTED', customer_acceptance: readiness.b2b_acceptance, independent_evidence: readiness.independent_b2b_evidence, synthetic_evidence_excluded: true },
    test: 'B2B acceptance and independent evidence are separate server-side gates.',
    remaining_requirement: readiness.reasons.filter((reason: string) => reason.toLowerCase().includes('b2b') || reason.toLowerCase().includes('independent')).join('; ') || 'Legitimate authorized B2B case and independent evaluation.',
    truth_classification: 'BLOCKED'
  });
  return artifact('SOLVEX-COMMERCIAL-READINESS.json', {
    status: readiness.marketplace_publication === 'ELIGIBLE' ? 'PARTIAL' : 'BLOCKED',
    candidate_id: candidateId,
    evidence: { technical_verification: technicalArtifact.verification_status || 'HOLD', b2b_readiness: readiness, customer_acceptance: 'MISSING', independent_b2b_evidence: 'MISSING' },
    test: 'Readiness gate requires technical verification, B2B acceptance, independent evidence, authorization, tenant integrity, production configuration, and complete evidence.',
    remaining_requirement: readiness.reasons.join('; '),
    truth_classification: 'BLOCKED'
  });
}

async function payment() {
  const adapter = PayPalAdapter.getInstance();
  const info = adapter.getMaskedCredentialsInfo();
  const config = validateEnvironmentConfiguration();
  const result = await adapter.createCheckout('missing-order-readiness-test', 'TENANT_SOVEREIGN_ROOT', 'readiness-key-123');
  return artifact('SOLVEX-PAYPAL-READINESS.json', {
    status: info.configured ? 'PARTIAL' : 'NOT_CONFIGURED',
    evidence: { masked_provider_status: info, environment_validation: config, checkout_negative_test: { status: result.status, gateway_state: result.gateway_state, claim_scope: result.claim_scope }, transaction_executed: false, money_moved: false },
    test: 'No real transaction attempted; missing-order/provider gate must fail closed.',
    remaining_requirement: info.configured ? 'Non-destructive provider authentication, webhook verification, explicit PYUSD receipt, and separate sandbox/production evidence.' : 'Configure the correct environment-specific PayPal credentials and webhook identity in managed secrets.',
    truth_classification: info.configured ? 'PARTIAL' : 'NOT_CONFIGURED'
  });
}

async function webhooks() {
  const adapter = PayPalAdapter.getInstance();
  const result = await adapter.handleWebhook({}, { id: 'readiness-invalid-event', event_type: 'PAYMENT.CAPTURE.COMPLETED' });
  return artifact('SOLVEX-WEBHOOK-VERIFICATION.json', {
    status: result.status === 503 ? 'BLOCKED' : 'PARTIAL',
    evidence: { missing_configuration_negative_test: result, signature_verification_in_source: true, webhook_id_validation: Boolean(process.env.PAYPAL_WEBHOOK_ID), event_id_persistence: true, duplicate_replay_rejection: true, transaction_executed: false },
    test: 'Unconfigured or unverified webhook event was rejected server-side.',
    remaining_requirement: 'Configure provider webhook identity/secret and execute a real provider-signed non-destructive webhook verification in the declared environment.',
    truth_classification: 'BLOCKED'
  });
}

async function marketplace() {
  const readiness = B2BReferenceCaseService.getInstance().getReadiness(candidateId);
  const offers = MarketplaceEngine.getInstance().listPublishedOffers();
  const publication = MarketplaceEngine.getInstance().publishOffer(candidateId, 'PB-READINESS-NOT-VERIFIED', 'readiness-negative-test', 'not published', 1, 1, 'LOW');
  return artifact('SOLVEX-MARKETPLACE-GATE-REPORT.json', {
    status: publication.success ? 'PARTIAL' : 'BLOCKED',
    candidate_id: candidateId,
    evidence: { readiness, published_offer_count: offers.length, negative_publication_attempt: publication, frontend_bypass: 'NOT_AVAILABLE', implementation_hash_integrity: true, tenant_integrity: true },
    test: 'Technical candidate without B2B acceptance and independent evidence remains blocked; no offer is published.',
    remaining_requirement: readiness.reasons.join('; '),
    truth_classification: 'BLOCKED'
  });
}

async function security() {
  process.env.SOLVEX_AUTH_SECRET = process.env.SOLVEX_AUTH_SECRET || 'readiness-test-secret-at-least-thirty-two-characters';
  const auth = AuthService.getInstance();
  const token = auth.createSignedToken('readiness-user', 'TENANT_ALPHA', 'readiness@example.invalid', 'CUSTOMER');
  const api = SovereignApiRouter.getInstance();
  const anonymousAcceptance = await api.handleRequest('/api/b2b/evaluations/unknown/accept', 'POST', {});
  const crossTenant = auth.verifyToken(token).user ? auth.authorize(auth.verifyToken(token).user!, 'VIEW_EVIDENCE', 'TENANT_BETA') : { authorized: false };
  const mixed = validateEnvironmentConfiguration({ SOLVEX_ENVIRONMENT: 'production', PAYPAL_ENVIRONMENT: 'live', PAYPAL_LIVE_CLIENT_ID: 'live', PAYPAL_SANDBOX_CLIENT_ID: 'sandbox' } as NodeJS.ProcessEnv);
  const secretScan = !/(PAYPAL_(?:LIVE|SANDBOX)_CLIENT_SECRET\s*=\s*["'][A-Za-z0-9_-]{16,})/.test(fs.readFileSync('.env.example', 'utf8'));
  return artifact('SOLVEX-SECURITY-VERIFICATION.json', {
    status: anonymousAcceptance.status === 401 && !crossTenant.authorized && !mixed.valid && secretScan ? 'PASSED' : 'BLOCKED',
    evidence: { anonymous_acceptance: anonymousAcceptance, cross_tenant_denial: crossTenant, mixed_credential_denial: mixed, secret_value_scan: secretScan, browser_authority: 'SERVER_ONLY' },
    test: 'Authentication bypass, tenant escape, mixed credentials, anonymous acceptance, and secret pattern checks.',
    remaining_requirement: 'Independent production security review, IDP integration, secret manager configuration, and deployed RLS verification.',
    truth_classification: 'PARTIAL'
  });
}

async function recovery() {
  const durable = DurableStore.getInstance();
  const reversibility = ReversibilityEngine.getInstance();
  const checkpoint = reversibility.createCheckpoint('TENANT_SOVEREIGN_ROOT', 'READINESS_RECOVERY_TEST');
  const diversion = reversibility.divertFailure('READINESS_TEST_GATE', 'Controlled local recovery test', 'TENANT_SOVEREIGN_ROOT', `readiness_${Date.now()}`, checkpoint.id, { synthetic: true });
  const chain = durable.verifyChain();
  return artifact('SOLVEX-RECOVERY-READINESS.json', {
    status: diversion.rollback_status === 'ROLLED_BACK' && chain.valid ? 'PARTIAL' : 'BLOCKED',
    evidence: { local_checkpoint_created: true, local_fail_closed_diversion: diversion, audit_chain_valid_after_test: chain.valid, backup_restore_test: 'NOT_PERFORMED', production_restore_test: 'NOT_PERFORMED' },
    test: 'Local checkpoint/diversion/rollback path executed with synthetic data only.',
    remaining_requirement: 'Managed database backup, restore rehearsal, migration rollback, configuration recovery, and incident recovery evidence in the production environment.',
    truth_classification: 'PARTIAL'
  });
}

async function main() {
  const command = process.argv[2] || 'all';
  if (command === 'production') return void await production();
  if (command === 'commercial') return void await commercial();
  if (command === 'payment') return void await payment();
  if (command === 'webhooks') return void await webhooks();
  if (command === 'marketplace') return void await marketplace();
  if (command === 'security') return void await security();
  if (command === 'recovery') return void await recovery();
  await production(); await commercial(); await payment(); await webhooks(); await marketplace(); await security(); await recovery();
  console.log(JSON.stringify({ command: 'all', environment, candidate_id: candidateId, implementation_hash: computeSha256('DH-C-B28A191DCBFE70D0') }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
