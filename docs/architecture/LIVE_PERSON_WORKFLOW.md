# Live Person Workflow — Architecture

## Overview
The live person workflow is the person-facing half of the SolveX autonomous outreach loop. It sits between the discovery engine (real leads from HN/Stack Exchange) and the connected Gmail delivery channel, with strict stage gates so nothing reaches a human unless it is real.

## Components

### Discovery (port 8080)
- `artifacts/api-server/src/routes/brain.ts` — lead hunting orchestration, fit-scoring, composition
- Sources: HN Algolia (open, no key), Stack Exchange tag-based questions (open, ~300/day anonymous)
- Cooldown: 5 min per source; dedupe: unique index on source_url

### Delivery (port 8081)
- `artifacts/api-server/src/routes/delivery.ts` — Gmail send route, owner-guarded
- Atomic stage claim: composed → sending → delivered, revert to composed on failure
- Header-injection defense: CR/LF rejected in to/subject (route + gmail lib)
- `delivered` written only after Gmail API confirms success

### UI
- `artifacts/solvex/src/pages/BrainConsole.tsx` — OUTBOUND AUTH module shows 3 prospects (NovaTech, Apex Logistics, Centrum BioGate) and the hybrid workflow router
- `/outreach` page surfaces live results with real source links

## Integrity Checks
- `node scripts/verify_release_safety.mjs` must still PASS — payments remain disabled
- No simulated revenue, no fake sends, no fabricated replies
- First-person voice for all outreach activity

## Open Items
- Reddit connector: dismissed OAuth; manual until authorized
- Real OIDC provider not yet configured (production readiness blocker, separate from this workflow)
