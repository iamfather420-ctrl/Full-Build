import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAISY_LOC_GRAMMAR_EVIDENCE } from '../inference/daisyLocGrammarEvidence';

test('completed LOC training is not reported as loaded inference', () => {
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.training_status, 'PASS');
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.inference_status, 'NOT_RUN');
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.model_loaded, false);
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.activation_authorized, false);
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.payments_enabled, false);
  assert.equal(DAISY_LOC_GRAMMAR_EVIDENCE.dataset_sha256.length, 64);
});
