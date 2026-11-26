# Vercel → Render Daisy proxy configuration

## Request path

The public Full-Build website remains on Vercel. Browser requests stay same-origin:

- `GET /api/daisy/status`
- `POST /api/daisy/chat`

The existing Vercel API handler resolves the existing OIDC session and active signed tenant membership. It forwards the short-lived signed tenant token to the dedicated Full-Build Render service, together with a separate service-to-service secret. The Render internal route verifies both before calling the existing Daisy backend router.

The Render service URL is never accepted from the browser. The upstream hostname is pinned by server-side environment configuration and must match exactly.

## Required server-side environment

Configure these values only in the Vercel Production and Preview server-side environment settings as appropriate. Never use a `NEXT_PUBLIC_` prefix and never expose them to browser code.

| Vercel variable | Value |
|---|---|
| `DAISY_RENDER_BASE_URL` | HTTPS origin of the dedicated Full-Build Daisy Render service, e.g. `https://<service>.onrender.com` |
| `DAISY_RENDER_ALLOWED_HOST` | Exact hostname portion of that URL, e.g. `<service>.onrender.com` |
| `DAISY_RENDER_PROXY_SECRET` | Independently generated random secret with at least 32 characters |

Configure the same random secret in the dedicated Render service as:

| Render variable | Value |
|---|---|
| `DAISY_PROXY_SHARED_SECRET` | Exact same secret as Vercel `DAISY_RENDER_PROXY_SECRET` |

Generate the secret using a cryptographically secure password generator. Do not commit it, paste it into a PR, place it in client-side configuration, or log it. Store it in both platforms' encrypted environment settings. Rotate both copies together if it is exposed.

## Authentication and isolation

- Vercel first resolves the browser's existing OIDC session using the existing auth middleware.
- The proxy requires an authenticated user, a matching signed tenant claim and the short-lived tenant token.
- The proxy forwards the tenant token and the service secret over HTTPS.
- Render verifies the service secret using constant-time comparison, then verifies the signed tenant token against Neon, including current active membership and role.
- The Render Daisy router independently checks authenticated tenant identity and retains its existing per-tenant request limits.
- Chat mutations require same-origin requests. Responses are no-store. Upstream redirects are rejected; upstream response sizes and request timeouts are bounded.
- No browser-supplied upstream URL, tenant ID, role, service secret or bearer token is trusted.
- No external-model fallback or simulated response is introduced.

## Deployment order

1. Create a separate Full-Build Daisy Render service from the approved dedicated Dockerfile. Do not alter the existing Discover-Engine Render service.
2. Use a dedicated non-production Neon branch for the initial service. Do not point it at production Neon.
3. Configure the Render OIDC variables and `DATABASE_URL` using the existing Full-Build authentication contract.
4. Set `DAISY_PROXY_SHARED_SECRET` on Render.
5. Set the matching `DAISY_RENDER_PROXY_SECRET`, `DAISY_RENDER_BASE_URL`, and `DAISY_RENDER_ALLOWED_HOST` on Vercel as server-side variables.
6. Register the Render callback URI `https://<service>.onrender.com/api/callback` with the existing OIDC provider. Keep the existing Vercel callback registration unchanged.
7. Verify Render `/healthz`, OIDC login, authenticated Daisy status, and a real non-empty local-model chat response.
8. Verify the same chat through Vercel `/api/daisy/status` and `/api/daisy/chat`. Confirm unauthenticated, cross-origin, missing-secret, wrong-host, invalid-tenant, oversized and unavailable-upstream requests fail closed.
9. Capture deployment IDs and sanitized evidence. Do not change DNS, aliases, production routing, Neon production schema, payments or production activation.

## Current limitations

This change only prepares the code path. It does not create the Render service, set either platform's environment variables, register OIDC callbacks, or deploy any branch. The dedicated Render service and Vercel proxy cannot work until those manual platform settings exist. Production routing remains unchanged.
