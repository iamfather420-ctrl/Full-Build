-- Forward migration: outreach tables for Neon PostgreSQL
-- Generated from the shared app schema definition (outreach.ts)
-- Branch: chore/predeploy-hardening-20261111
-- Safe: tables do not exist in production; no data loss possible
-- Dialect: PostgreSQL (Neon). NOT MySQL.

BEGIN;

CREATE TABLE IF NOT EXISTS outreach_prospects (
    id              TEXT PRIMARY KEY,
    source          TEXT NOT NULL,            -- 'hacker_news' | 'stack_exchange'
    source_id       TEXT NOT NULL,
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    author          TEXT,
    tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
    fit_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    stage           TEXT NOT NULL DEFAULT 'discovered',
    -- stages: discovered -> composed -> sending -> delivered | rejected | failed
    composed_body   TEXT,
    composed_subject TEXT,
    gmail_message_id TEXT,
    owner_approved  BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    last_error      TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_prospects_stage
    ON outreach_prospects (stage);

CREATE INDEX IF NOT EXISTS idx_outreach_prospects_fit_score
    ON outreach_prospects (fit_score DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_prospects_created_at
    ON outreach_prospects (created_at DESC);

CREATE TABLE IF NOT EXISTS outreach_events (
    id              BIGSERIAL PRIMARY KEY,
    prospect_id     TEXT NOT NULL
        REFERENCES outreach_prospects (id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    -- event types: discovered, composed, owner_approved, sending,
    --              delivered, rejected, failed, retry
    actor           TEXT,                     -- 'system' | 'owner' | owner id
    detail          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_prospect_id
    ON outreach_events (prospect_id);

CREATE INDEX IF NOT EXISTS idx_outreach_events_created_at
    ON outreach_events (created_at DESC);

-- Atomic stage-claim helper: only one worker can claim a composed row
CREATE OR REPLACE FUNCTION claim_outreach_stage(
    p_prospect_id TEXT,
    p_from_stage  TEXT,
    p_to_stage    TEXT,
    p_actor       TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE outreach_prospects
       SET stage = p_to_stage,
           updated_at = NOW()
     WHERE id = p_prospect_id
       AND stage = p_from_stage;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count = 1 THEN
        INSERT INTO outreach_events (prospect_id, event_type, actor)
        VALUES (p_prospect_id, p_to_stage, p_actor);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

COMMIT;
