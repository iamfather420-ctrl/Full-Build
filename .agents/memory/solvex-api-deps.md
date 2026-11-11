---
name: SolveX API Dependencies
description: nanoid and express-session must live in api-server dependencies, not workspace root
---
- `nanoid` — used for artifact and outreach IDs in artifacts/api-server
- `express-session` — session handling for owner-guarded routes (requireOwner on Gmail send)
Both must be declared in artifacts/api-server/package.json, never hoisted to the monorepo root. Hoisting breaks the api-server's isolated install and silently drops the modules at runtime.
