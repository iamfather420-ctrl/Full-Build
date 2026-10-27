# Security, recovery, and release gates

## Security boundaries already enforced in source

- Payments disabled (410 / adapter no-op)
- External model opt-in only (`ALLOW_EXTERNAL_MODEL_PROVIDER`)
- Generic Neon migrations/writes blocked
- Local AuthService mint/verify fail-closed on main until foundation merged and staged
- Stripe prohibited

## Still required before production

| Gate | Evidence needed |
| --- | --- |
| Secrets only in platform secret store | No secrets in git; rotation procedure |
| TLS on canonical host | Staging then production probe |
| Rate limit / CSRF on mutating routes | Load test + cookie/origin checks |
| Session revocation | Logout invalidates server session |
| Tenant isolation | Two-tenant adversarial SQL + HTTP tests |
| Backup restore | Restore drill on disposable Neon branch |
| Rollback | Prior Vercel deployment reversible |
| Incident notes | Owner, severity, contact path |

## Release packaging

1. Tag only commits with fresh 120-case + 46-gate artifacts
2. Preserve archive manifests and checksums under `sources/`
3. Publish status page / README section stating **NOT PRODUCTION-READY** until all blockers clear
4. Do not treat green CI alone as production authorization
