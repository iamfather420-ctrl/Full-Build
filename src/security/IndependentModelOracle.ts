import { createHash, createPublicKey, verify } from 'node:crypto';
import { IsolatedExecutionSandbox } from './IsolatedExecutionSandbox';

export interface OracleAttestation { oracleId: string; modelId: string; inputSha256: string; verdict: 'ACCEPT' | 'REJECT'; rationaleSha256: string; signature: string; }
export class IndependentModelOracle {
  static verifyAttestation(attestation: OracleAttestation, expectedOracleId: string, expectedInputSha: string, publicKeyPem: string): boolean {
    try {
      const canonical = [attestation.oracleId, attestation.modelId, attestation.inputSha256, attestation.verdict, attestation.rationaleSha256].join('\n');
      const signature = Buffer.from(attestation.signature, 'base64');
      return attestation.oracleId === expectedOracleId && Boolean(attestation.modelId) &&
        attestation.inputSha256 === expectedInputSha && ['ACCEPT', 'REJECT'].includes(attestation.verdict) &&
        /^[a-f0-9]{64}$/.test(attestation.rationaleSha256) &&
        verify(null, Buffer.from(canonical), createPublicKey(publicKeyPem), signature);
    } catch { return false; }
  }
  static async verify(input: unknown): Promise<OracleAttestation> {
    const image = process.env.SOLVEX_ORACLE_IMAGE ?? '';
    const oracleUrl = process.env.SOLVEX_ORACLE_URL ?? '';
    const sharedSecret = process.env.SOLVEX_ORACLE_SHARED_SECRET ?? '';
    const oracleId = process.env.SOLVEX_ORACLE_ID ?? '';
    const publicKeyPem = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY ?? '';
    if (!oracleId || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      throw new Error('Independent oracle identity and Ed25519 public key are required.');
    }
    const payload = JSON.stringify({ protocol: 'solvex-independent-oracle-v1', input });
    const expectedInput = createHash('sha256').update(payload).digest('hex');
    let attestation: OracleAttestation;

    if (oracleUrl && sharedSecret) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(oracleUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'authorization': 'Bearer ' + sharedSecret,
            'x-solvex-oracle-secret': sharedSecret
          },
          body: payload,
          signal: controller.signal,
          redirect: 'error'
        });
        if (!response.ok) throw new Error('Independent oracle endpoint returned HTTP ' + response.status + '.');
        const result = await response.json() as any;
        const raw = result?.attestation ?? result?.data?.attestation ?? result?.data ?? result;
        attestation = {
          oracleId: raw?.oracleId ?? raw?.oracle_id,
          modelId: raw?.modelId ?? raw?.model_id,
          inputSha256: raw?.inputSha256 ?? raw?.input_sha256,
          verdict: raw?.verdict,
          rationaleSha256: raw?.rationaleSha256 ?? raw?.rationale_sha256,
          signature: raw?.signature
        } as OracleAttestation;
      } finally {
        clearTimeout(timer);
      }
    } else {
      if (!/@sha256:[a-f0-9]{64}$/i.test(image)) {
        throw new Error('Independent oracle requires a remote endpoint with shared secret or a digest-pinned image.');
      }
      const result = await IsolatedExecutionSandbox.execute(image, ['/opt/solvex-oracle/verify'], payload, {
        timeoutMs: 30_000, memoryBytes: 512 * 1024 * 1024, cpuCount: 1, pidsLimit: 64
      });
      if (!result.passed) throw new Error('Independent oracle execution failed: ' + (result.error ?? 'unknown error'));
      attestation = JSON.parse(result.output.trim()) as OracleAttestation;
    }

    if (!this.verifyAttestation(attestation, oracleId, expectedInput, publicKeyPem)) {
      throw new Error('Independent oracle Ed25519 signature or input binding is invalid.');
    }
    return attestation;
  }
}