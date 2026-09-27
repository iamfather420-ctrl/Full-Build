/**
 * Exact 32-record bootstrap registry imported from Solvexb2b/Proofs.
 * Source of truth for DH-P-001..DH-P-032.
 *
 * This file is intentionally separate from the pre-existing Full-Build
 * ParadoxRegistry.ts because that registry contains a different 32-record
 * catalog. No source record is rewritten or silently replaced here.
 */

export interface DHBootstrapParadoxEntity {
  code: string;
  name: string;
  domain: string;
  mechanism: string;
  claim: string;
  verification_status: 'VERIFIED' | 'FAMILY_VARIANT' | 'CLAIM_ONLY' | 'PARTIAL';
  canonical_family: string;
  is_duplicate_of?: string;
  source_references: string[];
  created_at: number;
}

export const DH_BOOTSTRAP_PARADOXES: DHBootstrapParadoxEntity[] = [
  {
    code: 'DH-P-001',
    name: 'Achilles and the Tortoise',
    domain: 'MATHEMATICAL_ANALYSIS',
    mechanism: 'Infinite geometric series in continuous metric space',
    claim: 'Achilles never overtakes tortoise under infinite division assumption',
    verification_status: 'VERIFIED',
    canonical_family: 'ZENO_MOTION',
    source_references: ['Aristotle Physics VI:9'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-002',
    name: 'Russell Set Paradox',
    domain: 'SET_THEORY',
    mechanism: 'Self-membership contradiction under naive set comprehension',
    claim: 'The set of all sets that are not members of themselves creates contradiction',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Russell 1901'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-003',
    name: 'Barber Paradox',
    domain: 'FIRST_ORDER_LOGIC',
    mechanism: 'Universal quantifier self-reference',
    claim: 'The barber shaves all and only those who do not shave themselves',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'SELF_REFERENCE',
    is_duplicate_of: 'DH-P-002',
    source_references: ['Russell Principles of Mathematics 1903'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-004',
    name: 'Liar Paradox',
    domain: 'SEMANTIC_LOGIC',
    mechanism: 'Direct self-referential negation',
    claim: 'This statement is false',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Tarski Undefinability of Truth 1933'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-005',
    name: 'Grelling-Nelson Paradox',
    domain: 'SEMANTICS',
    mechanism: 'Semantic adjective self-description contradiction',
    claim: 'The heterological predicate creates a self-reference contradiction',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'SELF_REFERENCE',
    is_duplicate_of: 'DH-P-002',
    source_references: ['Grelling and Nelson 1908'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-006',
    name: 'Curry Paradox',
    domain: 'PROOF_THEORY',
    mechanism: 'Self-referential implication without unrestricted contraction controls',
    claim: 'Self-reference combined with implication can derive arbitrary conclusions',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Curry 1942'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-007',
    name: 'Berry Paradox',
    domain: 'DEFINABILITY',
    mechanism: 'Definability and naming-boundary self-reference',
    claim: 'A shortest description can appear to define an object excluded by the description rule',
    verification_status: 'VERIFIED',
    canonical_family: 'DEFINABILITY',
    source_references: ['Berry paradox literature'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-008',
    name: 'Richard Paradox',
    domain: 'DEFINABILITY',
    mechanism: 'Diagonal construction over definable real numbers',
    claim: 'A definability enumeration can construct a real outside the enumeration',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'DEFINABILITY',
    is_duplicate_of: 'DH-P-007',
    source_references: ['Richard 1905'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-009',
    name: 'Burali-Forti Paradox',
    domain: 'CLASS_THEORY',
    mechanism: 'Collection of all ordinals produces an ordinal exceeding itself',
    claim: 'The ordinal of all ordinals cannot exist as a set',
    verification_status: 'VERIFIED',
    canonical_family: 'CLASS_THEORY',
    source_references: ['Burali-Forti 1897'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-010',
    name: 'Cantor Paradox',
    domain: 'CLASS_THEORY',
    mechanism: 'Power-set cardinality exceeds any set cardinality',
    claim: 'A universal set would have a power set strictly larger than itself',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'CLASS_THEORY',
    is_duplicate_of: 'DH-P-009',
    source_references: ['Cantor 1891'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-011',
    name: 'Sorites Paradox',
    domain: 'VAGUENESS',
    mechanism: 'Inductive reasoning across vague predicate boundaries',
    claim: 'Repeated removal of one grain does not identify a precise transition from heap to non-heap',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'VAGUENESS',
    source_references: ['Eubulides of Miletus'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-012',
    name: 'Ship of Theseus',
    domain: 'IDENTITY',
    mechanism: 'Identity persistence under complete component replacement',
    claim: 'Continuous replacement and reconstruction raise competing identity conditions',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'IDENTITY',
    source_references: ['Plutarch Life of Theseus'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-013',
    name: 'Grandfather Paradox',
    domain: 'TEMPORAL',
    mechanism: 'Retrocausal causal-loop contradiction',
    claim: 'Preventing an ancestor from having descendants conflicts with the traveler’s existence',
    verification_status: 'PARTIAL',
    canonical_family: 'TEMPORAL',
    source_references: ['Time-travel paradox literature'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-014',
    name: 'Bootstrap Paradox',
    domain: 'TEMPORAL',
    mechanism: 'Causal loop without an identifiable external origin',
    claim: 'An object or information can appear to exist through a closed causal loop',
    verification_status: 'PARTIAL',
    canonical_family: 'TEMPORAL',
    is_duplicate_of: 'DH-P-013',
    source_references: ['Causal-loop literature'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-015',
    name: 'Raven Paradox (Hempel)',
    domain: 'CONFIRMATION',
    mechanism: 'Confirmation equivalence under logically equivalent hypotheses',
    claim: 'Observation of a non-black non-raven can appear to confirm that all ravens are black',
    verification_status: 'VERIFIED',
    canonical_family: 'CONFIRMATION',
    source_references: ['Hempel 1945'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-016',
    name: 'Goodman New Riddle of Induction (Grue)',
    domain: 'CONFIRMATION',
    mechanism: 'Predicate choice changes inductive projection',
    claim: 'Evidence can support incompatible future projections under alternative predicates',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'CONFIRMATION',
    source_references: ['Goodman Fact, Fiction, and Forecast 1955'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-017',
    name: 'Newcomb Problem',
    domain: 'DECISION_THEORY',
    mechanism: 'Conflict between causal and evidential decision reasoning',
    claim: 'One-box and two-box reasoning can prescribe different actions against a near-perfect predictor',
    verification_status: 'PARTIAL',
    canonical_family: 'DECISION_THEORY',
    source_references: ['Nozick 1969'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-018',
    name: 'Prisoner Dilemma',
    domain: 'GAME_THEORY',
    mechanism: 'Individual incentives conflict with jointly beneficial cooperation',
    claim: 'Dominant individual strategy can produce a collectively inferior outcome',
    verification_status: 'VERIFIED',
    canonical_family: 'GAME_THEORY',
    source_references: ['Flood and Dresher 1950'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-019',
    name: 'Simpson Paradox',
    domain: 'CAUSAL_INFERENCE',
    mechanism: 'Aggregation reverses or obscures subgroup associations',
    claim: 'A relationship present within groups can reverse when groups are combined',
    verification_status: 'VERIFIED',
    canonical_family: 'CAUSAL_INFERENCE',
    source_references: ['Simpson 1951'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-020',
    name: 'Monty Hall Problem',
    domain: 'BAYESIAN_UPDATE',
    mechanism: 'Conditional probability after informed host action',
    claim: 'Switching after a constrained reveal changes the probability of winning',
    verification_status: 'VERIFIED',
    canonical_family: 'BAYESIAN_UPDATE',
    source_references: ['Selvin 1975'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-021',
    name: 'Birthday Paradox',
    domain: 'COMBINATORICS',
    mechanism: 'Collision probability grows rapidly with pair count',
    claim: 'A relatively small group has a surprisingly high probability of a shared birthday',
    verification_status: 'VERIFIED',
    canonical_family: 'COMBINATORICS',
    source_references: ['Classical birthday problem'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-022',
    name: 'Banach-Tarski Paradox',
    domain: 'MEASURE_THEORY',
    mechanism: 'Non-measurable decomposition enabled by the Axiom of Choice',
    claim: 'A solid ball can be decomposed into finitely many pieces and reassembled into two balls of the same size',
    verification_status: 'VERIFIED',
    canonical_family: 'MEASURE_THEORY',
    source_references: ['Banach and Tarski 1924'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-023',
    name: 'Gabriel Horn (Torricelli Trumpet)',
    domain: 'CALCULUS_LIMITS',
    mechanism: 'Infinite volume/surface-area limit behavior',
    claim: 'A trumpet can have finite volume with divergent surface area',
    verification_status: 'VERIFIED',
    canonical_family: 'CALCULUS_LIMITS',
    source_references: ['Torricelli classical analysis'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-024',
    name: 'Olbers Paradox',
    domain: 'COSMOLOGY',
    mechanism: 'Infinite static eternal universe predicts a bright night sky',
    claim: 'A sufficiently old homogeneous static universe conflicts with the observed dark night sky',
    verification_status: 'VERIFIED',
    canonical_family: 'COSMOLOGY',
    source_references: ['Olbers 1823'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-025',
    name: 'Fermi Paradox',
    domain: 'ASTROBIOLOGY',
    mechanism: 'Expected prevalence of extraterrestrial civilizations vs lack of evidence',
    claim: 'Expected abundance of intelligent life appears inconsistent with observed silence',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'ASTROBIOLOGY',
    source_references: ['Fermi 1950'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-026',
    name: 'Twin Paradox',
    domain: 'SPECIAL_RELATIVITY',
    mechanism: 'Relativistic time dilation with asymmetric acceleration histories',
    claim: 'Traveling and stationary twins can accumulate different proper times',
    verification_status: 'VERIFIED',
    canonical_family: 'SPECIAL_RELATIVITY',
    source_references: ['Einstein 1905'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-027',
    name: 'EPR Paradox',
    domain: 'QUANTUM_ENTANGLEMENT',
    mechanism: 'Entanglement and apparent conflict with local realism',
    claim: 'Quantum correlations challenge local hidden-variable descriptions',
    verification_status: 'VERIFIED',
    canonical_family: 'QUANTUM_ENTANGLEMENT',
    source_references: ['Einstein Podolsky Rosen 1935'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-028',
    name: 'Schrodinger Cat Paradox',
    domain: 'QUANTUM_MEASUREMENT',
    mechanism: 'Macroscopic superposition under quantum measurement formalism',
    claim: 'Unitary evolution can produce a superposition of macroscopically distinct outcomes',
    verification_status: 'VERIFIED',
    canonical_family: 'QUANTUM_MEASUREMENT',
    source_references: ['Schrodinger 1935'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-029',
    name: 'Zeno Arrow Paradox',
    domain: 'MATHEMATICAL_ANALYSIS',
    mechanism: 'Instantaneous-state reasoning about motion',
    claim: 'If an arrow is at rest at every instant, naive composition appears to forbid motion',
    verification_status: 'VERIFIED',
    canonical_family: 'ZENO_MOTION',
    is_duplicate_of: 'DH-P-001',
    source_references: ['Aristotle Physics VI:9'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-030',
    name: 'Zeno Dichotomy Paradox',
    domain: 'MATHEMATICAL_ANALYSIS',
    mechanism: 'Infinite subdivision of a finite path',
    claim: 'Motion appears unable to begin because infinitely many sub-distances must be traversed',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'ZENO_MOTION',
    is_duplicate_of: 'DH-P-001',
    source_references: ['Aristotle Physics VI:9'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-031',
    name: 'Braess Paradox',
    domain: 'GAME_THEORY',
    mechanism: 'Network equilibrium can worsen after adding capacity',
    claim: 'Adding a route can increase total travel time under selfish routing',
    verification_status: 'VERIFIED',
    canonical_family: 'GAME_THEORY',
    source_references: ['Braess 1968'],
    created_at: 1718000000000
  },
  {
    code: 'DH-P-032',
    name: 'Byzantine Generals Paradox',
    domain: 'DISTRIBUTED_SYSTEMS',
    mechanism: 'Consensus under adversarial or inconsistent messages',
    claim: 'Distributed agreement requires sufficient assumptions and redundancy to tolerate Byzantine behavior',
    verification_status: 'VERIFIED',
    canonical_family: 'DISTRIBUTED_SYSTEMS',
    source_references: ['Lamport, Shostak, Pease 1982'],
    created_at: 1718000000000
  }
];

export function getDHBootstrapParadoxes(): DHBootstrapParadoxEntity[] {
  return [...DH_BOOTSTRAP_PARADOXES];
}

export function getDHBootstrapByCode(code: string): DHBootstrapParadoxEntity | undefined {
  return DH_BOOTSTRAP_PARADOXES.find(p => p.code === code);
}

export function getDHBootstrapStatusBreakdown(): Record<string, number> {
  return DH_BOOTSTRAP_PARADOXES.reduce<Record<string, number>>((acc, p) => {
    acc[p.verification_status] = (acc[p.verification_status] || 0) + 1;
    return acc;
  }, {});
}
