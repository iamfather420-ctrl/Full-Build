import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { attestGeneratedReply, buildConversationMessages } from './DaisyConversationProtocol';

test('conversation always begins with the canonical system instruction', () => {
  const messages = buildConversationMessages('Canonical Daisy instruction', [
    { role: 'user', content: 'Earlier question.' },
    { role: 'assistant', content: 'Earlier answer.' },
  ], 'Continue our conversation.');
  assert.deepEqual(messages.map((message) => message.role), ['system', 'user', 'assistant', 'user']);
  assert.equal(messages[0].content, 'Canonical Daisy instruction');
  assert.equal(messages.at(-1)?.content, 'Continue our conversation.');
});

test('conversation rejects empty instructions, empty turns, and oversized history', () => {
  assert.throws(() => buildConversationMessages(' ', [], 'Hello'), /CANONICAL_INSTRUCTION_REQUIRED/);
  assert.throws(() => buildConversationMessages('system', [], ' '), /USER_PROMPT_REQUIRED/);
  assert.throws(() => buildConversationMessages('system', Array.from({ length: 21 }, () => ({ role: 'user' as const, content: 'x' })), 'Hello'), /CONVERSATION_HISTORY_LIMIT_EXCEEDED/);
  assert.throws(() => buildConversationMessages('system', [{ role: 'assistant', content: ' ' }], 'Hello'), /INVALID_CONVERSATION_TURN/);
});

test('reply evidence hashes the exact trimmed local completion and counts sentences', () => {
  const result = attestGeneratedReply('  Hello there. I am Daisy!  ');
  assert.equal(result.text, 'Hello there. I am Daisy!');
  assert.equal(result.evidence.sentenceCount, 2);
  assert.equal(result.evidence.sha256, createHash('sha256').update(result.text).digest('hex'));
});

test('reply attestation rejects empty, non-text, control-character, and oversized completions', () => {
  assert.throws(() => attestGeneratedReply(null), /MODEL_REPLY_NOT_TEXT/);
  assert.throws(() => attestGeneratedReply('  '), /MODEL_REPLY_INVALID/);
  assert.throws(() => attestGeneratedReply('bad\u0001text'), /MODEL_REPLY_INVALID/);
  assert.throws(() => attestGeneratedReply('x'.repeat(32_001)), /MODEL_REPLY_INVALID/);
});
