# SolveX Stage 14 Ed25519 signer

This service is deployed separately from the SolveX application. It holds the Ed25519 private key and signs schema-valid Stage 14 verdict envelopes. The OpenAI model evaluation happens in the SolveX Stage 14 caller. The signature proves the signer accepted the supplied envelope, not that an independent reviewer validated the model's conclusion.

## Runtime configuration

- `SOLVEX_ORACLE_SIGNER_TOKEN`: random bearer token, at least 32 characters
- `SOLVEX_ORACLE_ID`: stable signer identity
- `SOLVEX_ORACLE_ED25519_PRIVATE_KEY_FILE`: mounted PEM private-key path (defaults to `/run/secrets/solvex-oracle-ed25519.pem`)
- `PORT`: optional HTTP port (defaults to 8080)

Mount the private key as a read-only runtime secret. Never bake it into the image, repository, build arguments, or logs. Terminate TLS at a trusted ingress and restrict ingress to the SolveX service. Store the bearer token only in the two services' secret managers and rotate it if exposed.

Generate an Ed25519 keypair in a trusted administrative environment. Put the private key only in the signer secret manager; configure the matching public key as `SOLVEX_ORACLE_ED25519_PUBLIC_KEY` in the SolveX deployment. Do not send either key to ChatGPT or commit them.

## Build and deploy

Build with an organization-approved Node base image ending in `@sha256:<64-hex-digest>` as `NODE_BASE_IMAGE`. Scan and deploy as a separate service with the runtime secrets above. Expose it only over HTTPS.

Set these SolveX application secrets:

- `SOLVEX_ORACLE_SIGNER_URL`: signer service origin (HTTPS)
- `SOLVEX_ORACLE_SIGNER_TOKEN`: same bearer token
- `SOLVEX_ORACLE_ID`: same identity
- `SOLVEX_ORACLE_ED25519_PUBLIC_KEY`: corresponding public key PEM
- `OPENAI_API_KEY`: OpenAI API key in the SolveX app secret manager
- `SOLVEX_OPENAI_MODEL`: optional model ID; defaults to `gpt-4o-mini`

The signer exposes `GET /healthz` and authenticated `POST /attest`. It enforces a 64 KiB request limit and signs the canonical tuple (oracle ID, model ID, input hash, verdict, rationale hash). The caller verifies the Ed25519 signature and exact field bindings.

## Trust boundary

This is a separately hosted signing service, not proof of independent operation by itself. For a genuinely independent oracle, the signer must be operated under a separate administrative boundary with separate key custody and an audit trail. This design deliberately uses one OpenAI evaluator model; it is not a second-model review.
