# Training trust-root provisioning

This file documents the human ceremony. It does not provision a key.
The directory must contain no private key and no placeholder public key.
Until a human installs a real public key, optimizer authorization fails closed.

## What may be installed

Only an Ed25519 public key, SPKI PEM, named `<key-id>.spki.pem`.
The key id is that filename without `.spki.pem`.
The verifier ignores every other file. A private key in this directory is a defect, not a credential.

## Generate the key offline

Run this on a machine that is not this repository and not CI. Do not commit the private key.

```
openssl genpkey -algorithm ED25519 -out daisy-training-root.pkcs8.pem
openssl pkey -in daisy-training-root.pkcs8.pem -pubout -out <key-id>.spki.pem
```

Keep `daisy-training-root.pkcs8.pem` outside the repository.
Copy only `<key-id>.spki.pem` into `training/daisy-smollm2/trust-root/`.

## What a signature must bind

The signed record uses schema `daisy-training-authorization/v1`.
The signature covers the canonical JSON of every field except `signature`: object keys sorted, no extra whitespace.
The signature is Ed25519, base64.

Required fields:

- `keyId`: the installed public-key filename stem.
- `scope`: exactly `optimizer-update`. No other scope permits a weight update.
- `approver`: the human who controls the private key. An agent, a workflow, or a manifest flag is not an approver.
- `tenant`: `iamfather420-ctrl/Full-Build`.
- `documentId`: `loc-english-language-model-corpus`.
- `sourceSha256`: the SHA-256 of the training file, recomputed at the optimizer step and matched to the dataset manifest and the source-text hashes. The value inside the authorization record is not the source of truth.
- `issuedAt` and `expiresAt`: ISO-8601 timestamps. `expiresAt` must be in the future at the moment of that step.

`train.py` and `train_text.py` call this check inside `optimizer.step`, not only before `trainer.train()`.
An authorization that expires or is revoked between steps must stop the next update.

## Revocation

A revocation uses schema `daisy-training-revocation/v1`, signed by a currently trusted key, and is placed in the gate file's `revocations` array.
It names the same `documentId`, `sourceSha256`, and `tenant`, and carries `revokedAt`.
The next optimizer step must fail closed.

## Rotation

1. Generate a new key id offline.
2. Install the new public key.
3. Sign replacement authorizations with the new key.
4. Publish revocations for the old authorizations.
5. Remove the old public key.

Do not leave an old public key installed after it is no longer trusted.

## Recovery

If the private key is lost or exposed, delete its public key from this directory.
That returns the root to fail-closed. There is no break-glass key and no way for this repository to reissue signatures.
A new human ceremony is required. Source approval is a separate decision and is not restored by a new key.

## Current state

No production key is installed. This document is not that key and not an authorization to train.
