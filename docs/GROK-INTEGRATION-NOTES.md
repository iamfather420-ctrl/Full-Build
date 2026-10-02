# Grok workspace integration

This branch preserves the hardened SOLVEX backend at the repository root and adds the reviewed Grok/TanStack website under `website/`.

## Boundary

- `website/` is an independently deployable TanStack Start/Vercel application.
- The root Express/Vite application and its hardened verification suite are unchanged.
- No secrets, full `.grok/` platform instructions, `.vercel/output/`, node modules, or generated build artifacts are committed. The website keeps only the minimal OG/app-env fixtures required by its own tests.
- Backend-to-website API wiring remains a follow-up; this branch intentionally avoids changing authorization or payment behavior during UI integration.

## Validation

- `website`: TypeScript passes and production build succeeds.
- `website`: upstream test suite currently reports 179 passing and 16 failing PWA metadata assertions because the checked-in `src/lib/og/site.json` deliberately identifies the app as `UAREFAKE`, while those generic tests expect isolated sample identities. These are recorded as upstream fixture/expectation mismatches, not suppressed.
- `website`: one upstream empty-catch lint error was fixed with a behavior-neutral explanatory comment.
- Root hardened backend validation remains a separate required gate.
