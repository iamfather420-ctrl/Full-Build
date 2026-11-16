-- DRAFT ONLY. Do not apply to the live SolveX registry without an authorized backup and review.
-- This file creates no roles, grants, or credentials.
CREATE TABLE IF NOT EXISTS public.daisy_builds (
  build_id text PRIMARY KEY,
  objective_sha256 text NOT NULL,
  state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.daisy_tasks (
  build_id text NOT NULL REFERENCES public.daisy_builds(build_id),
  task_id text NOT NULL,
  kind text NOT NULL,
  state text NOT NULL,
  artifact_sha256 text,
  PRIMARY KEY (build_id, task_id)
);
CREATE TABLE IF NOT EXISTS public.daisy_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  build_id text NOT NULL REFERENCES public.daisy_builds(build_id),
  kind text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
