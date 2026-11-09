import { createHmac, timingSafeEqual } from 'node:crypto';
import { IsolatedExecutionSandbox } from './IsolatedExecutionSandbox';

export interface OracleAttestation { oracleId: string; modelId: string; inputSha256: string; verdict: 'ACCEPT' | 'REJECT'; rationaleSha256: string; signature: string; }
export class IndependentModelOracle {
  static async verify(input: unknown): Promise<OracleAttestation> {
    const image = process.env.SOLVEX_ORACLE_IMAGE ?? '';
    const key = process.env.SOLVEX_ORACLE_HMAC_KEY ?? '';
    const oracleId = process.env.SOLVEX_ORACLE_ID ?? '';
    if (!/@sha256:[a-f0-9]{64}$/i.test(image) || !oracleId || Buffer.byteLength(key) < 32) throw new Error('Independent oracle is not configured with a digest-pinned image, identity, and attestation key.');
    const payload = JSON.stringify({ protocol: 'solvex-independent-oracle-v1', input });
    const result = await IsolatedExecutionSandbox.execute(image, ['/opt/solvex-oracle/verify'], payload, { timeoutMs: 30_000, memoryBytes: 512 * 1024 * 1024, cpuCount: 1, pidsLimit: 64 });
    if (!result.passed) throw new Error('Independent oracle execution failed: ' + (result.error ?? 'unknown error'));
    const attestation = JSON.parse(result.output.trim()) as OracleAttestation;
    const canonical = [attestation.oracleId, attestation.modelId, attestation.inputSha256, attestation.verdict, attestation.rationaleSha256].join('\n');
    const expected = createHmac('sha256', key).update(canonical).digest();
    const supplied = Buffer.from(attestation.signature ?? '', 'hex');
    const inputSha = (await import('node:crypto')).createHash('sha256').update(payload).digest('hex');
    if (attestation.oracleId !== oracleId || !attestation.modelId || attestation.inputSha256 !== inputSha ||
      !['ACCEPT', 'REJECT'].includes(attestation.verdict) || !/^[a-f0-9]{64}$/.test(attestation.rationaleSha256) ||
      supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) throw new Error('Independent oracle attestation signature or binding is invalid.');
    return attestation;
  }
}