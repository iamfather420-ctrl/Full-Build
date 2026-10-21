-- Additive access-request storage only. This migration is NOT applied automatically.
-- Payments and checkout remain disabled; access requests require separate human authorization.
BEGIN;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (length(btrim(tenant_id)) > 0),
  offer_id TEXT NOT NULL CHECK (length(btrim(offer_id)) > 0),
  request_text TEXT NOT NULL CHECK (length(btrim(request_text)) >= 10),
  requested_by TEXT NOT NULL CHECK (length(btrim(requested_by)) > 0),
  idempotency_key TEXT NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 12 AND 128),
  status TEXT NOT NULL CHECK (status = 'ACCESS_REQUEST_PENDING'),
  authorization_state TEXT NOT NULL CHECK (authorization_state = 'HUMAN_REVIEW_REQUIRED'),
  payment_state TEXT NOT NULL CHECK (payment_state = 'DISABLED'),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT access_requests_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_access_requests_tenant_created
  ON public.access_requests (tenant_id, created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests FORCE ROW LEVEL SECURITY;

-- The signed tenant context is evaluated by the existing private policy helper.
-- If that helper is absent or the policy cannot be installed, the migration must fail.
CREATE POLICY solvex_access_requests_signed_tenant
  ON public.access_requests
  AS RESTRICTIVE
  FOR ALL
  TO PUBLIC
  USING (
    tenant_id = (solvex_private.current_claims() ->> 'tenant_id')
    OR (solvex_private.current_claims() ->> 'role') = 'SYS_ADMIN'
  )
  WITH CHECK (
    tenant_id = (solvex_private.current_claims() ->> 'tenant_id')
    OR (solvex_private.current_claims() ->> 'role') = 'SYS_ADMIN'
  );

COMMIT;
