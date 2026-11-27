import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DaisyActivationGate, DaisyActivationGateRecord } from '../src/brain/DaisyActivationGate';
import { verifyDaisyConsensusCertificate } from '../src/brain/DaisyConsensusCertificateVerifier';
import { NeonDaisyConsensusStore, DaisyConsensusCertificateStore } from '../src/brain/NeonDaisyConsensusStore';
import { canonicalJson } from '../src/brain/IndependentUnanimousConsensus';

export interface ProductionConsensusGateDependencies {
  readRecord: () => DaisyActivationGateRecord | null;
  isActivationActive: () => boolean;
  createStore: (env: NodeJS.ProcessEnv) => Promise<DaisyConsensusCertificateStore>;
}

export type ProductionConsensusGateResult =
  | { status: 'SKIPPED'; reason: 'NON_PRODUCTION_BUILD' }
  | { status: 'VERIFIED'; source_commit_sha: string; certificate_sha256: string };

const defaultDependencies: ProductionConsensusGateDependencies = {
  readRecord: () => DaisyActivationGate.read(),
  isActivationActive: () => DaisyActivationGate.isActive(),
  createStore: env => NeonDaisyConsensusStore.fromEnvironment(env)
};

export async function runProductionConsensusGate(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: ProductionConsensusGateDependencies = defaultDependencies
): Promise<ProductionConsensusGateResult> {
  if (env.VERCEL_ENV !== 'production') {
    return { status: 'SKIPPED', reason: 'NON_PRODUCTION_BUILD' };
  }

  const sourceCommit = env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase();
  if (!sourceCommit || !/^[a-f0-9]{40}$/.test(sourceCommit)) {
    throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:VERCEL_SOURCE_COMMIT_UNAVAILABLE');
  }

  const record = dependencies.readRecord();
  if (!record || record.status !== 'ACTIVE' || !dependencies.isActivationActive()) {
    throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:DAISY_ACTIVATION_GATE_NOT_ACTIVE');
  }
  if (record.source_commit_sha.toLowerCase() !== sourceCommit) {
    throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:ACTIVATION_SOURCE_COMMIT_MISMATCH');
  }

  const certificate = record.consensus_authorization;
  if (!certificate ||
      record.activation_authorization?.consensus_certificate_sha256 !== certificate.certificate_sha256) {
    throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:CONSENSUS_CERTIFICATE_NOT_BOUND_TO_HUMAN_AUTHORIZATION');
  }
  const verification = verifyDaisyConsensusCertificate(record, certificate, env);
  if (!verification.valid) {
    throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:' + verification.reason);
  }

  const store = await dependencies.createStore(env);
  try {
    const persisted = await store.getCertificate(certificate.certificate_sha256);
    if (!persisted || canonicalJson(persisted) !== canonicalJson(certificate)) {
      throw new Error('PRODUCTION_DEPLOYMENT_BLOCKED:CONSENSUS_CERTIFICATE_NOT_PERSISTED_IN_NEON');
    }
  } finally {
    await store.close();
  }

  return {
    status: 'VERIFIED',
    source_commit_sha: sourceCommit,
    certificate_sha256: certificate.certificate_sha256
  };
}

async function main(): Promise<void> {
  const result = await runProductionConsensusGate();
  if (result.status === 'SKIPPED') {
    process.stdout.write('Production consensus gate skipped for non-production build.\n');
    return;
  }
  process.stdout.write('Verified 3-of-3 independent model consensus for source ' +
    result.source_commit_sha + ' with certificate ' + result.certificate_sha256 + '.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write((error instanceof Error ? error.message : 'PRODUCTION_CONSENSUS_GATE_FAILED') + '\n');
    process.exitCode = 1;
  });
}
