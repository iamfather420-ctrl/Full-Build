import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import vm from 'node:vm';

const FORBIDDEN_SOURCE = [
  /child_process/,
  /\brequire\s*\(/,
  /\bprocess\b/,
  /paypal/i,
  /marketplace/i,
  /AuthService/,
  /HumanApprovalGate/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s/,
  /node:/,
];

export function sourceBoundary(source: string): string | null {
  for (const pattern of FORBIDDEN_SOURCE) {
    if (pattern.test(source)) return `BLOCKED: candidate source crosses a security boundary (${pattern}).`;
  }
  return null;
}

export function loadSandbox(source: string, exportName: string): (input: unknown) => unknown {
  const boundary = sourceBoundary(source);
  if (boundary) throw new Error(boundary);
  const sandbox: Record<string, unknown> = { deployed: false };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: `sandbox-${exportName}.js` }).runInContext(sandbox, { timeout: 1000 });
  const fn = sandbox[exportName];
  if (typeof fn !== 'function') throw new Error(`BLOCKED: sandbox did not export ${exportName}.`);
  return (input: unknown) => {
    const value = (fn as (input: unknown) => unknown)(input);
    if (sandbox.deployed !== false) throw new Error('BLOCKED: sandbox candidate mutated deployment state.');
    return value;
  };
}

export function freshBoundSource(): string {
  return `function boundDistance(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { status: 'INVALID', authority: 'none', value: null };
  }
  var dist = input.distance;
  var eps = input.epsilon;
  if (typeof dist !== 'number' || typeof eps !== 'number' || !(eps > 0) || dist < 0) {
    return { status: 'INVALID', authority: 'none', value: null };
  }
  var steps = 0;
  var value = dist;
  while (value >= eps && steps < 64) {
    value = value / 2;
    steps += 1;
  }
  return { status: 'BOUNDED', authority: 'none', value: value, steps: steps };
}
`;
}

export function freshRejectSource(): string {
  return `function rejectUnsigned(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { status: 'INVALID', authority: 'none', accepted: false };
  }
  if (typeof input.signature !== 'string' || input.signature.length === 0) {
    return { status: 'UNSIGNED', authority: 'none', accepted: false };
  }
  return { status: 'SIGNED_STILL_NOT_AUTHORITY', authority: 'none', accepted: false };
}
`;
}

export interface ExternalSignature {
  publicKeyPem: string;
  candidate: { claims: Record<string, string | number>; signature: string };
  integration: { claims: Record<string, string | number>; signature: string };
  private_key_deleted: boolean;
  private_key_outside_repository: boolean;
  private_key_path: string;
}

/** Asks a separate process to sign. The private key never enters this module. */
export function signOutsideDaisy(input: {
  capabilityId: string;
  version: number;
  sha256: string;
  statement: string;
  integrationStatement: string;
}): ExternalSignature {
  const child = spawnSync(process.execPath, [
    '/workspace/scripts/operator-rehearsal-sign.mjs',
    '--capability-id', input.capabilityId,
    '--version', String(input.version),
    '--sha256', input.sha256,
    '--statement', input.statement,
    '--integration-statement', input.integrationStatement,
  ], { encoding: 'utf8', cwd: '/tmp' });
  if (child.status !== 0) throw new Error(child.stderr || 'external signer failed');
  if (child.stdout.includes('PRIVATE KEY')) throw new Error('BLOCKED: signer returned private key material.');
  const artifact = JSON.parse(child.stdout) as ExternalSignature;
  if (!artifact.private_key_deleted || !artifact.private_key_outside_repository || existsSync(artifact.private_key_path)) {
    throw new Error('BLOCKED: operator private key was not destroyed outside the repository.');
  }
  return artifact;
}
