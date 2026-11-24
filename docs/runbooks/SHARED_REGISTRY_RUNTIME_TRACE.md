# Shared registry runtime trace

The end-to-end trace is intentionally manual and runs only on an operator-managed Linux self-hosted GitHub Actions runner. It is not part of ordinary pull-request CI because it calls the configured Discover-Engine service and requires a real local first-party model runtime.

## Configure repository settings

In **Settings → Secrets and variables → Actions**, configure:

Repository secrets:
- `DISCOVER_ENGINE_URL`: HTTPS base URL for the authorized Discover-Engine service.
- `DISCOVER_ENGINE_TOKEN`: service token. Never put this value in a workflow input, repository variable, commit, or log.

Repository variables:
- `DAISY_MODEL_PATH`: absolute path to a verified, readable model file installed on the self-hosted runner.
- `DAISY_INFERENCE_ENGINE`: absolute path to the compatible executable local inference engine installed on that runner.
- `DAISY_MODEL_ID` and `DAISY_MODEL_VERSION`: optional model identity metadata.

The runner must have the default `self-hosted` and `linux` labels, Bun available through the setup action, network access to the shared registry and authorized Discover-Engine endpoint, and the model/engine assets installed locally. The workflow checks that the model is a readable file and the engine is executable; those checks do not prove compatibility. The trace itself must complete a real inference and receive a confirmed withheld/non-publishable Discover-Engine review.

## Run

Open **Actions → Shared Registry Runtime Trace → Run workflow** on the intended PR branch. Optionally supply an expected correlation ID. Leave it blank to validate the correlation ID read from the current shared registry entry.

The job exits non-zero unless registry read-back, live index proof, Discover-Engine withheld review, and first-party local inference all pass. It uploads the trace log as a short-retention artifact even when execution fails.

## Safety boundary

This is an integration evidence workflow only. It does not run the 120-case formal corpus, authorize production, activate Daisy, enable payments, or deploy the application. Missing credentials or local assets are a hard block; do not replace them with mocks, sample outputs, or historical evidence.
