-- Additive, manually applied storage for Daisy 3-of-3 consensus replay protection
-- and signed consent certificates. The service never runs DDL automatically.
-- Apply only to the already-existing Neon branch selected by the owner.

CREATE TABLE IF NOT EXISTS public.daisy_consensus_nonces (
  tenant_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  proposal_sha256 CHAR(64) NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  consumed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, nonce)
);

CREATE INDEX IF NOT EXISTS daisy_consensus_nonces_consumed_at_idx
  ON public.daisy_consensus_nonces (tenant_id, consumed_at DESC);

CREATE TABLE IF NOT EXISTS public.daisy_consensus_certificates (
  tenant_id TEXT NOT NULL,
  certificate_sha256 CHAR(64) NOT NULL CHECK (certificate_sha256 ~ '^[a-f0-9]{64}$'),
  proposal_id TEXT NOT NULL,
  proposal_sha256 CHAR(64) NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_sha256 CHAR(64) NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  policy_sha256 CHAR(64) NOT NULL CHECK (policy_sha256 ~ '^[a-f0-9]{64}$'),
  input_bundle_sha256 CHAR(64) NOT NULL CHECK (input_bundle_sha256 ~ '^[a-f0-9]{64}$'),
  certificate_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, certificate_sha256)
);

CREATE INDEX IF NOT EXISTS daisy_consensus_certificates_created_at_idx
  ON public.daisy_consensus_certificates (tenant_id, created_at DESC);

ALTER TABLE public.daisy_consensus_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_consensus_nonces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_consensus_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_consensus_certificates FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='daisy_consensus_nonces'
       AND policyname='daisy_consensus_nonces_tenant_isolation'
  ) THEN
    CREATE POLICY daisy_consensus_nonces_tenant_isolation
      ON public.daisy_consensus_nonces FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='daisy_consensus_certificates'
       AND policyname='daisy_consensus_certificates_tenant_isolation'
  ) THEN
    CREATE POLICY daisy_consensus_certificates_tenant_isolation
      ON public.daisy_consensus_certificates FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END
$$;
