# Contributing to Full-Build

## Before opening a change

1. Check existing issues and pull requests for related work so duplicate implementations are avoided.
2. Work from the current `main` branch and create a focused feature or fix branch.
3. Keep changes scoped. Do not combine unrelated application, infrastructure, authentication, payment, or evidence changes.
4. Never commit credentials, private keys, tokens, customer data, or production database contents.

## Local setup

Use the lockfile-backed install:

```bash
bun install --frozen-lockfile
```

Use the repository's committed scripts. Useful baseline checks include:

```bash
bun run lint
bun run verify:release-safety
bun run verify:payments-disabled
bun run verify:enterprise
bun run verify:120
bun run verify:proof-closure
```

Run the tests relevant to the files changed. Do not claim a check passed unless it was actually run and its result is available. Some checks require configured external services or secrets; report those as blocked or not run rather than substituting mocks.

## Pull requests

- Explain the problem, the intended change, and any behavior or migration impact.
- List the exact commands run and their outcomes.
- Identify checks that were blocked, skipped, or not run.
- Include tests for security boundaries, failure paths, and tenant isolation when applicable.
- Call out database migrations and deployment changes explicitly. Never apply a production migration or enable a production feature as part of an ordinary code change.
- Preserve fail-closed behavior. Do not bypass trusted identity, signed tenant claims, authorization, payment-disabled controls, or release gates.
- Do not edit generated verification evidence to manufacture a passing result; regenerate it with the repository's verifier scripts.

## Review and merge

Changes require review and passing required CI checks. Resolve conflicts against current `main`, rerun affected checks, and avoid merging overlapping implementations together. Keep production readiness claims tied to current, reproducible evidence.
