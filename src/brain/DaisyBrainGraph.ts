import { createHash } from 'node:crypto';
import { NodeRegistry } from '../nodes/NodeRegistry';

export interface SynapseDefinition {
  synapse_id: string;
  from_node_id: string;
  to_node_id: string;
  relation: string;
  weight: number;
  enabled: boolean;
  source_ref: string;
}

export interface SynapseManifest {
  schema_version: '1.0.0';
  topology_id: string;
  expected_node_count: 54;
  expected_synapse_count: 120;
  source_ref: string;
  source_sha256: string;
  synapses: SynapseDefinition[];
}

export interface BrainGraphValidation {
  valid: boolean;
  node_count: number;
  synapse_count: number;
  manifest_sha256: string | null;
  errors: string[];
}

/**
 * Validates and holds a source-backed brain topology. It deliberately does not
 * generate edges: the canonical 120-edge manifest must be supplied by its owner.
 */
export class DaisyBrainGraph {
  static validate(manifest: SynapseManifest): BrainGraphValidation {
    const errors: string[] = [];
    const nodes = NodeRegistry.getInstance().getAllNodes();
    const known = new Set(nodes.map((node) => node.node_id));
    if (manifest?.schema_version !== '1.0.0') errors.push('Unsupported synapse manifest schema.');
    if (manifest?.expected_node_count !== 54) errors.push('Manifest must declare 54 canonical nodes.');
    if (manifest?.expected_synapse_count !== 120) errors.push('Manifest must declare 120 canonical synapses.');
    if (!manifest?.topology_id?.trim()) errors.push('Missing topology_id.');
    if (!manifest?.source_ref?.trim()) errors.push('Missing authoritative source_ref.');
    if (!/^[a-f0-9]{64}$/i.test(manifest?.source_sha256 ?? '')) errors.push('source_sha256 must be a SHA-256 digest.');
    if (!Array.isArray(manifest?.synapses) || manifest.synapses.length !== 120) {
      errors.push('Exactly 120 source-backed synapse definitions are required.');
    }

    const ids = new Set<string>();
    for (const edge of manifest?.synapses ?? []) {
      if (!edge.synapse_id?.trim() || ids.has(edge.synapse_id)) errors.push(`Missing or duplicate synapse id: ${edge.synapse_id || '(empty)'}`);
      ids.add(edge.synapse_id);
      if (!known.has(edge.from_node_id)) errors.push(`Unknown source node ${edge.from_node_id} for ${edge.synapse_id}.`);
      if (!known.has(edge.to_node_id)) errors.push(`Unknown target node ${edge.to_node_id} for ${edge.synapse_id}.`);
      if (edge.from_node_id === edge.to_node_id) errors.push(`Self-edge is not accepted for ${edge.synapse_id}.`);
      if (!edge.relation?.trim()) errors.push(`Missing relation for ${edge.synapse_id}.`);
      if (!Number.isFinite(edge.weight) || edge.weight < 0 || edge.weight > 1) errors.push(`Invalid weight for ${edge.synapse_id}.`);
      if (typeof edge.enabled !== 'boolean') errors.push(`Invalid enabled flag for ${edge.synapse_id}.`);
      if (!edge.source_ref?.trim()) errors.push(`Missing edge source reference for ${edge.synapse_id}.`);
    }

    const manifestSha256 = manifest ? createHash('sha256').update(JSON.stringify(manifest)).digest('hex') : null;
    return { valid: errors.length === 0, node_count: nodes.length, synapse_count: manifest?.synapses?.length ?? 0, manifest_sha256: manifestSha256, errors };
  }

  constructor(readonly manifest: SynapseManifest) {
    const result = DaisyBrainGraph.validate(manifest);
    if (!result.valid) throw new Error(`DAISY_BRAIN_GRAPH_REJECTED: ${result.errors.join(' | ')}`);
  }

  neighbors(nodeId: string): SynapseDefinition[] {
    return this.manifest.synapses.filter((edge) => edge.enabled && (edge.from_node_id === nodeId || edge.to_node_id === nodeId));
  }
}
