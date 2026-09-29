/**
 * Exact DH-P-001..DH-P-032 bootstrap registry imported from
 * Solvexb2b/Proofs/src/paradoxes/ParadoxRegistry.ts.
 *
 * Record payloads are preserved from the source registry. Only the
 * repository-specific DatabaseSchema import and singleton wrapper are
 * localized for Full-Build compatibility.
 */
export interface DHBootstrapParadoxEntity {
  id: string;
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
    id: 'px_001',
    code: 'DH-P-001',
    name: 'Achilles and the Tortoise',
    domain: 'INFINITE_SERIES',
    mechanism: 'Zeno geometric division convergence in finite space-time.',
    claim: 'Finite distance is traversed in finite steps using geometric series summation.',
    verification_status: 'VERIFIED',
    canonical_family: 'ZENO_MOTION',
    source_references: ['Aristotle Physics VI:9', 'Cauchy Limit Theory 1821'],
    created_at: 1718000000000
  },
  {
    id: 'px_002',
    code: 'DH-P-002',
    name: 'Russell Set Paradox',
    domain: 'SET_THEORY',
    mechanism: 'Set of all sets that do not contain themselves creates ungrounded self-reference.',
    claim: 'Stratification into tiered type hierarchies resolves unrestricted comprehension.',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Russell Principles of Mathematics 1903', 'ZFC Axiom of Foundation'],
    created_at: 1718000000000
  },
  {
    id: 'px_003',
    code: 'DH-P-003',
    name: 'Barber Paradox',
    domain: 'SET_THEORY',
    mechanism: 'Barber shaves all and only those who do not shave themselves.',
    claim: 'Recognized as isomorphic natural language variant of Russell Set Paradox.',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'SELF_REFERENCE',
    is_duplicate_of: 'DH-P-002',
    source_references: ['Russell 1918'],
    created_at: 1718000000000
  },
  {
    id: 'px_004',
    code: 'DH-P-004',
    name: 'Liar Paradox',
    domain: 'SEMANTIC_LOGIC',
    mechanism: 'Sentence asserting its own falsehood ("This statement is false").',
    claim: 'Requires multi-valued logic or Tarskian meta-language truth hierarchies.',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Epimenides 600 BC', 'Tarski Concept of Truth 1933'],
    created_at: 1718000000000
  },
  {
    id: 'px_005',
    code: 'DH-P-005',
    name: 'Grelling-Nelson Paradox',
    domain: 'SEMANTICS',
    mechanism: 'Is "heterological" (a word not describing itself) heterological?',
    claim: 'Syntactic stratification eliminates reflexive autological assignment.',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'SELF_REFERENCE',
    is_duplicate_of: 'DH-P-002',
    source_references: ['Kurt Grelling & Leonard Nelson 1908'],
    created_at: 1718000000000
  },
  {
    id: 'px_006',
    code: 'DH-P-006',
    name: 'Curry Paradox',
    domain: 'PROOF_THEORY',
    mechanism: 'Self-referential conditional implies arbitrary falsehood without negation.',
    claim: 'Solved by substructural linear logic rejecting contraction.',
    verification_status: 'VERIFIED',
    canonical_family: 'SELF_REFERENCE',
    source_references: ['Haskell Curry 1942'],
    created_at: 1718000000000
  },
  {
    id: 'px_007',
    code: 'DH-P-007',
    name: 'Berry Paradox',
    domain: 'KOLMOGOROV_COMPLEXITY',
    mechanism: 'The smallest positive integer not definable in under eleven words.',
    claim: 'Formalized by Kolmogorov complexity bounds and halting limits.',
    verification_status: 'VERIFIED',
    canonical_family: 'DEFINABILITY',
    source_references: ['Bertrand Russell 1906', 'Chaitin Algorithmic Information 1995'],
    created_at: 1718000000000
  },
  {
    id: 'px_008',
    code: 'DH-P-008',
    name: 'Richard Paradox',
    domain: 'DEFINABILITY',
    mechanism: 'Diagonalization over all definable real numbers.',
    claim: 'Diagonal element requires definition outside the enumerated language tier.',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'DEFINABILITY',
    is_duplicate_of: 'DH-P-007',
    source_references: ['Jules Richard 1905'],
    created_at: 1718000000000
  },
  {
    id: 'px_009',
    code: 'DH-P-009',
    name: 'Burali-Forti Paradox',
    domain: 'SET_THEORY',
    mechanism: 'The ordinal number of all ordinals must be greater than itself.',
    claim: 'The collection of all ordinals forms a proper class, not a set.',
    verification_status: 'VERIFIED',
    canonical_family: 'CLASS_THEORY',
    source_references: ['Cesare Burali-Forti 1897'],
    created_at: 1718000000000
  },
  {
    id: 'px_010',
    code: 'DH-P-010',
    name: 'Cantor Paradox',
    domain: 'SET_THEORY',
    mechanism: 'Power set of universal set must have strictly greater cardinality than universal set.',
    claim: 'Universal set does not exist under standard ZFC foundation.',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'CLASS_THEORY',
    is_duplicate_of: 'DH-P-009',
    source_references: ['Georg Cantor 1899'],
    created_at: 1718000000000
  },
  {
    id: 'px_011',
    code: 'DH-P-011',
    name: 'Sorites Paradox',
    domain: 'VAGUENESS',
    mechanism: 'Removing one grain from a heap leaves a heap; by induction one grain is a heap.',
    claim: 'Solved via fuzzy logic or contextual boundary tolerance intervals.',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'VAGUENESS',
    source_references: ['Eubulides of Miletus 4th c. BC'],
    created_at: 1718000000000
  },
  {
    id: 'px_012',
    code: 'DH-P-012',
    name: 'Ship of Theseus',
    domain: 'ONTOLOGY',
    mechanism: 'Gradual replacement of every part raises persistent identity ambiguity.',
    claim: 'Requires 4D spatio-temporal perdurantism or functional graph equivalence.',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'IDENTITY',
    source_references: ['Plutarch Life of Theseus 1st c. AD'],
    created_at: 1718000000000
  },
  {
    id: 'px_013',
    code: 'DH-P-013',
    name: 'Grandfather Paradox',
    domain: 'TEMPORAL_CAUSALITY',
    mechanism: 'Time traveler prevents own lineage, invalidating the travel premise.',
    claim: 'Novikov self-consistency conjecture or closed timelike curve decoherence.',
    verification_status: 'PARTIAL',
    canonical_family: 'TEMPORAL',
    source_references: ['Rene Barjavel 1943', 'Novikov Self-Consistency 1990'],
    created_at: 1718000000000
  },
  {
    id: 'px_014',
    code: 'DH-P-014',
    name: 'Bootstrap Paradox',
    domain: 'TEMPORAL_CAUSALITY',
    mechanism: 'An object or information is sent back in time, creating uncaused existence.',
    claim: 'Ontological loop resolved via topological path-integral boundary conditions.',
    verification_status: 'PARTIAL',
    canonical_family: 'TEMPORAL',
    is_duplicate_of: 'DH-P-013',
    source_references: ['Robert Heinlein 1941'],
    created_at: 1718000000000
  },
  {
    id: 'px_015',
    code: 'DH-P-015',
    name: 'Raven Paradox (Hempel)',
    domain: 'EPISTEMOLOGY',
    mechanism: 'Observing a green apple confirms "All ravens are black" via contrapositive.',
    claim: 'Bayesian confirmation theory assigns infinitesimal but non-zero probability.',
    verification_status: 'VERIFIED',
    canonical_family: 'CONFIRMATION',
    source_references: ['Carl Gustav Hempel 1945'],
    created_at: 1718000000000
  },
  {
    id: 'px_016',
    code: 'DH-P-016',
    name: 'Goodman New Riddle of Induction (Grue)',
    domain: 'EPISTEMOLOGY',
    mechanism: 'Predicate "grue" (green before t, blue after) equally supported by evidence.',
    claim: 'Requires entrenchment criteria and projective syntax constraints.',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'CONFIRMATION',
    source_references: ['Nelson Goodman Fact Fiction and Forecast 1955'],
    created_at: 1718000000000
  },
  {
    id: 'px_017',
    code: 'DH-P-017',
    name: 'Newcomb Problem',
    domain: 'DECISION_THEORY',
    mechanism: 'Superintelligent predictor: choose One Box ($1M) or Two Boxes ($1M + $1K).',
    claim: 'Resolved by Causal Decision Theory vs Evidential Decision Theory distinction.',
    verification_status: 'PARTIAL',
    canonical_family: 'DECISION_THEORY',
    source_references: ['William Newcomb 1960', 'Robert Nozick 1969'],
    created_at: 1718000000000
  },
  {
    id: 'px_018',
    code: 'DH-P-018',
    name: 'Prisoner Dilemma',
    domain: 'GAME_THEORY',
    mechanism: 'Dominant individual strategy leads to suboptimal collective outcome.',
    claim: 'Repeated games with tit-for-tat or contractual escrow enforce cooperation.',
    verification_status: 'VERIFIED',
    canonical_family: 'GAME_THEORY',
    source_references: ['Flood & Dresher 1950', 'Axelrod Evolution of Cooperation 1984'],
    created_at: 1718000000000
  },
  {
    id: 'px_019',
    code: 'DH-P-019',
    name: 'Simpson Paradox',
    domain: 'STATISTICS',
    mechanism: 'Trend appears in groups but reverses when groups are aggregated.',
    claim: 'Causal DAG modeling (Pearl do-calculus) eliminates confounding bias.',
    verification_status: 'VERIFIED',
    canonical_family: 'CAUSAL_INFERENCE',
    source_references: ['Edward Simpson 1951', 'Judea Pearl Causality 2000'],
    created_at: 1718000000000
  },
  {
    id: 'px_020',
    code: 'DH-P-020',
    name: 'Monty Hall Problem',
    domain: 'PROBABILITY',
    mechanism: 'Switching doors doubles win probability from 1/3 to 2/3.',
    claim: 'Bayesian conditioning under host knowledge constraint proves 2/3 win rate.',
    verification_status: 'VERIFIED',
    canonical_family: 'BAYESIAN_UPDATE',
    source_references: ['Steve Selvin 1975', 'Marilyn vos Savant 1990'],
    created_at: 1718000000000
  },
  {
    id: 'px_021',
    code: 'DH-P-021',
    name: 'Birthday Paradox',
    domain: 'COMBINATORICS',
    mechanism: 'In 23 people, >50% chance of a shared birthday.',
    claim: 'Combinatorial pair selection product (1 - prod((365-i)/365)) proves 50.7%.',
    verification_status: 'VERIFIED',
    canonical_family: 'COMBINATORICS',
    source_references: ['Richard von Mises 1939'],
    created_at: 1718000000000
  },
  {
    id: 'px_022',
    code: 'DH-P-022',
    name: 'Banach-Tarski Paradox',
    domain: 'MEASURE_THEORY',
    mechanism: 'A solid ball can be decomposed into 5 non-measurable sets and reassembled into two.',
    claim: 'Depends strictly on the Axiom of Choice acting on non-Lebesgue measurable sets.',
    verification_status: 'VERIFIED',
    canonical_family: 'MEASURE_THEORY',
    source_references: ['Stefan Banach & Alfred Tarski 1924'],
    created_at: 1718000000000
  },
  {
    id: 'px_023',
    code: 'DH-P-023',
    name: 'Gabriel Horn (Torricelli Trumpet)',
    domain: 'CALCULUS',
    mechanism: 'Surface of revolution has infinite surface area but finite volume (pi).',
    claim: 'Integrals for volume and surface area diverge differently across limits.',
    verification_status: 'VERIFIED',
    canonical_family: 'CALCULUS_LIMITS',
    source_references: ['Evangelista Torricelli 1643'],
    created_at: 1718000000000
  },
  {
    id: 'px_024',
    code: 'DH-P-024',
    name: 'Olbers Paradox',
    domain: 'ASTROPHYSICS',
    mechanism: 'In an infinite static universe, the night sky should be uniformly bright.',
    claim: 'Universe has finite age, speed of light is finite, and spacetime is expanding.',
    verification_status: 'VERIFIED',
    canonical_family: 'COSMOLOGY',
    source_references: ['Heinrich Olbers 1823', 'Hubble Expansion 1929'],
    created_at: 1718000000000
  },
  {
    id: 'px_025',
    code: 'DH-P-025',
    name: 'Fermi Paradox',
    domain: 'ASTROBIOLOGY',
    mechanism: 'High probability of extraterrestrial life vs total absence of observational contact.',
    claim: 'Great Filter hypotheses or percolation percolation model constraints.',
    verification_status: 'CLAIM_ONLY',
    canonical_family: 'ASTROBIOLOGY',
    source_references: ['Enrico Fermi 1950', 'Robin Hanson Great Filter 1998'],
    created_at: 1718000000000
  },
  {
    id: 'px_026',
    code: 'DH-P-026',
    name: 'Twin Paradox',
    domain: 'RELATIVITY',
    mechanism: 'Traveling twin accelerates away and returns younger than stationary twin.',
    claim: 'Asymmetry of non-inertial reference frames and Minkowski metric path integral.',
    verification_status: 'VERIFIED',
    canonical_family: 'SPECIAL_RELATIVITY',
    source_references: ['Albert Einstein 1905', 'Paul Langevin 1911'],
    created_at: 1718000000000
  },
  {
    id: 'px_027',
    code: 'DH-P-027',
    name: 'EPR Paradox',
    domain: 'QUANTUM_MECHANICS',
    mechanism: 'Entangled particles exhibit instantaneous correlations ("spooky action at a distance").',
    claim: 'Bell Inequality violations confirm non-locality without faster-than-light signaling.',
    verification_status: 'VERIFIED',
    canonical_family: 'QUANTUM_ENTANGLEMENT',
    source_references: ['Einstein Podolsky Rosen 1935', 'John Stewart Bell 1964'],
    created_at: 1718000000000
  },
  {
    id: 'px_028',
    code: 'DH-P-028',
    name: 'Schrodinger Cat Paradox',
    domain: 'QUANTUM_MEASUREMENT',
    mechanism: 'Quantum superposition entangled with macroscopic feline life state.',
    claim: 'Decoherence through environmental interaction suppresses off-diagonal density matrix elements.',
    verification_status: 'VERIFIED',
    canonical_family: 'QUANTUM_MEASUREMENT',
    source_references: ['Erwin Schrodinger 1935', 'Zurek Environment-Induced Superselection 2003'],
    created_at: 1718000000000
  },
  {
    id: 'px_029',
    code: 'DH-P-029',
    name: 'Zeno Arrow Paradox',
    domain: 'INFINITE_SERIES',
    mechanism: 'At every instant of time, a flying arrow occupies a space equal to itself and is motionless.',
    claim: 'Velocity is defined as the calculus limit of delta-x over delta-t as delta-t approaches zero.',
    verification_status: 'VERIFIED',
    canonical_family: 'ZENO_MOTION',
    is_duplicate_of: 'DH-P-001',
    source_references: ['Aristotle Physics VI:9'],
    created_at: 1718000000000
  },
  {
    id: 'px_030',
    code: 'DH-P-030',
    name: 'Zeno Dichotomy Paradox',
    domain: 'INFINITE_SERIES',
    mechanism: 'Motion can never start because one must traverse infinite half-intervals first.',
    claim: 'Variant of Achilles paradox; infinite geometric series sum converges to 1.',
    verification_status: 'FAMILY_VARIANT',
    canonical_family: 'ZENO_MOTION',
    is_duplicate_of: 'DH-P-001',
    source_references: ['Aristotle Physics VI:9'],
    created_at: 1718000000000
  },
  {
    id: 'px_031',
    code: 'DH-P-031',
    name: 'Braess Paradox',
    domain: 'NETWORK_FLOW',
    mechanism: 'Adding a road to a congested traffic network can increase overall travel times.',
    claim: 'Nash equilibrium in non-cooperative games does not equal social optimum.',
    verification_status: 'VERIFIED',
    canonical_family: 'GAME_THEORY',
    source_references: ['Dietrich Braess 1968'],
    created_at: 1718000000000
  },
  {
    id: 'px_032',
    code: 'DH-P-032',
    name: 'Byzantine Generals Paradox',
    domain: 'DISTRIBUTED_CONSENSUS',
    mechanism: 'Reaching consensus across unreliable networks with traitorous nodes.',
    claim: 'Requires >3m+1 nodes for synchronous crash/byzantine tolerance, or cryptographic signatures.',
    verification_status: 'VERIFIED',
    canonical_family: 'DISTRIBUTED_SYSTEMS',
    source_references: ['Lamport Shostak Pease 1982', 'Nakamoto Proof-of-Work 2008'],
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
