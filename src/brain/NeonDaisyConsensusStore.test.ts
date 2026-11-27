import assert from 'node:assert/strict';
import test from 'node:test';
import { ConsensusCertificate, sha256Canonical } from './IndependentUnanimousConsensus';
import {
  DAISY_CONSENSUS_STAGING_HOST,
  NeonDaisyConsensusStore,
  ConsensusPgClient,
  ConsensusPgPool
} from './NeonDaisyConsensusStore';

function makeCertificate(): ConsensusCertificate {
  const proposal = {
    proposal_id: 'consensus-store-test-proposal',
    action: 'AUTHORIZE_DAISY_PRODUCTION',
    target: 'SOLVEX_DAISY_PRODUCTION',
    created_at: '2026-11-27T12:00:00.000Z',
    nonce: 'store-test-nonce',
    payload_sha256: 'a'.repeat(64),
    evidence_sha256: 'b'.repeat(64),
    rollback_plan_sha256: 'c'.repeat(64)
  };
  const body = {
    protocol: 'SOLVEX_DAISY_INDEPENDENT_UNANIMOUS_CONSENSUS_V1' as const,
    proposal,
    policy_sha256: 'd'.repeat(64),
    input_bundle_sha256: 'e'.repeat(64),
    votes: [],
    generated_at: '2026-11-27T12:01:00.000Z'
  };
  return { ...body, certificate_sha256: sha256Canonical(body) };
}

function createFakePool() {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const nonces = new Set<string>();
  const certificates = new Map<string, ConsensusCertificate>();
  const client: ConsensusPgClient = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
      if (sql.startsWith('INSERT INTO public.daisy_consensus_nonces')) {
        const nonce = String(values[0]);
        if (nonces.has(nonce)) return { rows: [], rowCount: 0 };
        nonces.add(nonce);
        return { rows: [{ nonce }], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO public.daisy_consensus_certificates')) {
        const certificate = JSON.parse(String(values[6])) as ConsensusCertificate;
        if (certificates.has(certificate.certificate_sha256)) return { rows: [], rowCount: 0 };
        certificates.set(certificate.certificate_sha256, certificate);
        return { rows: [{ certificate_sha256: certificate.certificate_sha256 }], rowCount: 1 };
      }
      if (sql.startsWith('SELECT certificate_json FROM public.daisy_consensus_certificates')) {
        const certificate = certificates.get(String(values[0]));
        return { rows: certificate ? [{ certificate_json: certificate }] : [], rowCount: certificate ? 1 : 0 };
      }
      if (sql.startsWith('SELECT set_config')) return { rows: [{ set_config: 'tenant-a' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() {}
  };
  const pool: ConsensusPgPool = {
    async connect() { return client; },
    async end() {}
  };
  return { pool, calls, nonces, certificates };
}

test('nonce consumption is atomic, tenant-scoped, and replay-resistant', async () => {
  const fake = createFakePool();
  const store = new NeonDaisyConsensusStore(fake.pool, 'tenant-a', DAISY_CONSENSUS_STAGING_HOST);
  const nonce = 'one-time-nonce';
  assert.equal(await store.consumeOnce(nonce, 'f'.repeat(64), Date.now()), true);
  assert.equal(await store.consumeOnce(nonce, 'f'.repeat(64), Date.now()), false);
  assert.ok(fake.calls.some(call => call.sql === 'BEGIN'));
  assert.ok(fake.calls.some(call => call.sql.includes("set_config('app.tenant_id'") && call.values?.[0] === 'tenant-a'));
  assert.ok(fake.calls.some(call => call.sql.includes('ON CONFLICT (tenant_id, nonce) DO NOTHING')));
  assert.ok(fake.calls.some(call => call.sql === 'COMMIT'));
  assert.ok(fake.calls.every(call => !/CREATE TABLE|ALTER TABLE|CREATE POLICY/i.test(call.sql)));
});

test('certificate persistence is hash-bound and idempotent', async () => {
  const fake = createFakePool();
  const store = new NeonDaisyConsensusStore(fake.pool, 'tenant-a', DAISY_CONSENSUS_STAGING_HOST);
  const certificate = makeCertificate();
  assert.equal(await store.persistCertificate(certificate), true);
  assert.equal(await store.persistCertificate(certificate), true);
  const restored = await store.getCertificate(certificate.certificate_sha256);
  assert.deepEqual(restored, certificate);
  const tampered = { ...certificate, proposal: { ...certificate.proposal, target: 'OTHER_TARGET' } };
  await assert.rejects(() => store.persistCertificate(tampered), /CONSENSUS_CERTIFICATE_INTEGRITY_INVALID/);
});

test('store rejects any database host outside the two existing SolveX Neon branches', () => {
  const fake = createFakePool();
  assert.throws(
    () => new NeonDaisyConsensusStore(fake.pool, 'tenant-a', 'old-branch.neon.tech'),
    /DATABASE_HOST_NOT_IN_EXISTING_SOLVEX_NEON_ALLOWLIST/
  );
});
