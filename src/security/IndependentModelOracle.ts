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
    const oracleId = process.env.SOLVEX_ORACLE_ID ?? '';
    const publicKeyPem = process.env.SOLVEX_ORACLE_ED25519_PUBLIC_KEY ?? '';
    if (!/@sha256:[a-f0-9]{64}$/i.test(image) || !oracleId || !publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      throw new Error('Independent oracle requires a digest-pinned image, oracle identity, and Ed25519 public key.');
    }
    const payload = JSON.stringify({ protocol: 'solvex-independent-oracle-v1', input });
    const result = await IsolatedExecutionSandbox.execute(image, ['/opt/solvex-oracle/verify'], payload, {
      timeoutMs: 30_000, memoryBytes: 512 * 1024 * 1024, cpuCount: 1, pidsLimit: 64
    });
    if (!result.passed) throw new Error('Independent oracle execution failed: ' + (result.error ?? 'unknown error'));
    const attestation = JSON.parse(result.output.trim()) as OracleAttestation;
    const expectedInput = createHash('sha256').update(payload).digest('hex');
    if (!this.verifyAttestation(attestation, oracleId, expectedInput, publicKeyPem)) {
      throw new Error('Independent oracle Ed25519 signature or input binding is invalid.');
    }
    return attestation;
  }
}