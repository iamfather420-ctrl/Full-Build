# Daisy canonical source-to-model learning pipeline

This pipeline makes the repository boundary explicit:

- Source of truth: `Solvex-Paradox-Box/loc-english-grammar-source-collection`.
- Consumer and orchestration: `iamfather420-ctrl/Full-Build`.
- The source repository is checked out into Full-Build's workflow workspace at an immutable commit; it is not copied into a fake local fixture.
- The workflow verifies source provenance and writes an eight-stage evidence manifest.

## Eight stages

1. Sync the canonical repository into the Full-Build workflow workspace.
2. Validate source identity, source manifests, file hashes, and the source validator.
3. Enforce source-specific rights and explicit training eligibility.
4. Construct a corpus only from sources explicitly approved for model training.
5. Validate tokenizer, dataset shape, and train/validation separation.
6. Train Daisy model weights using a first-party training backend and verified compute.
7. Evaluate on held-out data; bind metrics and checkpoint hash to the run.
8. Package the evaluated checkpoint and verify compatibility with Daisy's local inference runtime.

## Current hard blockers

The canonical inventory currently marks acquired sources as `not_evaluated` and `training_pipeline_enabled: false`. The preserved Library of Congress collection is marked `PENDING_REVIEW` and `training_eligible: false`. Therefore stages 3–8 remain blocked. This workflow does not change those decisions.

The existing Full-Build weight engine is a CPU MLP reference trainer, not a transformer language-model trainer. The existing Render workspace has a Daisy staging web service and a Discover Engine service, but no GPU training worker was found in the service inventory. No new paid infrastructure is created.

A successful preflight artifact proves only source synchronization and provenance validation. It does not mean Daisy trained or created new model weights.
