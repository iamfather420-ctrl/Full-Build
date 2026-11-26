# Daisy Haminja on Render — staging deployment checklist

This is a separate Full-Build service. It must not replace or modify the existing Discover-Engine service.

## Image and health check

- Repository: `iamfather420-ctrl/Full-Build`
- Dockerfile: `Dockerfile.render-daisy`
- Health-check path: `/healthz`
- The image starts `server.ts`, which serves the Full-Build UI and mounts the authenticated `/api/daisy` routes.
- The startup script downloads the exact model release pinned in the image, verifies the manifest SHA-256, model SHA-256 and byte count, then starts the server.
- The model is not activated merely because the image builds. A successful authenticated chat response is still required.

## Required Render environment variables

Set these in the Render service's secret/environment settings. Never commit values to Git.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Canonical Neon connection string. Use a dedicated non-production branch for staging. |
| `OIDC_ISSUER_URL` | Exact issuer URL used by the existing Full-Build OIDC integration. |
| `OIDC_CLIENT_ID` | OIDC client ID registered for this deployment. |
| `OIDC_RESOURCE_URL` | Protected SolveX API resource identifier required by the login flow. |
| `NODE_ENV` | Set to `production`. |
| `PORT` | Let Render inject this value. |

The entrypoint also accepts `NEON_DATABASE_URL`, `Database_url`, or `DATABASE_URL_FALLBACK` and maps it to `DATABASE_URL`, but `DATABASE_URL` is preferred.

## Model variables

The image supplies the following defaults for the first verified release:

- `DAISY_MODEL_PATH=/opt/daisy/model.gguf`
- `DAISY_INFERENCE_ENGINE=/app/scripts/daisy-infer.sh`
- `DAISY_LLAMA_CLI=/usr/local/bin/llama-cli`
- `DAISY_MODEL_RELEASE_TAG=daisy-model-45661493760`
- `DAISY_MODEL_MANIFEST_SHA256=2df0edee400b7c5dce5f8ad2062de60a63876228c23edb3f42b4a331fbf4fc64`
- `DAISY_MODEL_SHA256=d158c64ff056f3c76fbbc6f4824c53e5ffd5de94931f71db5a418cb1df9e50fd`
- `DAISY_MODEL_BYTES=105454176`

Do not override the release pins unless a new model release has been verified and the image is updated to pin that release.

## OIDC callback registration

The existing auth route constructs its callback from the incoming host. After Render assigns the service hostname, register this exact redirect URI with the OIDC provider:

`https://<render-service-host>/api/callback`

Keep the Vercel callback URI registered separately if Vercel remains in use. Do not weaken issuer, audience/resource, PKCE, nonce, state, verified-email, or signed-tenant checks.

## Database and production boundary

- Use a dedicated non-production Neon branch for the first Render test.
- Prefer the least-privilege `solvex_runtime_login_v2` role after verifying the connection string uses that role and the staging branch has the `auth_sessions_sid_isolation` RLS policy.
- Do not point staging at the production Neon branch.
- Production `auth_sessions` RLS is not yet enabled on the production branch; the existing migration is present in Git but requires an approved production change window and post-migration verification.
- Keep payments disabled. Do not set payment credentials or enable payment flags.
- Do not repoint, rename, suspend, or otherwise change the existing `discover-engine` Render service.

## Post-deployment verification

1. Confirm Render build succeeds and `/healthz` returns HTTP 200.
2. Confirm OIDC login and callback work on the Render hostname.
3. Confirm `GET /api/daisy/status` reports the pinned model and executable configured.
4. Send a real authenticated prompt to `POST /api/daisy/chat`.
5. Confirm non-empty output from the local model, with no external-provider fallback.
6. Capture response, deployment commit, release tag and model SHA-256 as evidence.
7. Only then consider wiring the Vercel website to Render or changing the primary app URL. Do not change production routing without explicit approval.

## Current limitation

A Render service has not yet been created. The current Render workspace inventory contains the separate Discover-Engine service only. This checklist does not authorize creating a billable service, changing DNS, applying production database migrations, or switching production traffic.
