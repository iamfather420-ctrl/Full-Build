/**
 * Historical SmolLM2 workflow record. training_status PASS is the workflow
 * conclusion, not source approval and not proprietary Daisy completion.
 */
export const DAISY_LOC_GRAMMAR_EVIDENCE = {
  schema: 'daisy-loc-grammar-training-evidence/v1',
  repository: 'iamfather420-ctrl/Full-Build',
  source_commit: '133cd82c23563e7b13ab636ef12d117db05ccf16',
  workflow_run_id: '45661493760',
  workflow_url: 'https://github.com/iamfather420-ctrl/Full-Build/actions/runs/45661493760',
  artifact_name: 'daisy-loc-grammar-cpu-checkpoint',
  artifact_bytes: 4965451169,
  training_status: 'PASS',
  source_approval: 'NOT_APPROVED',
  corpus_use: 'NOT_FOR_TRAINING',
  proprietary_from_scratch_daisy: false,
  device: 'CPU',
  epochs: 3,
  train_loss: 2.674985606260974,
  train_runtime_seconds: 7914.7609,
  eval_loss: 3.457529067993164,
  dataset_sha256: '79a9c60a64357713b98c90f1bffc82066f0b48cb3cc2b9e155cdd6229845a6f7',
  foundation_model: 'HuggingFaceTB/SmolLM2-135M-Instruct',
  foundation_revision: 'eba0825ddc7730d24a88685a6c0a078cf919b383',
  inference_status: 'NOT_RUN',
  model_loaded: false,
  activation_authorized: false,
  payments_enabled: false,
} as const;
