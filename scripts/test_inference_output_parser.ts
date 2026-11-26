import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractCompletion } from '../src/inference/LocalInferenceRuntime';

test('extracts completion when llama.cpp suppresses prompt display', () => {
  const output = 'A noun is a word that names a person, place, thing, or idea.\n\n[ Prompt: 12.3 t/s | Generation: 8.1 t/s ]';
  assert.equal(
    extractCompletion(output, 'USER: A noun is a word that'),
    'A noun is a word that names a person, place, thing, or idea.',
  );
});

test('extracts completion when an engine echoes the prompt', () => {
  const prompt = 'USER: Explain a noun.';
  const output = `> ${prompt}\nA noun names a person, place, thing, or idea.\n\n[ Prompt: 12.3 t/s ]`;
  assert.equal(extractCompletion(output, prompt), 'A noun names a person, place, thing, or idea.');
});

test('does not treat timing-only output as a completion', () => {
  assert.equal(extractCompletion('[ Prompt: 12.3 t/s | Generation: 0.0 t/s ]', 'USER: hello'), '');
});
