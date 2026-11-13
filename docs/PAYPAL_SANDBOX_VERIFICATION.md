# PayPal sandbox verification (Vercel-only)

This endpoint performs exactly one PayPal sandbox OAuth client-credentials request. It never creates orders, captures, refunds, or moves money.

## Deployment and authorization

- Vercel project: `full-build`
- Preview branch: `feature/external-dependency-railway-v2`
- Route: `POST /api/paypal/sandbox-verify`
- PayPal provider credentials remain in Vercel environment variables only.
- GitHub Actions and Railway must not receive PayPal credentials.

Add a new encrypted Vercel Preview environment variable scoped to the branch above:

- Name: `PAYPAL_VERIFY_HMAC_SECRET`
- Value: generate a unique random secret of at least 32 characters; keep it private.
- Do not reuse a secret from a prior declined setup attempt.

The route requires that value in the `x-solvex-verification-key` request header. It uses a constant-time comparison, returns no-store responses, rejects all methods except POST, and fails closed unless `PAYPAL_ENVIRONMENT=sandbox` and `PAYMENTS_ENABLED=false` exactly.

## Run

After the preview deployment is READY and the new environment variable has been added, send a POST request to:

`https://<preview-host>/api/paypal/sandbox-verify`

with header `x-solvex-verification-key: <your private secret>` and no request body. Do not paste the secret into chat or commit it.

A successful response contains a sanitized report and SHA-256 hash only. It does not contain the PayPal access token or any credential values. A successful response proves sandbox OAuth authentication only; it does not prove live readiness or transaction readiness.

## Safety boundaries

- Only `api-m.sandbox.paypal.com` is contacted.
- Redirects are rejected.
- Live credentials are never read.
- Payment processing must remain disabled.
- No OAuth token is logged, returned, or persisted.
- No provider credentials are copied to GitHub or Railway.
