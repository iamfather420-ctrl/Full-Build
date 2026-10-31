import { writeFileSync } from 'node:fs';
import { computeSha256 } from '../database/DatabaseSchema';
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
  const registryId = `cap_${computeSha256(spec.name.toLowerCase()).slice(0, 12)}`;
  const signed = signOutsideDaisy({
    capabilityId: registryId,
    version: 1,
    sha256: computeSha256(spec.source),
    statement: spec.statement,
    integrationStatement: spec.integrationStatement,
  });
  return {
    name: spec.name,
    source: spec.source,
    exportName: spec.exportName,
    statement: spec.statement,
    integrationStatement: spec.integrationStatement,
    publicKeyPem: signed.publicKeyPem,
    candidate: signed.candidate,
    integration: signed.integration,
  };
});

writeFileSync('/workspace/artifacts/lifecycle-raw-bundle.json', JSON.stringify({ schema: 'SOLVEX_LIFECYCLE_RAW_V1', chains }, null, 2));
console.log('wrote /workspace/artifacts/lifecycle-raw-bundle.json');
