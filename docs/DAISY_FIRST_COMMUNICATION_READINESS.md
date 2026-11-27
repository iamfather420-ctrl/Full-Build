# Daisy first communication and language readiness

This document records implementation evidence without treating a passing CI job as proof of a running language model.

## Seven workstreams

1. **First communication:** `POST /api/daisy/chat` uses the canonical repository instruction and the first-party local inference router. It returns a real model completion or a blocked response; it has no scripted or third-party AI fallback.
2. **Sentence foundation:** `DaisyConversationProtocol` validates conversation turns and attests the exact returned text with a SHA-256 digest and sentence count. This is transport/output validation, not a grammar or fluency score.
3. **Communication loop:** the endpoint accepts bounded user/assistant history, keeps the canonical system instruction first, and appends the current user prompt. The caller must return prior turns on follow-up requests; server-side durable conversation storage is not implemented by this change.
4. **Learning integration:** the existing LOC grammar training evidence is surfaced by `GET /api/daisy/status`. It records training PASS, dataset digest, and training run identity separately from inference. The learning-bubble eligibility rules remain in force; unverified or unlicensed material is not training-eligible.
5. **Memory:** this endpoint supports bounded conversational context supplied by the caller. It does not claim durable cross-session memory. A durable, tenant-isolated conversation store with retention/deletion controls remains a separate required integration.
6. **Testing:** protocol tests cover system-instruction precedence, malformed history, exact reply hashing, sentence counting, and rejection of invalid completions. The API test continues to require a truthful 503 when model assets are absent.
7. **Verification:** status reports the real model checksum/load state and the LOC training record independently. A first successful chat is the evidence that changes runtime state to READY; CI success alone does not.

## Known evidence and blockers

- LOC grammar training record: PASS, CPU, 3 epochs; evaluation loss 3.457529067993164; dataset SHA-256 `79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7`.
- The training record explicitly says `inference_status: NOT_RUN`, `model_loaded: false`, and `activation_authorized: false`.
- A quantized Daisy GGUF identity is pinned in `src/inference/verifiedDaisyModel.ts`; runtime requires the exact 105,454,176-byte file and SHA-256 plus an executable local inference engine.
- No successful first communication is claimed by this change. The deployment must have the verified GGUF and local engine configured, then run a real authenticated chat request.
- The recorded LOC foundation model is SmolLM2-135M-Instruct. It is not evidence that Daisy has independently acquired human-like understanding or that every sentence is correct.
- The current small MLP reference training scenario is not the conversational language-model training pipeline and must not be reported as such.

## First communication acceptance procedure

1. Configure `DAISY_MODEL_PATH` to the exact verified GGUF and `DAISY_INFERENCE_ENGINE` to the approved local executable.
2. Confirm `GET /api/daisy/status` reports `LOADABLE_NOT_YET_INFERRED`, the expected model digest matches the observed digest, and the foundational instruction is available.
3. The Daisy Render image-validation workflow starts the built image, downloads and verifies the pinned GGUF, and executes `bun scripts/verify_daisy_conversation.ts` inside the container. This performs four real first-party local generation scenarios (greeting, contextual follow-up, grammar correction, and software-development explanation) and emits reply previews plus digest evidence. It fails closed if model assets or the local engine are unavailable.
4. Submit an authenticated `POST /api/daisy/chat` request with a simple greeting and empty history.
5. Require HTTP 200, `success: true`, `runtime.source: first_party_local`, non-empty `text`, and `replyEvidence.sha256` matching the exact returned text.
6. Submit a follow-up request with the first user/assistant turn in history. Verify that the answer uses that context.
7. Preserve request/response evidence with secrets and personal content excluded. Do not activate production authority based solely on conversational output.

If any model, engine, instruction, identity, or inference check fails, the result remains BLOCKED and no synthetic response is substituted.
