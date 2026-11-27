import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { attestGeneratedReply, buildConversationMessages } from '../src/brain/DaisyConversationProtocol';
import { getLocalInferenceRuntime } from '../src/inference/LocalInferenceRuntime';

async function main() {
  const instructionPath = path.resolve(process.cwd(), 'DAISY_FOUNDATIONAL_SYSTEM_INSTRUCTION.md');
  const instruction = (await readFile(instructionPath, 'utf8')).trim();
  const runtime = getLocalInferenceRuntime();
  await runtime.probe();
  if (!runtime.canAttempt()) {
    throw new Error(`BLOCKED: verified first-party model weights or local inference engine are unavailable. Runtime: ${JSON.stringify(runtime.publicStatus())}`);
  }

  const evidence: Array<Record<string, unknown>> = [];
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const prompts = [
    'Hello, Daisy. This is your first communication check. Please introduce yourself in one or two sentences.',
    'What did I just ask you to do? Answer using the context from our previous turn.',
    'Correct this sentence and briefly explain the correction: "She go to the store yesterday."',
    'Explain, in clear steps, how you would investigate a TypeScript build failure without claiming to have changed files.',
  ];

  for (let index = 0; index < prompts.length; index += 1) {
    const prompt = prompts[index];
    const messages = buildConversationMessages(instruction, history, prompt);
    const result = await runtime.generate({ messages, timeoutMs: 60_000, maxOutputTokens: 512, temperature: 0 });
    if (result.status !== 'OK') {
      const diagnostic = {
        status: result.status,
        code: result.code ?? null,
        error: (result.error ?? 'No diagnostic supplied').slice(0, 1_200),
        runtime: runtime.publicStatus(),
      };
      throw new Error(`BLOCKED at conversation scenario ${index + 1}: ${JSON.stringify(diagnostic)}. No substitute response was generated.`);
    }
    const reply = attestGeneratedReply(result.text);
    evidence.push({
      scenario: index + 1,
      promptSha256: createHash('sha256').update(prompt).digest('hex'),
      reply: reply.evidence,
      replyPreview: reply.text.slice(0, 1_000),
      runtimeId: result.runtimeId,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      durationMs: result.durationMs,
    });
    history.push({ role: 'user', content: prompt }, { role: 'assistant', content: reply.text });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  process.stdout.write(JSON.stringify({
    status: 'PASS',
    claim_scope: 'LOCAL_INFERENCE_SMOKE_TEST_ONLY',
    model: runtime.publicStatus(),
    scenarios: evidence,
    note: 'This proves non-empty local generations for these prompts only; it does not prove factual accuracy, general language competence, production activation, or durable memory.',
  }, null, 2) + '\n');
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : 'Daisy conversation smoke test failed.') + '\n');
  process.exitCode = 1;
});
