-- MMTAI blockchain evidence persistence. Apply first to a Neon development branch.
CREATE SCHEMA IF NOT EXISTS mmtai_blockchain;

CREATE TABLE IF NOT EXISTS mmtai_blockchain.human_root_keys (
  key_id text PRIMARY KEY,
  approver_id text NOT NULL,
  public_key_pem text NOT NULL,
  algorithm text NOT NULL DEFAULT 'Ed25519' CHECK (algorithm = 'Ed25519'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE IF NOT EXISTS mmtai_blockchain.approval_nonces (
  nonce_hash char(64) PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_nonces_expiry_idx
  ON mmtai_blockchain.approval_nonces (expires_at);

CREATE TABLE IF NOT EXISTS mmtai_blockchain.approval_audit (
  approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  approver_id text NOT NULL,
  key_id text,
  capability text NOT NULL CHECK (capability = 'BITCOIN_BLOCK_READ_VERIFY'),
  chunk_id text NOT NULL,
  start_height bigint NOT NULL CHECK (start_height >= 0),
  end_height bigint NOT NULL CHECK (end_height >= start_height),
  nonce_hash char(64) NOT NULL,
  signature_hash char(64) NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_audit_tenant_time_idx
  ON mmtai_blockchain.approval_audit (tenant_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS mmtai_blockchain.verification_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  network text NOT NULL,
  verification_scope text NOT NULL,
  start_height bigint NOT NULL CHECK (start_height >= 0),
  end_height bigint NOT NULL CHECK (end_height >= start_height),
  status text NOT NULL CHECK (status IN ('VERIFIED', 'BLOCKED')),
  processed_blocks integer NOT NULL CHECK (processed_blocks >= 0),
  failed_blocks integer NOT NULL CHECK (failed_blocks >= 0),
  source text NOT NULL CHECK (source = 'BITCOIN_CORE_RPC'),
  report_hash char(64) NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_runs_tenant_time_idx
  ON mmtai_blockchain.verification_runs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mmtai_blockchain.verification_chunks (
  run_id uuid NOT NULL REFERENCES mmtai_blockchain.verification_runs(run_id),
  chunk_id text NOT NULL,
  start_height bigint NOT NULL,
  end_height bigint NOT NULL,
  processed_blocks integer NOT NULL,
  authorization_status text NOT NULL CHECK (authorization_status IN ('AUTHORIZED', 'BLOCKED')),
  status text NOT NULL CHECK (status IN ('VERIFIED', 'BLOCKED')),
  PRIMARY KEY (run_id, chunk_id),
  CHECK (end_height >= start_height)
);

CREATE TABLE IF NOT EXISTS mmtai_blockchain.verification_blocks (
  run_id uuid NOT NULL REFERENCES mmtai_blockchain.verification_runs(run_id),
  height bigint NOT NULL,
  block_hash char(64),
  verified boolean NOT NULL,
  evidence jsonb NOT NULL,
  PRIMARY KEY (run_id, height)
);

-- The application role must receive only the required schema/table privileges out of band.
-- PUBLIC receives no access. Do not grant this schema to browser/client roles.
REVOKE ALL ON SCHEMA mmtai_blockchain FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA mmtai_blockchain FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mmtai_blockchain FROM PUBLIC;
