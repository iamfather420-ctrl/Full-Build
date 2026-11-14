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
    const modelId = process.env.SOLVEX_OPENAI_MODEL ?? 'gpt-4o-mini';
    const gatewayUrl = process.env.SOLVEX_STAGE14_GATEWAY_URL ?? 'https://full-build.fly.dev/api/stage14/evaluate';
    const signerUrl = process.env.SOLVEX_ORACLE_SIGNER_URL ?? 'https://solvex-oracle-signer-isolated.up.railway.app';
    const oracleIdEnv = process.env.SOLVEX_ORACLE_ID ?? '';
    const publicKeyEnv = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY ?? '';

    let parsedSignerUrl: URL;
    try { parsedSignerUrl = new URL(signerUrl); } catch { throw new Error('Stage 14 requires a valid external signer URL.'); }
    if (parsedSignerUrl.protocol !== 'https:') throw new Error('Stage 14 signer must use HTTPS.');

    const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL ?? '';
    const oidcRequestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? '';
    if (!oidcUrl || !oidcRequestToken) {
      throw new Error('Stage 14 requires GitHub Actions OIDC permission; no long-lived API or signer keys are used in CI.');
    }
    const tokenUrl = new URL(oidcUrl);
    tokenUrl.searchParams.set('audience', 'solvex-stage14-evaluator');
    const oidcResponse = await fetch(tokenUrl, {
      headers: { Authorization: `Bearer ${oidcRequestToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!oidcResponse.ok) throw new Error(`GitHub Actions OIDC token request failed (HTTP ${oidcResponse.status}).`);
    const oidcBody = await oidcResponse.json() as { value?: string };
    if (typeof oidcBody.value !== 'string' || !oidcBody.value) throw new Error('GitHub Actions returned no OIDC identity token.');

    const selftestResponse = await fetch(new URL('/selftest', parsedSignerUrl), {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000),
    });
    if (!selftestResponse.ok) throw new Error(`External signer self-test endpoint failed (HTTP ${selftestResponse.status}).`);
    const selftest = await selftestResponse.json() as { ok?: boolean; oracleId?: string; publicKeyPem?: string };
    const oracleId = oracleIdEnv || selftest.oracleId || '';
    const publicKeyPem = publicKeyEnv || selftest.publicKeyPem || '';
    if (!selftest.ok || !oracleId || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      throw new Error('External signer did not publish a valid Ed25519 identity and public key.');
    }

    const payload = JSON.stringify({ protocol: 'solvex-single-openai-evaluator-v1', input });
    const inputSha256 = createHash('sha256').update(payload).digest('hex');
    const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL ?? '';
    const oidcRequestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN ?? '';
    if (!oidcUrl || !oidcRequestToken) {
      throw new Error('Stage 14 requires GitHub Actions OIDC permission; no long-lived OpenAI key is used in CI.');
    }
    const tokenUrl = new URL(oidcUrl);
    tokenUrl.searchParams.set('audience', 'solvex-stage14-evaluator');
    const oidcResponse = await fetch(tokenUrl, {
      headers: { Authorization: `Bearer ${oidcRequestToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!oidcResponse.ok) throw new Error(`GitHub Actions OIDC token request failed (HTTP ${oidcResponse.status}).`);
    const oidcBody = await oidcResponse.json() as { value?: string };
    if (typeof oidcBody.value !== 'string' || !oidcBody.value) throw new Error('GitHub Actions returned no OIDC identity token.');

    const gatewayController = new AbortController();
    const gatewayTimeout = setTimeout(() => gatewayController.abort(), 55_000);
    let evaluation: OpenAIEvaluation;
    try {
      const response = await fetch(parsedGatewayUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oidcBody.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload, inputSha256, modelId }),
        signal: gatewayController.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 800);
        throw new Error(`Fly Stage 14 evaluator gateway failed (HTTP ${response.status}): ${detail}`);
      }
      const body = await response.json() as any;
      evaluation = parseEvaluation(JSON.stringify(body));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('Fly Stage 14 evaluator gateway timed out after 55 seconds.');
      throw error;
    } finally {
      clearTimeout(gatewayTimeout);
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
          Authorization: `Bearer ${oidcBody.value}`,
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
