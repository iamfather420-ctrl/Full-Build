import { createHash, createPublicKey, verify } from 'node:crypto';

export interface OracleAttestation {
  oracleId: string;
  modelId: string;
  inputSha256: string;
  verdict: 'ACCEPT' | 'REJECT';
  rationaleSha256: string;
  signature: string;
}

interface OpenAIEvaluation {
  verdict: 'ACCEPT' | 'REJECT';
  rationale: string;
}

function extractOutputText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text;
  const chunks: string[] = [];
  for (const item of response?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n');
}

function parseEvaluation(raw: string): OpenAIEvaluation {
  const parsed = JSON.parse(raw);
  if (!parsed || !['ACCEPT', 'REJECT'].includes(parsed.verdict) ||
      typeof parsed.rationale !== 'string' || parsed.rationale.trim().length === 0 ||
      parsed.rationale.length > 4000) {
    throw new Error('OpenAI evaluator returned an invalid verdict or rationale.');
  }
  return { verdict: parsed.verdict, rationale: parsed.rationale.trim() };
}

export class IndependentModelOracle {
  static verifyAttestation(attestation: OracleAttestation, expectedOracleId: string, expectedInputSha: string, publicKeyPem: string): boolean {
    try {
      const canonical = [
        attestation.oracleId,
        attestation.modelId,
        attestation.inputSha256,
        attestation.verdict,
        attestation.rationaleSha256
      ].join('\n');
      const signature = Buffer.from(attestation.signature, 'base64');
      return attestation.oracleId === expectedOracleId && Boolean(attestation.modelId) &&
        attestation.inputSha256 === expectedInputSha && ['ACCEPT', 'REJECT'].includes(attestation.verdict) &&
        /^[a-f0-9]{64}$/.test(attestation.rationaleSha256) &&
        signature.length === 64 &&
        verify(null, Buffer.from(canonical), createPublicKey(publicKeyPem), signature);
    } catch { return false; }
  }

  static async verify(input: unknown): Promise<OracleAttestation> {
    const apiKey = process.env.OPENAI_API_KEY ?? '';
    const modelId = process.env.SOLVEX_OPENAI_MODEL ?? 'gpt-4o-mini';
    const signerUrl = process.env.SOLVEX_ORACLE_SIGNER_URL ?? '';
    const signerToken = process.env.SOLVEX_ORACLE_SIGNER_TOKEN ?? '';
    const oracleId = process.env.SOLVEX_ORACLE_ID ?? '';
    const publicKeyPem = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY ?? '';

    if (!apiKey) throw new Error('Stage 14 requires the configured OPENAI_API_KEY runtime secret.');
    let parsedSignerUrl: URL;
    try { parsedSignerUrl = new URL(signerUrl); } catch { throw new Error('Stage 14 requires a valid external signer URL.'); }
    if (parsedSignerUrl.protocol !== 'https:' || !signerToken || !oracleId || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      throw new Error('Stage 14 requires an HTTPS external signer, signer authentication token, oracle identity, and Ed25519 public key.');
    }

    const payload = JSON.stringify({ protocol: 'solvex-single-openai-evaluator-v1', input });
    const inputSha256 = createHash('sha256').update(payload).digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let evaluation: OpenAIEvaluation;
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          input: [
            {
              role: 'system',
              content: [{
                type: 'input_text',
                text: 'You are the single-model SolveX Stage 14 evidence evaluator. Review only the supplied evidence. Return ACCEPT only when the evidence is internally consistent, bound to the submitted input hash, and supports the stated verification claims. Do not infer missing tests, proofs, runtime facts, or external attestations. Otherwise return REJECT. Provide concise, specific rationale.'
              }]
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: payload }]
            }
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'solvex_stage14_verdict',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  verdict: { type: 'string', enum: ['ACCEPT', 'REJECT'] },
                  rationale: { type: 'string' }
                },
                required: ['verdict', 'rationale'],
                additionalProperties: false
              }
            }
          }
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 1200);
        throw new Error(`OpenAI evaluator request failed (HTTP ${response.status}): ${detail}`);
      }
      const body = await response.json();
      const output = extractOutputText(body);
      if (!output) throw new Error('OpenAI evaluator returned no structured output.');
      evaluation = parseEvaluation(output);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI evaluator request timed out after 45 seconds.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const rationaleSha256 = createHash('sha256').update(evaluation.rationale).digest('hex');
    const signerPayload = JSON.stringify({
      protocol: 'solvex-openai-attestation-v1',
      oracleId,
      modelId,
      inputSha256,
      verdict: evaluation.verdict,
      rationaleSha256
    });
    const signerController = new AbortController();
    const signerTimeout = setTimeout(() => signerController.abort(), 15_000);
    let attestation: OracleAttestation;
    try {
      const signerResponse = await fetch(new URL('/attest', parsedSignerUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${signerToken}`,
          'Content-Type': 'application/json'
        },
        body: signerPayload,
        signal: signerController.signal
      });
      if (!signerResponse.ok) {
        const detail = (await signerResponse.text()).slice(0, 1000);
        throw new Error(`External attestation signer failed (HTTP ${signerResponse.status}): ${detail}`);
      }
      attestation = await signerResponse.json() as OracleAttestation;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('External attestation signer timed out after 15 seconds.');
      throw error;
    } finally {
      clearTimeout(signerTimeout);
    }
    if (!this.verifyAttestation(attestation, oracleId, inputSha256, publicKeyPem) ||
        attestation.modelId !== modelId || attestation.verdict !== evaluation.verdict ||
        attestation.rationaleSha256 !== rationaleSha256) {
      throw new Error('External Ed25519 attestation signature, model identity, verdict, rationale, or input binding is invalid.');
    }
    return attestation;
  }
}
