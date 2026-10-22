export interface ParadoxEntity {
  code: string;
  name: string;
  domain: string;
  mechanism: string;
  claim: string;
  canonical_family: string;
  is_duplicate_of?: string;
  verification_status: 'VERIFIED' | 'FAMILY_VARIANT' | 'CLAIM_ONLY' | 'PARTIAL';
  source_references: string[];
}

export class ParadoxRegistry {
  private static instance: ParadoxRegistry | null = null;
  private paradoxes: Map<string, ParadoxEntity> = new Map();

  private constructor() {
    this.bootstrap32Paradoxes();
  }

  public static getInstance(): ParadoxRegistry {
    if (!ParadoxRegistry.instance) {
      ParadoxRegistry.instance = new ParadoxRegistry();
    }
    return ParadoxRegistry.instance;
  }

  private bootstrap32Paradoxes(): void {
    const list: ParadoxEntity[] = [
      {
        code: 'DH-P-001',
        name: "Zeno's Achilles and the Tortoise",
        domain: 'MATHEMATICAL_ANALYSIS',
        mechanism: 'Infinite geometric series in continuous metric space',
        claim: 'Achilles never overtakes tortoise under infinite division assumption',
        canonical_family: 'ZENO_CONTINUUM',
        verification_status: 'VERIFIED',
        source_references: ['Aristotle Physics VI:9', 'Cauchy Rigorous Convergence 1821']
      },
      {
        code: 'DH-P-002',
        name: "Russell's Paradox (Naive Comprehension)",
        domain: 'SET_THEORY',
        mechanism: 'Self-predication in unrestricted set comprehension',
        claim: 'Set of all sets not members of themselves is contradictory',
        canonical_family: 'SELF_REFERENCE',
        verification_status: 'VERIFIED',
        source_references: ['Russell 1901', 'Zermelo-Fraenkel Foundation 1908']
      },
      {
        code: 'DH-P-003',
        name: "Barber Paradox",
        domain: 'FIRST_ORDER_LOGIC',
        mechanism: 'Universal quantifier domain contradiction',
        claim: 'Barber shaves all and only those who do not shave themselves',
        canonical_family: 'SELF_REFERENCE',
        is_duplicate_of: 'DH-P-002',
        verification_status: 'FAMILY_VARIANT',
        source_references: ['Russell Principles of Mathematics 1903']
      },
      {
        code: 'DH-P-004',
        name: "Liar Paradox (Epimenides)",
        domain: 'SEMANTIC_LOGIC',
        mechanism: 'Direct self-referential negation without stratified truth predicates',
        claim: 'This statement is false',
        canonical_family: 'SELF_REFERENCE',
        verification_status: 'VERIFIED',
        source_references: ['Tarski Undefinability of Truth 1933']
      },
      {
        code: 'DH-P-005',
        name: "Curry's Paradox",
        domain: 'PROOF_THEORY',
        mechanism: 'Unrestricted contraction with material implication',
        claim: 'If this sentence is true, arbitrary falsehood F holds',
        canonical_family: 'SELF_REFERENCE',
        verification_status: 'VERIFIED',
        source_references: ['Curry 1942', 'Linear Logic Girard 1987']
      },
      {
        code: 'DH-P-006',
        name: "Burali-Forti Paradox",
        domain: 'ORDINAL_ARITHMETIC',
        mechanism: 'Set of all ordinal numbers is itself an ordinal',
        claim: 'The ordinal of all ordinals exceeds itself',
        canonical_family: 'WELL_ORDERING',
        verification_status: 'VERIFIED',
        source_references: ['Burali-Forti 1897', 'Von Neumann Ordinals']
      },
      {
        code: 'DH-P-007',
        name: "Cantor's Paradox (Universal Cardinal)",
        domain: 'SET_THEORY',
        mechanism: 'Power set cardinality strictly exceeds base set cardinality',
        claim: 'Universal set power set must have greater cardinality than universal set',
        canonical_family: 'WELL_ORDERING',
        verification_status: 'VERIFIED',
        source_references: ['Cantor Theorem 1891']
      },
      {
        code: 'DH-P-008',
        name: "Berry Paradox (Least Unnameable Integer)",
        domain: 'COMPUTATIONAL_COMPLEXITY',
        mechanism: 'Kolmogorov complexity naming bounds',
        claim: 'Smallest positive integer not definable in under twelve words',
        canonical_family: 'SELF_REFERENCE',
        is_duplicate_of: 'DH-P-004',
        verification_status: 'FAMILY_VARIANT',
        source_references: ['Russell 1906', 'Chaitin Algorithmic Information']
      },
      {
        code: 'DH-P-009',
        name: "Grelling-Nelson (Heterological Paradox)",
        domain: 'SEMANTICS',
        mechanism: 'Semantic adjective self-description contradiction',
        claim: 'Is the word "heterological" heterological?',
        canonical_family: 'SELF_REFERENCE',
        is_duplicate_of: 'DH-P-002',
        verification_status: 'FAMILY_VARIANT',
        source_references: ['Grelling and Nelson 1908']
      },
      {
        code: 'DH-P-010',
        name: "Yablo's Paradox (Non-Self-Referential Inconsistency)",
        domain: 'MODAL_LOGIC',
        mechanism: 'Infinite sequence of strictly subsequent negations',
        claim: 'Each statement asserts all subsequent statements are false',
        canonical_family: 'SELF_REFERENCE',
        verification_status: 'VERIFIED',
        source_references: ['Yablo 1993']
      },
      {
        code: 'DH-P-011',
        name: "Zeno's Dichotomy (Runner at the Track)",
        domain: 'MATHEMATICAL_ANALYSIS',
        mechanism: 'Sum of negative powers of 2',
        claim: 'Motion cannot begin because half of journey must be completed first',
        canonical_family: 'ZENO_CONTINUUM',
        is_duplicate_of: 'DH-P-001',
        verification_status: 'FAMILY_VARIANT',
        source_references: ['Aristotle Physics VI:9']
      },
      {
        code: 'DH-P-012',
        name: "Zeno's Arrow Paradox",
        domain: 'PHYSICS_CALCULUS',
        mechanism: 'Instantaneous velocity limit delta_t -> 0',
        claim: 'At every instant flying arrow is at rest, hence motion is impossible',
        canonical_family: 'ZENO_CONTINUUM',
        verification_status: 'VERIFIED',
        source_references: ['Newton-Leibniz Differential Calculus']
      },
      {
        code: 'DH-P-013',
        name: "Ship of Theseus",
        domain: 'ONTOLOGY',
        mechanism: 'Identity persistence across complete part replacement',
        claim: 'Continuous physical replacement vs reconstructed original',
        canonical_family: 'IDENTITY_PERSISTENCE',
        verification_status: 'VERIFIED',
        source_references: ['Plutarch Life of Theseus', 'Kripke Naming and Necessity']
      },
      {
        code: 'DH-P-014',
        name: "Sorites Paradox (Heap of Sand)",
        domain: 'FUZZY_LOGIC',
        mechanism: 'Vague boundary predicate with inductive transition premise',
        claim: 'Removing one grain from a heap never destroys the heap',
        canonical_family: 'VAGUENESS',
        verification_status: 'VERIFIED',
        source_references: ['Eubulides of Miletus', 'Zadeh Fuzzy Sets 1965']
      },
      {
        code: 'DH-P-015',
        name: "Two Generals Problem",
        domain: 'DISTRIBUTED_SYSTEMS',
        mechanism: 'Unreliable communication channel consensus impossibility',
        claim: 'No finite protocol guarantees common knowledge over lossy link',
        canonical_family: 'IMPOSSIBILITY_THEOREMS',
        verification_status: 'VERIFIED',
        source_references: ['Gray 1978', 'Akkoyunlu et al. 1975']
      },
      {
        code: 'DH-P-016',
        name: "FLP Impossibility (Fischer-Lynch-Paterson)",
        domain: 'DISTRIBUTED_SYSTEMS',
        mechanism: 'Asynchronous consensus with one unannounced crash failure',
        claim: 'Deterministic asynchronous consensus cannot guarantee termination',
        canonical_family: 'IMPOSSIBILITY_THEOREMS',
        verification_status: 'VERIFIED',
        source_references: ['Fischer, Lynch, Paterson 1985 JACM']
      },
      {
        code: 'DH-P-017',
        name: "Banach-Tarski Paradox",
        domain: 'MEASURE_THEORY',
        mechanism: 'Axiom of Choice non-measurable set decompositions in R^3',
        claim: 'Solid ball can be decomposed into finite pieces and reassembled into two identical balls',
        canonical_family: 'MEASURE_ANOMALY',
        verification_status: 'VERIFIED',
        source_references: ['Banach and Tarski 1924', 'Free Group SO(3)']
      },
      {
        code: 'DH-P-018',
        name: "Grandfather Paradox (Closed Timelike Curves)",
        domain: 'CAUSAL_ANALYSIS',
        mechanism: 'Novikov self-consistency conjecture in Lorentzian manifolds',
        claim: 'Retrocausal prevention of ancestor birth yields non-bivalent state',
        canonical_family: 'CAUSAL_LOOPS',
        verification_status: 'VERIFIED',
        source_references: ['Novikov 1980', 'Thorne Wormholes and CTCs']
      },
      {
        code: 'DH-P-019',
        name: "Simpson's Paradox",
        domain: 'STATISTICAL_INFERENCE',
        mechanism: 'Confounding variables reversing marginal group correlations',
        claim: 'Trend appears in groups but disappears or reverses when aggregated',
        canonical_family: 'STATISTICAL_CONFOUNDING',
        verification_status: 'VERIFIED',
        source_references: ['Simpson 1951', 'Pearl Causality 2000']
      },
      {
        code: 'DH-P-020',
        name: "Monty Hall Problem",
        domain: 'PROBABILITY_THEORY',
        mechanism: 'Conditional probability update with host private information',
        claim: 'Switching doors doubles winning probability from 1/3 to 2/3',
        canonical_family: 'BAYESIAN_UPDATE',
        verification_status: 'VERIFIED',
        source_references: ['Selvin 1975', 'vos Savant 1990']
      },
      {
        code: 'DH-P-021',
        name: "Newcomb's Paradox",
        domain: 'DECISION_THEORY',
        mechanism: 'Evidential vs Causal Decision Theory with perfect predictor',
        claim: 'One-box dominance vs two-box causal expectation conflict',
        canonical_family: 'DECISION_CONFLICT',
        verification_status: 'VERIFIED',
        source_references: ['Nozick 1969', 'Lewis Causal Decision Theory']
      },
      {
        code: 'DH-P-022',
        name: "Unexpected Hanging Paradox",
        domain: 'EPISTEMIC_LOGIC',
        mechanism: 'Backward induction with non-provable future knowledge',
        claim: 'Surprise inspection cannot occur on any day, yet does occur',
        canonical_family: 'EPISTEMIC_LOOPS',
        verification_status: 'VERIFIED',
        source_references: ['O\'Connor 1948', 'Kripke Epistemic Logic']
      },
      {
        code: 'DH-P-023',
        name: "St. Petersburg Paradox",
        domain: 'EXPECTED_UTILITY',
        mechanism: 'Infinite expected monetary value with diminishing marginal utility',
        claim: 'Game with infinite expectation warrants finite price to enter',
        canonical_family: 'UTILITY_CONVERGENCE',
        verification_status: 'VERIFIED',
        source_references: ['Bernoulli 1738', 'Logarithmic Utility Function']
      },
      {
        code: 'DH-P-024',
        name: "Braess's Paradox",
        domain: 'GAME_THEORY / ROUTING',
        mechanism: 'Wardrop equilibrium shift under non-cooperative Nash selfish routing',
        claim: 'Adding a road to a network can worsen overall traffic flow',
        canonical_family: 'NASH_INEFFICIENCY',
        verification_status: 'VERIFIED',
        source_references: ['Braess 1968', 'Roughgarden Selfish Routing']
      },
      {
        code: 'DH-P-025',
        name: "Condorcet Voting Paradox",
        domain: 'SOCIAL_CHOICE',
        mechanism: 'Non-transitive collective preference cycles from transitive individuals',
        claim: 'A preferred to B, B preferred to C, and C preferred to A',
        canonical_family: 'ARROW_IMPOSSIBILITY',
        verification_status: 'VERIFIED',
        source_references: ['Marquis de Condorcet 1785', 'Arrow 1951']
      },
      {
        code: 'DH-P-026',
        name: "Allais Paradox",
        domain: 'BEHAVIORAL_ECONOMICS',
        mechanism: 'Independence axiom violation in expected utility theory',
        claim: 'Systematic preference for certainty violating linear probabilities',
        canonical_family: 'PROSPECT_THEORY',
        verification_status: 'VERIFIED',
        source_references: ['Allais 1953', 'Kahneman and Tversky 1979']
      },
      {
        code: 'DH-P-027',
        name: "Crocodile Paradox",
        domain: 'CLASSICAL_DILEMMA',
        mechanism: 'Self-referential condition imposed by adversarial agent',
        claim: 'Crocodile returns child if father correctly predicts what crocodile does',
        canonical_family: 'SELF_REFERENCE',
        is_duplicate_of: 'DH-P-004',
        verification_status: 'FAMILY_VARIANT',
        source_references: ['Stoic Logic Dialectica']
      },
      {
        code: 'DH-P-028',
        name: "Pigeonhole Collision Theorem",
        domain: 'DISCRETE_MATHEMATICS',
        mechanism: 'Cardinality clash on injective mapping between finite sets',
        claim: 'Mapping N+1 items to N slots guarantees at least one collision',
        canonical_family: 'COMBINATORIAL_COLLISION',
        verification_status: 'VERIFIED',
        source_references: ['Dirichlet Box Principle 1834']
      },
      {
        code: 'DH-P-029',
        name: "Collatz Conjecture Convergence Bound",
        domain: 'NUMBER_THEORY',
        mechanism: 'Bounded trajectory verification under 3n+1 mapping',
        claim: 'All orbits reach the {4, 2, 1} cycle for all natural numbers',
        canonical_family: 'ARITHMETIC_CHAOS',
        verification_status: 'CLAIM_ONLY',
        source_references: ['Lothar Collatz 1937', 'Lagarias 1985']
      },
      {
        code: 'DH-P-030',
        name: "Riemann Hypothesis Non-Trivial Zero Alignment",
        domain: 'COMPLEX_ANALYSIS',
        mechanism: 'All non-trivial zeros of zeta function reside on Re(s)=1/2',
        claim: 'Zeroes strictly lie on critical line without deviation',
        canonical_family: 'ANALYTIC_NUMBER_THEORY',
        verification_status: 'CLAIM_ONLY',
        source_references: ['Bernhard Riemann 1859']
      },
      {
        code: 'DH-P-031',
        name: "P vs NP Polynomial Separation Hypothesis",
        domain: 'COMPUTATIONAL_COMPLEXITY',
        mechanism: 'Verification complexity vs decision complexity equivalence',
        claim: 'Polynomial verification does not imply polynomial solver existence',
        canonical_family: 'COMPLEXITY_SEPARATION',
        verification_status: 'CLAIM_ONLY',
        source_references: ['Cook 1971', 'Levin 1973']
      },
      {
        code: 'DH-P-032',
        name: "Goldbach Bounded Prime Decomposition",
        domain: 'ADDITIVE_NUMBER_THEORY',
        mechanism: 'Every even integer greater than 2 is sum of two primes',
        claim: 'Even integer 2k = p1 + p2 holds unconditionally',
        canonical_family: 'ADDITIVE_PRIME_BASIS',
        verification_status: 'CLAIM_ONLY',
        source_references: ['Christian Goldbach 1742', 'Helfgott 2013']
      }
    ];

    for (const p of list) {
      this.paradoxes.set(p.code, p);
    }
  }

  public getAllParadoxes(): ParadoxEntity[] {
    return Array.from(this.paradoxes.values());
  }

  public getByCode(code: string): ParadoxEntity | undefined {
    return this.paradoxes.get(code);
  }

  public getStatusBreakdown(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of this.paradoxes.values()) {
      counts[p.verification_status] = (counts[p.verification_status] || 0) + 1;
    }
    return counts;
  }
}
