---
name: Gemini Integration Blocked
description: Replit Gemini AI integration requires phone verification; current workaround is persona-based response system at /api/brain/chat
---

# Gemini Integration Status

## Status
`setupReplitAIIntegrations({ providerSlug: "gemini" })` returns `{ success: false, status: "awaiting_phone_verification" }`.
The integration cannot be provisioned until the account completes phone verification on Replit.

## Workaround
`artifacts/api-server/src/routes/brain.ts` implements `/api/brain/chat` with:
- Pre-crafted XML ledger responses for action types: TAX_AUDIT, PARADOX, NIST
- Keyword-routing for: paradox/chamber, irs/tax/eftps, prospect/outbound, roi/savings, nist/compliance, hello/status
- Generic U.A.R.E.F.A.K.E. response for unmatched queries

## When Real AI Is Available
Replace the keyword-routing in brain.ts with a real Gemini call using the system instruction from MilestoneViewModel.kt. Model to use: `gemini-2.5-flash` (via Replit integration) or `gemini-2.0-flash` (direct API).

**Why:** Building the full BrainConsole UI while keeping the door open for real AI once phone verification is resolved.
