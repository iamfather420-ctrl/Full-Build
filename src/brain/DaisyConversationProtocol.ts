import { createHash } from 'node:crypto';
import type { InferenceMessage } from '../inference/InferenceRuntime';

export const DAISY_CONVERSATION_PROTOCOL = 'daisy-conversation/v1';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ReplyEvidence {
  protocol: typeof DAISY_CONVERSATION_PROTOCOL;
  sha256: string;
  characterCount: number;
  sentenceCount: number;
}

/**
 * Builds a single-turn inference request from the canonical instruction and
 * caller-supplied conversation history. History is context, never authority:
 * the system instruction is always first and cannot be overridden by callers.
 */
export function buildConversationMessages(
  instruction: string,
  history: readonly ConversationTurn[],
  prompt: string,
): InferenceMessage[] {
  if (!instruction.trim()) throw new Error('CANONICAL_INSTRUCTION_REQUIRED');
  if (!prompt.trim()) throw new Error('USER_PROMPT_REQUIRED');
  if (history.length > 20) throw new Error('CONVERSATION_HISTORY_LIMIT_EXCEEDED');

  const messages: InferenceMessage[] = [{ role: 'system', content: instruction }];
  for (const turn of history) {
    if (!turn || !['user', 'assistant'].includes(turn.role) ||
        typeof turn.content !== 'string' || !turn.content.trim() ||
        turn.content.length > 8_000) {
      throw new Error('INVALID_CONVERSATION_TURN');
    }
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

/**
 * Attests only the bytes returned by local inference. It does not claim that
 * grammar, factuality, reasoning, or model identity have been independently
 * verified. Those require separate evaluation evidence.
 */
export function attestGeneratedReply(value: unknown): { text: string; evidence: ReplyEvidence } {
  if (typeof value !== 'string') throw new Error('MODEL_REPLY_NOT_TEXT');
  const text = value.trim();
  if (!text || text.length > 32_000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    throw new Error('MODEL_REPLY_INVALID');
  }
  const sentenceCount = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
  return {
    text,
    evidence: {
      protocol: DAISY_CONVERSATION_PROTOCOL,
      sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
      characterCount: text.length,
      sentenceCount,
    },
  };
}
