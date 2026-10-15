# Deployment Blockers — Verified Vercel Snapshot

Checked: 2026-10-15. Scope: Vercel project `uarefake`, project ID `prj_Tj42CgzCWuJSlzhwxFLLNrkLUHVu`.

## Observed state
- Project metadata reports `live: false`.
- The newest deployment is READY but has `target: null`; it is a preview deployment from `iamfather420-ctrl/Uarefake-1`, branch `integration/proof-before-power-gate`, commit `aa0b7690a07846ec8c66f7524665d87dddfe7a8a`.
- The only visible project environment variable is `DATABASE_URL`, targeted to production, stored as sensitive, with an empty value. Do not treat it as a usable database connection.
- `uarefake.space` is attached to the project but `verified: false`; Vercel reports pending domain verification and supplies a TXT challenge under `_vercel.uarefake.space`.
- `uarefake.com` is not in the project domain list.
- The project's current verified Vercel application domains are the Vercel-hosted `uarefake.vercel.app` and preview aliases. This does not prove the requested custom domains route to the application.

## Required actions before production
1. In the domain registrar/DNS provider, publish the exact Vercel TXT verification record for `uarefake.space`, then verify it in Vercel.
2. Confirm ownership and current DNS/routing of `uarefake.com` before attaching it to the intended production project. Do not blindly overwrite existing DNS or move a domain from another project.
3. Provision the correct least-privilege Neon runtime connection through the secret manager; never use a database owner credential as the routine app runtime. The existing production `DATABASE_URL` value is empty.
4. Configure and verify the actual server-side identity/tenant boundary and signed RLS context before enabling database-backed mutations.
5. Create a production deployment only after build/tests, runtime RLS verification, domain mapping, monitoring and restore checks pass. A READY preview deployment is not production.

## Safety
No production deployment, domain transfer, DNS modification, database migration, or payment activation was performed during this inspection.
