---
name: SolveX API Server Dependencies
description: Runtime packages that must be in api-server's own dependencies
---

The api-server esbuild bundler resolves packages at build time from the package's own node_modules.

**Must be in `artifacts/api-server/package.json` → `dependencies`:**
- `nanoid` — used in route handlers for ID generation
- `express-session` — session middleware in app.ts
- `express`, `cors`, `pino-http`, `pino` — core server packages

**Why:** esbuild fails with "Could not resolve X" if a package is only in the workspace root and not in the artifact's own dependencies. The workspace root `node_modules` is not on the resolution path for esbuild.

**How to apply:** When adding any new `import` to api-server routes, check that the package is in `artifacts/api-server/package.json` dependencies before running the build.
