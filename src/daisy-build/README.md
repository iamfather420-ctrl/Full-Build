# Daisy model build foundation

This module establishes the controlled integration point between Full Build and
the existing `@daisyhaminja/daisy.weight-engine` component.

## Important separation

- **Weights** encode learned statistical behavior obtained through training.
- **Full Build modules** such as authorization, Z3 proofs, audit, marketplace,
  and workflow engines remain executable software services.
- Selected, approved, redacted examples and verified outcomes from those
  services can be prepared as training corpora. Source code is not blindly
  serialized into model weights.
- The local inference runtime currently expects a model file and executable
  inference engine. A model export must be compatible with that runtime or be
  accompanied by a separately verified runtime adapter.

## Existing Weight Engine operations to bind

The concrete adapter must use the existing engine exports:

- `loadKernel`
- `planBuild`
- `assembleTensors`
- `validateWeights`
- `verifyShard`
- `generateDataset`
- `buildBatchPayload`
- `splitParts`
- `reduceGradients`
- `applySgd`
- `evaluate`

The current Full Build repository does not contain the Weight Engine package
source or its package manifest. Therefore this branch adds the stable port and
orchestration contract first; it does **not** claim that the engine has already
been linked, compiled, or used to produce real Daisy weights.

## Build sequence

1. Inventory Full Build capability modules.
2. Define Daisy's concrete architecture, dimensions, tokenizer, objectives,
   and target export format.
3. Approve and checksum training corpora.
4. Ask Weight Engine for a build plan and resource estimate.
5. Require approval before tensor allocation and training.
6. Initialize tensors, train, checkpoint, and validate.
7. Require separate release approval before export.
8. Verify artifact checksum and compatibility with the first-party inference
   runtime before configuring `DAISY_MODEL_PATH`.

## Required before a real training run

- The complete Weight Engine source and exact function signatures.
- A concrete Daisy architecture specification (not only a capability list).
- Approved training corpora with provenance and checksums.
- A supported training backend and available compute.
- An export adapter compatible with the chosen inference engine.
- End-to-end inference and regression tests using the exported artifact.

No production inference configuration, secrets, deployments, or existing Full
Build runtime behavior are changed by this foundation.
