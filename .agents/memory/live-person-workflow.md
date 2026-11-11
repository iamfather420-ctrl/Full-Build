---
name: Live Person Workflow
description: End-to-end path from real-lead discovery to actual human delivery via connected Gmail, with honesty gates at every stage
---

# Live Person Workflow

## Purpose
Convert the autonomous outreach engine from draft-queue to real human contact. Every stage that touches a person must be real, attributable, and non-simulated.

## Ports
- Lead ingestion / discovery API: **8080**
- Delivery / Gmail send API: **8081**

## Stage Flow
1. **discovered** — HN Algolia full-text + Stack Exchange tag-based `/questions?tagged=` return fresh unanswered questions. Per-source 5-minute cooldown, small page sizes, SE anonymous quota ~300/day. Dedupe via DB unique index on source_url + onConflictDoNothing.
2. **composed** — Fit-score each genuine post, compose a tailored reply matched to a specific paradox-resolution instrument. Drafts queue here. Nothing sends.
3. **sending** — Atomic stage claim (composed→sending) with header-injection defense (reject CR/LF in to/subject). Owner-guarded via requireOwner.
4. **delivered** — Set ONLY after a real Gmail API success. On failure, revert to composed.
5. **replied** — Reserved for actual human responses received on the connected channel.

## Hard Rules
- Never fake a send, a reply, or revenue. The user explicitly rejected simulated deals/pipeline.
- `delivered`/`replied` are unreachable until a real channel is connected — Gmail is now connected.
- Reddit remains manual: public JSON API returns 403 from cloud IPs; OAuth prompt was dismissed.
- Speak of outreach in first person — it is YOUR activity.

## Why
User complained that simulated 0.198 ETH "revenue" was fake. Honesty is non-negotiable. This workflow makes the person-facing loop real without relaxing that constraint.
