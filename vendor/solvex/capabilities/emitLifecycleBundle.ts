import { writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
import { HumanApprovalGate } from '../governance/HumanApprovalGate';
import { SandboxRehearsal } from '../governance/sandboxIntegrationRehearsal';
import { CapabilityRegistry } from './CapabilityRegistry';
import { freshBoundSource, freshRejectSource, signOutsideDaisy } from './independentLifecycle';

const specs = [
  {
    name: 'bound-distance',
    source: freshBoundSource(),
    exportName: 'boundDistance',
    statement: 'I sign bound-distance version 1 at this exact hash for a sandbox rehearsal only.',
    integrationStatement: 'I separately authorize the sandbox rehearsal for bound-distance and not production.',
  },
  {
    name: 'reject-unsigned',
    source: freshRejectSource(),
    exportName: 'rejectUnsigned',
    statement: 'I sign reject-unsigned version 1 at this exact hash for a sandbox rehearsal only.',
    integrationStatement: 'I separately authorize the sandbox rehearsal for reject-unsigned and not production.',
  },
];

const chains = specs.map((spec) => {
  const sourceHash = computeSha256(spec.source);
  const registryId = `cap_${computeSha256(spec.name.toLowerCase()).slice(0, 12)}`;
  const signed = signOutsideDaisy({
    capabilityId: registryId,
    version: 1,
    sha256: sourceHash,
    statement: spec.statement,
    integrationStatement: spec.integrationStatement,
  });
  const now = Number(signed.candidate.claims.issued_at);
  if (!Number.isFinite(now)) throw new Error('BLOCKED: signer did not provide an issuance time.');

  // Capture the actual registry and sandbox outputs. The verifier consumes these
  // bytes and observations; it must not manufacture a replacement rehearsal.
  const registry = new CapabilityRegistry(new HumanApprovalGate());
  const proposed = registry.propose(spec.name, 'raw lifecycle evidence');
  const marked = registry.markVerified(proposed.id, sourceHash);
  const productionAttempt = registry.deploy(proposed.id, null, now);

  const slot = new SandboxRehearsal(signed.publicKeyPem);
  const integration = slot.deploy({
    source: spec.source,
    candidate: signed.candidate,
    integration: signed.integration,
    now,
  });
  const artifactAfterIntegration = slot.artifact();
  slot.corrupt();
  const artifactAfterFailure = slot.artifact();
  const recovered = slot.rollback();
  const artifactAfterRecovery = slot.artifact();
  const replay = slot.deploy({
    source: spec.source,
    candidate: signed.candidate,
    integration: signed.integration,
    now,
  });

  const execution = {
    observed_at: now,
    registry: {
      id: proposed.id,
      version: proposed.version,
      status_after_verification: registry.get(proposed.id)?.status ?? null,
      evidence_sha256: registry.get(proposed.id)?.evidence_sha256 ?? null,
      executable: registry.get(proposed.id)?.executable ?? null,
      production_deploy_attempted: true,
      production_deploy_succeeded: 'deployed' in productionAttempt && productionAttempt.deployed,
      production_deploy_reason: productionAttempt.reason,
    },
    sandbox: {
      integration: { accepted: integration.ok, reported_hash: integration.hash },
      artifact_after_integration: artifactAfterIntegration,
      failure: { artifact: artifactAfterFailure },
      recovery: { restored: recovered, artifact: artifactAfterRecovery },
      replay: { accepted: replay.ok, reason: replay.reason, artifact_after_attempt: slot.artifact() },
      production_switch_samples: [...slot.switchSamples],
    },
  };

  return {
    name: spec.name,
    source: spec.source,
    exportName: spec.exportName,
    statement: spec.statement,
    integrationStatement: spec.integrationStatement,
    publicKeyPem: signed.publicKeyPem,
    candidate: signed.candidate,
    integration: signed.integration,
    execution,
  };
});

const left = chains[0];
const right = chains[1];
const crossSlot = new SandboxRehearsal(right.publicKeyPem);
const crossSourceAttempt = crossSlot.deploy({
  source: left.source,
  candidate: right.candidate,
  integration: right.integration,
  now: Number(right.candidate.claims.issued_at),
});
const crossChain = {
  source_sha256: computeSha256(left.source),
  target_source_sha256: computeSha256(right.source),
  accepted: crossSourceAttempt.ok,
  reason: crossSourceAttempt.reason,
  artifact_after_attempt: crossSlot.artifact(),
};

writeFileSync('/workspace/artifacts/lifecycle-raw-bundle.json', JSON.stringify({
  schema: 'SOLVEX_LIFECYCLE_RAW_V2',
  chains,
  cross_chain: crossChain,
}, null, 2));
console.log('wrote /workspace/artifacts/lifecycle-raw-bundle.json');
