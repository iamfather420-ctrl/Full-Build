# Contributing

## Before making changes

- Read the repository [README](README.md), especially its release-safety and verification notes.
- Work from an up-to-date branch based on `main`.
- Keep changes focused and preserve existing source, evidence, archives, and release assets unless a change is explicitly authorized.
- Do not add mock, sample, placeholder, or simulated-success artifacts as substitutes for real implementation or evidence.
- Do not expose credentials, tokens, private keys, or production data in commits, issues, or pull requests.

## Setup

The repository documents Bun as its package-manager workflow:

```bash
bun install --frozen-lockfile
```

Use the lockfile committed with the branch. Do not regenerate or replace it with a different package manager without explaining why.

## Validation

Run the checks relevant to the files changed. Available repository scripts include:

```bash
bun run lint
bun run verify:release-safety
bun run verify:payments-disabled
bun run verify:enterprise
bun run verify:120
bun run verify:proof-closure
```

The README notes that `verify:all` does not run every verification script. Do not report a check as passing unless it was actually executed and its result was observed. Record commands, outcomes, and any blocked checks in the pull request.

## Pull requests

- Submit changes through a pull request targeting `main`; do not bypass repository review.
- Explain the problem, the implementation, the affected paths, and any operational or security implications.
- Include test and verification evidence, or clearly state why a check could not be run.
- Identify migrations, generated artifacts, external services, secrets, and deployment effects.
- Keep unrelated refactors out of the change.
- Do not merge or deploy without the required human review and authorization.

## Security issues

Follow [SECURITY.md](SECURITY.md). Do not disclose vulnerabilities or sensitive evidence in a public pull request.
