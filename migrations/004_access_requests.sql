-- Additive migration for the evidence-gated, no-payment access-request workflow.
-- This migration is NOT applied automatically. Review and apply only after validating
-- the existing Neon schema and taking a recoverable backup. It does not alter the 27 existing tables.
BEGIN;
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  request_text TEXT NOT NULL CHECK (length(request_text) BETWEEN 10 AND 4000),
  requested_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACCESS_REQUEST_PENDING', 'ACCESS_REQUEST_REVIEWED', 'ACCESS_REQUEST_APPROVED', 'ACCESS_REQUEST_REJECTED')),
  authorization_state TEXT NOT NULL DEFAULT 'HUMAN_REVIEW_REQUIRED',
  payment_state TEXT NOT NULL DEFAULT 'DISABLED' CHECK (payment_state = 'DISABLED'),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_access_requests_tenant_created ON access_requests (tenant_id, created_at DESC);
COMMIT;
