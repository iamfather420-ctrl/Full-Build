---
name: SolveX 29 Products
description: Canonical product list and IDs for the SolveX platform
---

The 29 exact products come from the enterprise Android app at:
`attached_assets/extracted/enterprise/app/src/main/java/com/example/data/InitialCatalog.kt`

NOT from seed-paradoxes.ts (which has only 11 different paradox products).

**Domain breakdown:**
- SOLVEX-ZK-01 to ZK-06: Cryptography & ZK Privacy → category "fundamental"
- SOLVEX-HFT-07 to HFT-12: High-Frequency Financial → category "operational"
- SOLVEX-SEC-13 to SEC-18: Security & Compliance → category "operational" (SEC-15 is "ai")
- SOLVEX-IAM-19 to IAM-23: Identity & Access → category "ai"
- SOLVEX-GOV-24 to GOV-28: AI Governance → category "ai" (GOV-25, GOV-26, GOV-28 are "operational")
- SOLVEX-MASTER-29: Master Apex Bundle → category "fundamental"

**Why:** InitialCatalog.kt is the canonical B2B enterprise product list for Tier-1 Canadian banks. The 11 paradoxes in seed-paradoxes.ts are a separate consumer-facing product set from the marketplace project.

**How to apply:** When the user asks about products, always reference these 29 products. Seeding is idempotent via `POST /api/owner/seed-products`.
