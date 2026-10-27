-- Additive first-party Daisy authentication schema.
-- NOT applied automatically. Review against the live Neon schema and tenant model first.
-- All token values stored here are SHA-256 hashes, never raw bearer tokens.
BEGIN;

CREATE TABLE IF NOT EXISTS daisy_auth_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL DEFAULT 'Personal workspace',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daisy_auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES daisy_auth_tenants(id) ON DELETE RESTRICT,
  normalized_email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'CUSTOMER'
    CHECK (role IN ('OWNER', 'ADMIN', 'VERIFIER', 'CUSTOMER')),
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daisy_auth_accounts_email_normalized
    CHECK (normalized_email = lower(btrim(normalized_email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS daisy_auth_accounts_email_uq
  ON daisy_auth_accounts (normalized_email);

CREATE TABLE IF NOT EXISTS daisy_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES daisy_auth_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES daisy_auth_tenants(id) ON DELETE RESTRICT,
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT daisy_auth_sessions_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS daisy_auth_sessions_account_active_idx
  ON daisy_auth_sessions (account_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS daisy_auth_one_time_tokens (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES daisy_auth_accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT daisy_auth_one_time_tokens_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS daisy_auth_one_time_tokens_account_idx
  ON daisy_auth_one_time_tokens (account_id, purpose, expires_at);

CREATE TABLE IF NOT EXISTS daisy_auth_rate_limits (
  key_hash char(64) PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daisy_auth_rate_limits_updated_idx
  ON daisy_auth_rate_limits (updated_at);

COMMIT;

-- Mandatory adapter guarantees:
-- 1. Registration atomically creates a tenant + CUSTOMER account + VERIFY_EMAIL token;
--    duplicate emails return created=false without leaking account existence.
-- 2. Token consumption is one atomic UPDATE ... WHERE consumed_at IS NULL
--    AND expires_at > now() RETURNING account_id.
-- 3. Password reset updates password and revokes every active session in one transaction.
-- 4. Session reads join account state and verify session tenant_id = account tenant_id.
-- 5. Runtime DB role is least-privilege; enable and FORCE RLS with tenant policies
--    before exposing tenant-scoped data. This migration alone does NOT establish RLS.
-- 6. Never apply until schema reconciliation and disposable-branch restore/isolation tests pass.
