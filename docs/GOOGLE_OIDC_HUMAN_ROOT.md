# Google OIDC for MMTAI Human-Root Identity

## Implemented boundary

`src/blockchain/GoogleOidcIdentityVerifier.ts` validates a Google OpenID Connect ID token through Google's tokeninfo endpoint. It rejects tokens with a mismatched audience, invalid issuer, expired token, unverified email, missing subject, or email outside the configured allowlist.

Required server-side configuration:

- `GOOGLE_OIDC_CLIENT_ID`: OAuth 2.0 Web application client ID.
- `MMTAI_HUMAN_ROOT_EMAILS`: comma-separated exact email allowlist. This must be provisioned by the system owner, not supplied by a browser request.

The raw ID token must never be logged or stored. Token verification is server-side and has a short network timeout.

## Security distinction

Google OIDC authenticates an account. It does not prove that the account holder approved a particular blockchain operation. The approval service must display the exact tenant, capability, chunk ID, and inclusive height range; require an explicit user action; and then issue an Ed25519 signature over the canonical scoped approval payload. The existing signed-approval verifier validates that signature and the Neon-backed nonce ledger rejects replay.

Google identity alone must never mint an approval, bypass MMTAI scoped authorization, or activate execution. No signing private key is stored in this repository.

## Owner setup still required

1. Create an OAuth 2.0 Client ID of type Web application in Google Cloud Console.
2. Configure authorized JavaScript origins and exact redirect URI(s) for the deployed approval UI.
3. Store the client ID in server-side environment configuration as `GOOGLE_OIDC_CLIENT_ID`.
4. Set `MMTAI_HUMAN_ROOT_EMAILS` to the exact Google account email(s) authorized to review requests.
5. Configure a separately governed Ed25519 signing service/key and publish its public key in Neon after key custody, rotation, and revocation procedures are reviewed.
6. Deploy the human approval UI/service and test denial, wrong-account, expired-token, replay, scope-mismatch, and key-revocation cases.

Until these owner-controlled values and services are configured, the human-root gate remains BLOCKED. Do not use a placeholder client ID, allowlist, or signing key.
