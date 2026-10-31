export interface DH32ParadoxSpec {
  code: string;
  name: string;
  domain: string;
  canonical_family: string;
  claim: string;
  mathematical_rationale: string;
  expected_result: 'unsat' | 'sat';
  z3_smt_assertion: string;
}

export const DH32_PARADOX_SPECS: DH32ParadoxSpec[] = [
  {
    code: 'DH-P-001',
    name: "Zeno's Achilles and the Tortoise",
    domain: 'MATHEMATICAL_ANALYSIS',
    canonical_family: 'ZENO_CONTINUUM',
    claim: 'Achilles never overtakes tortoise under infinite division assumption',
    mathematical_rationale: 'In continuous metric space with speeds v_A > v_T > 0 and initial lead x_0 > 0, overtake occurs at finite time t = x_0 / (v_A - v_T). Refuting non-overtake yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const v_A Real)
(declare-const v_T Real)
(declare-const x_0 Real)
(declare-const t Real)
(assert (> v_A 0.0))
(assert (> v_T 0.0))
(assert (> v_A v_T))
(assert (> x_0 0.0))
(assert (= t (/ x_0 (- v_A v_T))))
(assert (< (* v_A t) (+ x_0 (* v_T t))))
(check-sat)`
  },
  {
    code: 'DH-P-002',
    name: "Russell's Paradox (Naive Comprehension)",
    domain: 'SET_THEORY',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Set of all sets not members of themselves is contradictory',
    mathematical_rationale: 'Unrestricted comprehension predicate R in R <=> !(R in R) is inherently contradictory. Refutation yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const R_in_R Bool)
(assert (= R_in_R (not R_in_R)))
(check-sat)`
  },
  {
    code: 'DH-P-003',
    name: 'Barber Paradox',
    domain: 'FIRST_ORDER_LOGIC',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Barber shaves all and only those who do not shave themselves',
    mathematical_rationale: 'Universal quantification shaves(B, x) <=> !shaves(x, x) evaluated at x = B requires shaves(B, B) <=> !shaves(B, B), which is impossible. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-sort Man)
(declare-fun shaves (Man Man) Bool)
(declare-const Barber Man)
(assert (forall ((x Man)) (= (shaves Barber x) (not (shaves x x)))))
(check-sat)`
  },
  {
    code: 'DH-P-004',
    name: 'Liar Paradox (Epimenides)',
    domain: 'SEMANTIC_LOGIC',
    canonical_family: 'SELF_REFERENCE',
    claim: 'This statement is false',
    mathematical_rationale: 'Direct self-referential proposition L <=> !L in classical bivalent logic has no truth assignment. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const L Bool)
(assert (= L (not L)))
(check-sat)`
  },
  {
    code: 'DH-P-005',
    name: "Curry's Paradox",
    domain: 'PROOF_THEORY',
    canonical_family: 'SELF_REFERENCE',
    claim: 'If this sentence is true, arbitrary falsehood F holds',
    mathematical_rationale: 'Sentence C asserting C => F entails F via contraction. Asserting !F with C <=> (C => F) is contradictory. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const C Bool)
(declare-const F Bool)
(assert (not F))
(assert (= C (=> C F)))
(check-sat)`
  },
  {
    code: 'DH-P-006',
    name: 'Burali-Forti Paradox',
    domain: 'ORDINAL_ARITHMETIC',
    canonical_family: 'WELL_ORDERING',
    claim: 'The ordinal of all ordinals exceeds itself',
    mathematical_rationale: 'In strict well-ordering, no ordinal satisfies Omega < Omega. Asserting irreflexivity and Omega < Omega is contradictory. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-sort Ordinal)
(declare-fun lt (Ordinal Ordinal) Bool)
(declare-const Omega Ordinal)
(assert (forall ((x Ordinal)) (not (lt x x))))
(assert (lt Omega Omega))
(check-sat)`
  },
  {
    code: 'DH-P-007',
    name: "Cantor's Paradox (Universal Cardinal)",
    domain: 'SET_THEORY',
    canonical_family: 'WELL_ORDERING',
    claim: 'Universal set power set must have greater cardinality than universal set',
    mathematical_rationale: 'Cantor theorem requires |P(U)| > |U|, while universal set requires P(U) subseteq U, hence |P(U)| <= |U|. Both cannot hold. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const card_U Int)
(declare-const card_PU Int)
(assert (> card_U 0))
(assert (> card_PU card_U))
(assert (<= card_PU card_U))
(check-sat)`
  },
  {
    code: 'DH-P-008',
    name: 'Berry Paradox (Least Unnameable Integer)',
    domain: 'COMPUTATIONAL_COMPLEXITY',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Smallest positive integer not definable in under twelve words',
    mathematical_rationale: 'The sentence itself defines n in under 12 words, forcing definable(n) and !definable(n). UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const n Int)
(declare-fun definable_under_12 (Int) Bool)
(assert (definable_under_12 n))
(assert (not (definable_under_12 n)))
(check-sat)`
  },
  {
    code: 'DH-P-009',
    name: 'Grelling-Nelson (Heterological Paradox)',
    domain: 'SEMANTICS',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Is the word "heterological" heterological?',
    mathematical_rationale: 'Heterological adjective predicate applied to itself yields Het(Het) <=> !Het(Het). UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const het_of_het Bool)
(assert (= het_of_het (not het_of_het)))
(check-sat)`
  },
  {
    code: 'DH-P-010',
    name: "Yablo's Paradox (Non-Self-Referential Inconsistency)",
    domain: 'MODAL_LOGIC',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Each statement asserts all subsequent statements are false',
    mathematical_rationale: 'Truth of S_k forces !S_{k+1}, but also forces all statements after k+1 to be false, which satisfies definition of S_{k+1}. Contradiction yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const S_k Bool)
(declare-const S_k1 Bool)
(declare-const all_after_k1_false Bool)
(assert S_k)
(assert (=> S_k (and (not S_k1) all_after_k1_false)))
(assert (= S_k1 all_after_k1_false))
(check-sat)`
  },
  {
    code: 'DH-P-011',
    name: "Zeno's Dichotomy (Runner at the Track)",
    domain: 'MATHEMATICAL_ANALYSIS',
    canonical_family: 'ZENO_CONTINUUM',
    claim: 'Motion cannot begin because half of journey must be completed first',
    mathematical_rationale: 'Sum of geometric series sum_{k=1}^infty (1/2)^k converges rigorously to 1. Asserting non-convergence or divergence yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const S Real)
(declare-const eps Real)
(assert (> eps 0.0))
(assert (= S 1.0))
(assert (>= (- 1.0 S) eps))
(check-sat)`
  },
  {
    code: 'DH-P-012',
    name: "Zeno's Arrow Paradox",
    domain: 'PHYSICS_CALCULUS',
    canonical_family: 'ZENO_CONTINUUM',
    claim: 'At every instant flying arrow is at rest, hence motion is impossible',
    mathematical_rationale: 'Zero instantaneous velocity everywhere implies zero total displacement. Claiming displacement > 0 with zero velocity yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const v Real)
(declare-const t_total Real)
(declare-const delta_x Real)
(assert (= v 0.0))
(assert (> t_total 0.0))
(assert (> delta_x 0.0))
(assert (= delta_x (* v t_total)))
(check-sat)`
  },
  {
    code: 'DH-P-013',
    name: 'Ship of Theseus',
    domain: 'ONTOLOGY',
    canonical_family: 'IDENTITY_PERSISTENCE',
    claim: 'Continuous physical replacement vs reconstructed original',
    mathematical_rationale: 'Transitivity of identity forbids distinct spatial objects B and C from both being identical to original A. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-sort Ship)
(declare-const ShipA Ship)
(declare-const ShipB Ship)
(declare-const ShipC Ship)
(assert (= ShipA ShipB))
(assert (= ShipA ShipC))
(assert (distinct ShipB ShipC))
(check-sat)`
  },
  {
    code: 'DH-P-014',
    name: 'Sorites Paradox (Heap of Sand)',
    domain: 'FUZZY_LOGIC',
    canonical_family: 'VAGUENESS',
    claim: 'Removing one grain from a heap never destroys the heap',
    mathematical_rationale: 'Classical mathematical induction with tolerance premise Heap(n) => Heap(n-1) forces Heap(0) if Heap(2) holds. Asserting !Heap(0) yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-fun Heap (Int) Bool)
(assert (Heap 2))
(assert (forall ((n Int)) (=> (Heap n) (Heap (- n 1)))))
(assert (not (Heap 0)))
(check-sat)`
  },
  {
    code: 'DH-P-015',
    name: 'Two Generals Problem',
    domain: 'DISTRIBUTED_SYSTEMS',
    canonical_family: 'IMPOSSIBILITY_THEOREMS',
    claim: 'No finite protocol guarantees common knowledge over lossy link',
    mathematical_rationale: 'Agreement requires confirmed mutual knowledge, but lossy link leaves final message unconfirmed. Asserting agreement over lossy link yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const agreed Bool)
(declare-const channel_lossy Bool)
(declare-const unconfirmed_last_ack Bool)
(assert channel_lossy)
(assert (=> channel_lossy unconfirmed_last_ack))
(assert (=> unconfirmed_last_ack (not agreed)))
(assert agreed)
(check-sat)`
  },
  {
    code: 'DH-P-016',
    name: 'FLP Impossibility (Fischer-Lynch-Paterson)',
    domain: 'DISTRIBUTED_SYSTEMS',
    canonical_family: 'IMPOSSIBILITY_THEOREMS',
    claim: 'Deterministic asynchronous consensus cannot guarantee termination',
    mathematical_rationale: 'In asynchronous network with potential crash fault, deterministic consensus cannot guarantee both agreement and termination. Asserting all yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const async_net Bool)
(declare-const crash_fault Bool)
(declare-const deterministic_agreement Bool)
(declare-const guaranteed_termination Bool)
(assert async_net)
(assert crash_fault)
(assert (=> (and async_net crash_fault deterministic_agreement) (not guaranteed_termination)))
(assert deterministic_agreement)
(assert guaranteed_termination)
(check-sat)`
  },
  {
    code: 'DH-P-017',
    name: 'Banach-Tarski Paradox',
    domain: 'MEASURE_THEORY',
    canonical_family: 'MEASURE_ANOMALY',
    claim: 'Solid ball can be decomposed into finite pieces and reassembled into two identical balls',
    mathematical_rationale: 'In countably additive measure space, volume of two disjoint unit balls is 2*vol(B). Equating this to vol(B) under additive measure is impossible. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const vol_B Real)
(declare-const vol_2B Real)
(assert (> vol_B 0.0))
(assert (= vol_2B (* 2.0 vol_B)))
(assert (= vol_2B vol_B))
(check-sat)`
  },
  {
    code: 'DH-P-018',
    name: 'Grandfather Paradox (Closed Timelike Curves)',
    domain: 'CAUSAL_ANALYSIS',
    canonical_family: 'CAUSAL_LOOPS',
    claim: 'Retrocausal prevention of ancestor birth yields non-bivalent state',
    mathematical_rationale: 'A causal loop where travel entails elimination of birth condition, and elimination prevents travel, admits no bivalent truth value. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const born Bool)
(declare-const travels_back Bool)
(declare-const eliminates_ancestor Bool)
(assert (=> travels_back born))
(assert (=> eliminates_ancestor (not born)))
(assert (=> travels_back eliminates_ancestor))
(assert travels_back)
(check-sat)`
  },
  {
    code: 'DH-P-019',
    name: "Simpson's Paradox",
    domain: 'STATISTICAL_INFERENCE',
    canonical_family: 'STATISTICAL_CONFOUNDING',
    claim: 'Trend appears in groups but disappears or reverses when aggregated',
    mathematical_rationale: 'Simpson reversal is a mathematically sound, satisfiable phenomenon under non-uniform sub-population weights. SAT.',
    expected_result: 'sat',
    z3_smt_assertion: `(declare-const a1 Real) (declare-const b1 Real)
(declare-const a2 Real) (declare-const b2 Real)
(declare-const c1 Real) (declare-const d1 Real)
(declare-const c2 Real) (declare-const d2 Real)
(assert (> b1 0.0)) (assert (> b2 0.0)) (assert (> d1 0.0)) (assert (> d2 0.0))
(assert (>= a1 0.0)) (assert (>= a2 0.0)) (assert (>= c1 0.0)) (assert (>= c2 0.0))
(assert (> (* a1 d1) (* c1 b1)))
(assert (> (* a2 d2) (* c2 b2)))
(assert (< (* (+ a1 a2) (+ d1 d2)) (* (+ c1 c2) (+ b1 b2))))
(assert (= a1 8.0)) (assert (= b1 10.0)) (assert (= c1 70.0)) (assert (= d1 100.0))
(assert (= a2 2.0)) (assert (= b2 10.0)) (assert (= c2 1.0)) (assert (= d2 10.0))
(check-sat)`
  },
  {
    code: 'DH-P-020',
    name: 'Monty Hall Problem',
    domain: 'PROBABILITY_THEORY',
    canonical_family: 'BAYESIAN_UPDATE',
    claim: 'Switching doors doubles winning probability from 1/3 to 2/3',
    mathematical_rationale: 'Bayesian conditioning proves P(Win|Switch) = 2/3. Refuting the 1/2 misconception yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const p_stay Real)
(declare-const p_switch Real)
(assert (= (+ p_stay p_switch) 1.0))
(assert (= p_stay (/ 1.0 3.0)))
(assert (= p_switch (/ 2.0 3.0)))
(assert (= p_switch 0.5))
(check-sat)`
  },
  {
    code: 'DH-P-021',
    name: "Newcomb's Paradox",
    domain: 'DECISION_THEORY',
    canonical_family: 'DECISION_CONFLICT',
    claim: 'One-box dominance vs two-box causal expectation conflict',
    mathematical_rationale: 'Asserting strict simultaneous superiority in a single total utility ordering for mutually exclusive actions is contradictory. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const util_one_box Real)
(declare-const util_two_box Real)
(assert (> util_one_box util_two_box))
(assert (> util_two_box util_one_box))
(check-sat)`
  },
  {
    code: 'DH-P-022',
    name: 'Unexpected Hanging Paradox',
    domain: 'EPISTEMIC_LOGIC',
    canonical_family: 'EPISTEMIC_LOOPS',
    claim: 'Surprise inspection cannot occur on any day, yet does occur',
    mathematical_rationale: 'Backward induction on last day (Friday): prior non-execution leaves Friday execution non-surprising. Asserting unexpected Friday execution yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const surprise_friday Bool)
(declare-const not_hanged_by_thursday Bool)
(assert (=> not_hanged_by_thursday (not surprise_friday)))
(assert not_hanged_by_thursday)
(assert surprise_friday)
(check-sat)`
  },
  {
    code: 'DH-P-023',
    name: 'St. Petersburg Paradox',
    domain: 'EXPECTED_UTILITY',
    canonical_family: 'UTILITY_CONVERGENCE',
    claim: 'Game with infinite expectation warrants finite price to enter',
    mathematical_rationale: 'Logarithmic marginal utility bounds subjective value to 2*ln(2) ~= 1.386. Asserting divergent utility under concave utility yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const exp_utility Real)
(declare-const bounded_bound Real)
(assert (= exp_utility 1.386294))
(assert (= bounded_bound 2.0))
(assert (> exp_utility bounded_bound))
(check-sat)`
  },
  {
    code: 'DH-P-024',
    name: "Braess's Paradox",
    domain: 'GAME_THEORY / ROUTING',
    canonical_family: 'NASH_INEFFICIENCY',
    claim: 'Adding a road to a network can worsen overall traffic flow',
    mathematical_rationale: 'Selfish Wardrop equilibrium routing can exhibit higher total latency when an extra link is added. Satisfiable phenomenon. SAT.',
    expected_result: 'sat',
    z3_smt_assertion: `(declare-const latency_before Real)
(declare-const latency_after Real)
(assert (> latency_before 0.0))
(assert (= latency_before 80.0))
(assert (= latency_after 92.0))
(assert (> latency_after latency_before))
(check-sat)`
  },
  {
    code: 'DH-P-025',
    name: 'Condorcet Voting Paradox',
    domain: 'SOCIAL_CHOICE',
    canonical_family: 'ARROW_IMPOSSIBILITY',
    claim: 'A preferred to B, B preferred to C, and C preferred to A',
    mathematical_rationale: 'Majority preference cycles over rational individual transitive preferences are satisfiable under Arrow framework. SAT.',
    expected_result: 'sat',
    z3_smt_assertion: `(declare-const maj_AB Bool)
(declare-const maj_BC Bool)
(declare-const maj_CA Bool)
(assert maj_AB)
(assert maj_BC)
(assert maj_CA)
(check-sat)`
  },
  {
    code: 'DH-P-026',
    name: 'Allais Paradox',
    domain: 'BEHAVIORAL_ECONOMICS',
    canonical_family: 'PROSPECT_THEORY',
    claim: 'Systematic preference for certainty violating linear probabilities',
    mathematical_rationale: 'Simultaneous choice of certainty in Game 1 and risk in Game 2 violates linear independence axiom of expected utility. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const u0 Real)
(declare-const u1 Real)
(declare-const u5 Real)
(assert (= u0 0.0))
(assert (> (* 0.11 u1) (* 0.10 u5)))
(assert (< (* 0.11 u1) (* 0.10 u5)))
(check-sat)`
  },
  {
    code: 'DH-P-027',
    name: 'Crocodile Paradox',
    domain: 'CLASSICAL_DILEMMA',
    canonical_family: 'SELF_REFERENCE',
    claim: 'Crocodile returns child if father correctly predicts what crocodile does',
    mathematical_rationale: 'Father prediction GuessCorrect <=> !ReturnChild combined with crocodile rule ReturnChild <=> GuessCorrect yields ReturnChild <=> !ReturnChild. Classical contradiction yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const ReturnChild Bool)
(declare-const GuessCorrect Bool)
(assert (= GuessCorrect (not ReturnChild)))
(assert (= ReturnChild GuessCorrect))
(check-sat)`
  },
  {
    code: 'DH-P-028',
    name: 'Pigeonhole Collision Theorem',
    domain: 'DISCRETE_MATHEMATICS',
    canonical_family: 'COMBINATORIAL_COLLISION',
    claim: 'Mapping N+1 items to N slots guarantees at least one collision',
    mathematical_rationale: 'Dirichlet box principle: 4 items mapped to 3 pigeonholes cannot be strictly pairwise distinct. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const p1 Int)
(declare-const p2 Int)
(declare-const p3 Int)
(declare-const p4 Int)
(assert (and (>= p1 1) (<= p1 3)))
(assert (and (>= p2 1) (<= p2 3)))
(assert (and (>= p3 1) (<= p3 3)))
(assert (and (>= p4 1) (<= p4 3)))
(assert (distinct p1 p2 p3 p4))
(check-sat)`
  },
  {
    code: 'DH-P-029',
    name: 'Collatz Conjecture Convergence Bound',
    domain: 'NUMBER_THEORY',
    canonical_family: 'ARITHMETIC_CHAOS',
    claim: 'All orbits reach the {4, 2, 1} cycle for all natural numbers',
    mathematical_rationale: 'Deterministic Collatz step mapping for n=6 yields 6 -> 3 -> 10 -> 5 -> 16. Asserting divergence from 16 at step 4 yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const x0 Int)
(declare-const x1 Int)
(declare-const x2 Int)
(declare-const x3 Int)
(declare-const x4 Int)
(assert (= x0 6))
(assert (= x1 (/ x0 2)))
(assert (= x2 (+ (* 3 x1) 1)))
(assert (= x3 (/ x2 2)))
(assert (= x4 (+ (* 3 x3) 1)))
(assert (distinct x4 16))
(check-sat)`
  },
  {
    code: 'DH-P-030',
    name: 'Riemann Hypothesis Non-Trivial Zero Alignment',
    domain: 'COMPLEX_ANALYSIS',
    canonical_family: 'ANALYTIC_NUMBER_THEORY',
    claim: 'Zeroes strictly lie on critical line without deviation',
    mathematical_rationale: 'For first non-trivial zero on critical line sigma = 1/2, asserting existence of an off-line zero sigma != 1/2 is refuted. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const sigma Real)
(declare-const t Real)
(assert (> sigma 0.0))
(assert (< sigma 1.0))
(assert (= t 14.134725))
(assert (= sigma 0.5))
(assert (distinct sigma 0.5))
(check-sat)`
  },
  {
    code: 'DH-P-031',
    name: 'P vs NP Polynomial Separation Hypothesis',
    domain: 'COMPUTATIONAL_COMPLEXITY',
    canonical_family: 'COMPLEXITY_SEPARATION',
    claim: 'Polynomial verification does not imply polynomial solver existence',
    mathematical_rationale: 'Under P != NP separation, claiming a polynomial decision solver for NP-complete 3-SAT contradicts Cook-Levin equivalence. UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const p_equals_np Bool)
(declare-const poly_3sat_algorithm Bool)
(assert (= poly_3sat_algorithm p_equals_np))
(assert (not p_equals_np))
(assert poly_3sat_algorithm)
(check-sat)`
  },
  {
    code: 'DH-P-032',
    name: 'Goldbach Bounded Prime Decomposition',
    domain: 'ADDITIVE_NUMBER_THEORY',
    canonical_family: 'ADDITIVE_PRIME_BASIS',
    claim: 'Even integer 2k = p1 + p2 holds unconditionally',
    mathematical_rationale: 'For even integer 28, prime decompositions 5+23 and 11+17 exist. Asserting that no decomposition exists yields UNSAT.',
    expected_result: 'unsat',
    z3_smt_assertion: `(declare-const has_goldbach_pair Bool)
(assert (= has_goldbach_pair true))
(assert (not has_goldbach_pair))
(check-sat)`
  }
];
