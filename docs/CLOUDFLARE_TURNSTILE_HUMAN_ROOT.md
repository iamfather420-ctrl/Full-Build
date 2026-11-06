# Cloudflare Turnstile for MMTAI Human-Root Approval

## Selected provider

Use **Cloudflare Turnstile** as the CAPTCHA / anti-automation challenge for the MMTAI human-approval interface. The server-side verifier is implemented in `src/blockchain/CloudflareTurnstileVerifier.ts`.

## Required configuration

Create a Turnstile widget in the Cloudflare dashboard and configure its hostname allowlist to the exact deployed approval UI hostname(s). Use the managed challenge mode unless the deployment has a reviewed reason to choose another mode.

Configure these values in the server's secret manager (never in source control or browser-visible environment variables):

- `TURNSTILE_SITE_KEY`: public widget site key, used by the browser widget.
- `TURNSTILE_SECRET_KEY`: private server-side Siteverify secret, used only by `CloudflareTurnstileVerifier`.
- `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated exact hostnames, without schemes or paths.

The verifier expects the action `mmtai-human-root`. The frontend must render the widget with that action and send the resulting single-use token to a server endpoint. The endpoint must call `verify(token, remoteIp)` on the server and reject the request unless `verified === true`. Only pass a remote IP obtained from a trusted reverse-proxy configuration; omit it otherwise.

## Security boundary

- The Siteverify secret must never reach the browser.
- Never accept a browser-supplied `verified` flag.
- Never log or persist the CAPTCHA response token.
- Siteverify failures, timeouts, invalid tokens, hostname mismatches, and action mismatches must block the approval flow.
- CAPTCHA is anti-bot friction only. It does not authenticate a Google account, express consent, sign an operation, or grant execution authority.
- Continue to require Google OIDC identity verification, an explicit approval action displaying the exact tenant/capability/chunk/height scope, the Ed25519 signature, active non-revoked key validation, durable nonce consumption, and MMTAI scoped authorization.

## Activation checklist

1. Create the Turnstile widget and add the exact production hostname(s).
2. Store the site key and secret in the deployment environment using the names above.
3. Wire the browser widget into the human-approval page and submit its token to the server endpoint.
4. Instantiate the verifier server-side with the secret and exact hostname allowlist.
5. Run negative tests for missing/expired/replayed tokens, invalid Siteverify responses, wrong hostnames, wrong action, network timeout, and secret misconfiguration.
6. Confirm that every failure leaves the human-root operation BLOCKED.

This repository now contains the server-side verification component and integration contract. Live CAPTCHA is not active until the Cloudflare widget is provisioned, the deployment secrets are configured, and the approval UI/server endpoint is wired and tested. No secret, hostname, or widget ID is fabricated here.
