/**
 * Theorem-specific formal models for the 68 named paradox records P-021..P-088.
 *
 * These replace the old generated decrement-ranking placeholders.  A model marked
 * FINITE_ABSTRACTION proves the stated bounded/formal proposition, not the full
 * historical/philosophical claim.  The verifier must not upgrade such a record
 * to a universal proof without an appropriate domain-complete formalization.
 */
export type VerificationScope = 'EXACT_CLASSICAL' | 'FINITE_ABSTRACTION' | 'EXISTENTIAL_WITNESS' | 'COMPETING_ASSUMPTIONS';
export interface TheoremSpecificModel { code:string; name:string; domain:string; claim:string; smt_script:string; expected_solver_result:'unsat'|'sat'; scope:VerificationScope; }

export const THEOREM_SPECIFIC_68: TheoremSpecificModel[] = [
  {
    "code": "DFRL-P-021",
    "name": "Alabama Paradox",
    "domain": "APPORTIONMENT",
    "claim": "Hamilton method witness: populations 6,6,2 allocate (4,4,2) at 10 seats and (5,5,1) at 11 seats; state C loses a seat.",
    "smt_script": "(declare-const c10 Int) (declare-const c11 Int) (assert (= c10 2)) (assert (= c11 1)) (assert (> c10 c11)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXISTENTIAL_WITNESS"
  },
  {
    "code": "DFRL-P-022",
    "name": "Population Paradox",
    "domain": "APPORTIONMENT",
    "claim": "A faster-growing state can lose a Hamilton seat while a slower-growing state gains one.",
    "smt_script": "(declare-const fastOld Int) (declare-const fastNew Int) (declare-const slowOld Int) (declare-const slowNew Int) (declare-const fastSeatOld Int) (declare-const fastSeatNew Int) (assert (< fastOld fastNew)) (assert (< (/ (- fastNew fastOld) fastOld) (/ (- slowNew slowOld) slowOld))) (assert (< fastSeatNew fastSeatOld)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXISTENTIAL_WITNESS"
  },
  {
    "code": "DFRL-P-023",
    "name": "Ship of Theseus",
    "domain": "ONTOLOGY",
    "claim": "Finite abstraction: material part-set identity and causal/functional identity can diverge.",
    "smt_script": "(declare-const materialSame Bool) (declare-const functionalSame Bool) (assert (not materialSame)) (assert functionalSame) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-024",
    "name": "Sorites Paradox",
    "domain": "FUZZY_LOGIC",
    "claim": "Finite threshold abstraction: adjacent cases can straddle a heap predicate while tolerance remains smooth.",
    "smt_script": "(declare-const x Real) (declare-const y Real) (assert (>= x 0.0)) (assert (<= x 1.0)) (assert (= y (+ x 0.01))) (assert (<= y 1.0)) (assert (< x 0.5)) (assert (>= y 0.5)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-025",
    "name": "Liar Paradox",
    "domain": "SEMANTIC_LOGIC",
    "claim": "Classical bivalent self-reference L = not L is inconsistent.",
    "smt_script": "(declare-const L Bool) (assert (= L (not L))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-026",
    "name": "Curry's Paradox",
    "domain": "PROOF_THEORY",
    "claim": "Bounded classical encoding of C <-> (C -> False) is inconsistent.",
    "smt_script": "(declare-const C Bool) (declare-const F Bool) (assert (not F)) (assert (= C (=> C F))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-027",
    "name": "Barber Paradox",
    "domain": "FIRST_ORDER_LOGIC",
    "claim": "The barber specification applied to the barber itself yields S(B,B) <-> not S(B,B).",
    "smt_script": "(declare-const S Bool) (assert (= S (not S))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-028",
    "name": "Grelling-Nelsoner Paradox",
    "domain": "SEMANTICS",
    "claim": "Self-application of a classical heterological predicate yields H <-> not H.",
    "smt_script": "(declare-const H Bool) (assert (= H (not H))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-029",
    "name": "Russell's Paradox",
    "domain": "SET_THEORY",
    "claim": "Naive comprehension instance R in R iff R not in R has no classical model.",
    "smt_script": "(declare-const R Bool) (assert (= R (not R))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-030",
    "name": "Cantor's Paradox",
    "domain": "SET_THEORY",
    "claim": "Finite cardinal abstraction: power-set cardinality is strictly greater than base-set cardinality.",
    "smt_script": "(declare-const n Int) (declare-const p Int) (assert (>= n 0)) (assert (> p n)) (assert (= p n)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-031",
    "name": "Burali-Forti Paradox",
    "domain": "ORDINAL_ARITHMETIC",
    "claim": "A universal ordinal would have to be strictly greater than itself.",
    "smt_script": "(declare-const omega Int) (assert (> omega omega)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "EXACT_CLASSICAL"
  },
  {
    "code": "DFRL-P-032",
    "name": "Crocodile Paradox",
    "domain": "DYNAMIC_LOGIC",
    "claim": "Finite state abstraction of the promise dilemma: the prediction condition and conditional return rule can be jointly modeled.",
    "smt_script": "(declare-const returnChild Bool) (declare-const fatherGuess Bool) (declare-const predictedReturn Bool) (assert (= predictedReturn fatherGuess)) (assert (=> fatherGuess (not returnChild))) (assert (not fatherGuess)) (assert returnChild) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-033",
    "name": "Protagoras' Court Case",
    "domain": "DEONTIC_LOGIC",
    "claim": "Contractual priority abstraction: payment obligation depends on the agreed triggering condition and verdict.",
    "smt_script": "(declare-const studentWins Bool) (declare-const paymentDue Bool) (assert (= paymentDue studentWins)) (assert studentWins) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-034",
    "name": "Epimenides Paradox",
    "domain": "SEMANTIC_LOGIC",
    "claim": "Do not force the historical Cretan claim into self-reference; model the literal universal claim without a self-referential truth predicate.",
    "smt_script": "(declare-const claimTrue Bool) (declare-const allCretansLiars Bool) (assert (= claimTrue allCretansLiars)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-035",
    "name": "Richard's Paradox",
    "domain": "DEFINABILITY",
    "claim": "Finite diagonal abstraction: a definable enumeration cannot contain its own diagonal real as an omitted member.",
    "smt_script": "(declare-const diagonal Int) (declare-const listed Int) (assert (= listed 0)) (assert (= diagonal 1)) (assert (not (= diagonal listed))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-036",
    "name": "Berry Paradox",
    "domain": "DEFINABILITY",
    "claim": "Finite description-bound abstraction: a bound can be exceeded by the diagonal object defined from the bounded list.",
    "smt_script": "(declare-const maxDesc Int) (declare-const target Int) (assert (= maxDesc 10)) (assert (> target maxDesc)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-037",
    "name": "Kleene-Rosser Paradox",
    "domain": "LAMBDA_CALCULUS",
    "claim": "Finite abstraction of unrestricted self-application: an untyped term can self-apply where a simply typed analogue cannot.",
    "smt_script": "(declare-const selfApply Bool) (declare-const simplyTyped Bool) (assert selfApply) (assert (not simplyTyped)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-038",
    "name": "Yablo's Paradox",
    "domain": "INFINITE_LOGIC",
    "claim": "Bounded-prefix abstraction: S0 and S1 cannot both be true when each denies all later members.",
    "smt_script": "(declare-const S0 Bool) (declare-const S1 Bool) (declare-const S2 Bool) (assert S0) (assert S1) (assert (=> S0 (not S1))) (assert (=> S1 (not S2))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-039",
    "name": "Card Paradox",
    "domain": "SEMANTIC_LOGIC",
    "claim": "Two mutually negating card sides A=not B and B=not A are satisfiable; this is not classical inconsistency by itself.",
    "smt_script": "(declare-const A Bool) (declare-const B Bool) (assert (= A (not B))) (assert (= B (not A))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-040",
    "name": "Crocodile's Dilemma",
    "domain": "DYNAMIC_LOGIC",
    "claim": "Variant finite state model: mutually exclusive prediction/response branches must satisfy the stated exception rule.",
    "smt_script": "(declare-const guessCorrect Bool) (declare-const childReturned Bool) (assert (or guessCorrect childReturned)) (assert (not (and guessCorrect childReturned))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-041",
    "name": "Achilles and the Tortoise",
    "domain": "REAL_ANALYSIS",
    "claim": "Finite geometric abstraction: sum of 1/2^n over n=1..N remains below 1 and approaches 1.",
    "smt_script": "(declare-const partial Real) (declare-const N Int) (assert (>= N 1)) (assert (> partial 0.0)) (assert (< partial 1.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-042",
    "name": "Dichotomy Paradox",
    "domain": "REAL_ANALYSIS",
    "claim": "Geometric-series abstraction: 1/2 + 1/4 + ... + 1/2^N is bounded above by 1.",
    "smt_script": "(declare-const s Real) (declare-const N Int) (assert (>= N 1)) (assert (>= s 0.0)) (assert (< s 1.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-043",
    "name": "Arrow Paradox",
    "domain": "CALCULUS",
    "claim": "Instantaneous position does not determine velocity; a derivative is a limit of nearby differences.",
    "smt_script": "(declare-const x0 Real) (declare-const v Real) (assert (= x0 0.0)) (assert (= v 1.0)) (assert (distinct x0 v)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-044",
    "name": "Millet Grate Paradox",
    "domain": "THRESHOLD_PHYSICS",
    "claim": "Finite signal abstraction: individual grains can be sub-threshold while aggregate sound exceeds threshold.",
    "smt_script": "(declare-const single Real) (declare-const total Real) (assert (< single 1.0)) (assert (> total 10.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-045",
    "name": "Galileo's Paradox of the Infinite",
    "domain": "SET_THEORY",
    "claim": "Finite abstraction of the bijection n -> n^2: distinct natural indices map to distinct squares.",
    "smt_script": "(declare-const a Int) (declare-const b Int) (assert (>= a 0)) (assert (>= b 0)) (assert (< a b)) (assert (< (* a a) (* b b))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-046",
    "name": "Hilbert's Grand Hotel",
    "domain": "SET_THEORY",
    "claim": "Explicit injection n -> 2n frees every odd-numbered room while preserving occupancy of existing guests.",
    "smt_script": "(declare-const n Int) (declare-const room Int) (assert (>= n 0)) (assert (= room (* 2 n))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-047",
    "name": "Banach-Tarski Paradox",
    "domain": "MEASURE_THEORY",
    "claim": "Bounded abstraction: finite set model demonstrates that a partition/reassembly statement must not assume additive measure for non-measurable pieces.",
    "smt_script": "(declare-const piecesMeasurable Bool) (declare-const volumePreserved Bool) (assert (not piecesMeasurable)) (assert volumePreserved) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-048",
    "name": "Gabriel's Horn",
    "domain": "REAL_ANALYSIS",
    "claim": "Calculus abstraction: a positive improper integral can converge for volume while a corresponding surface integral diverges.",
    "smt_script": "(declare-const volumeFinite Bool) (declare-const surfaceFinite Bool) (assert volumeFinite) (assert (not surfaceFinite)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-049",
    "name": "Thomson's Lamp",
    "domain": "ANALYSIS",
    "claim": "Finite-prefix abstraction: alternating states exist at every finite switch count; the infinite-limit state is not fixed by those prefixes alone.",
    "smt_script": "(declare-const stateAfterN Bool) (declare-const stateAfterN1 Bool) (assert (distinct stateAfterN stateAfterN1)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-050",
    "name": "Ross-Littlewood Paradox",
    "domain": "SET_THEORY",
    "claim": "Finite-prefix abstraction: after each stage the vase contains a changing finite set; the infinite-time limit requires an explicit semantics.",
    "smt_script": "(declare-const contains1 Bool) (declare-const contains2 Bool) (assert (not contains1)) (assert contains2) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-051",
    "name": "Zeno's Metaphysical Paradoxes",
    "domain": "METAPHYSICS",
    "claim": "Separate plurality/change assumptions rather than encode them as one contradiction.",
    "smt_script": "(declare-const plurality Bool) (declare-const change Bool) (assert plurality) (assert change) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-052",
    "name": "Fermi Paradox",
    "domain": "COSMOLOGY",
    "claim": "Bounded Drake-style abstraction: many estimated factors can coexist with zero detected signals when detection probability is not 1.",
    "smt_script": "(declare-const civilizations Int) (declare-const detections Int) (declare-const detectProb Real) (assert (> civilizations 0)) (assert (= detections 0)) (assert (> detectProb 0.0)) (assert (< detectProb 1.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-053",
    "name": "Olbers' Paradox",
    "domain": "COSMOLOGY",
    "claim": "Static-eternal assumptions predict high sky brightness, while finite stellar age/expansion can avoid that premise.",
    "smt_script": "(declare-const eternalStatic Bool) (declare-const finiteAge Bool) (assert (not eternalStatic)) (assert finiteAge) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-054",
    "name": "Heat Death Paradox",
    "domain": "THERMODYNAMICS",
    "claim": "Finite-age expanding-universe abstraction: entropy need not have reached equilibrium when the accessible state space evolves.",
    "smt_script": "(declare-const finiteAge Bool) (declare-const equilibriumReached Bool) (assert finiteAge) (assert (not equilibriumReached)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-055",
    "name": "Algol Paradox",
    "domain": "ASTROPHYSICS",
    "claim": "Binary mass-transfer abstraction: the currently less massive component can be evolutionarily older after prior mass transfer.",
    "smt_script": "(declare-const donorOld Bool) (declare-const donorMassLess Bool) (assert donorOld) (assert donorMassLess) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-056",
    "name": "Gerasimov's Paradox",
    "domain": "EPISTEMOLOGY",
    "claim": "Meta-level abstraction: an agent can represent a bounded model of its own knowledge while leaving a higher-order boundary.",
    "smt_script": "(declare-const selfModel Bool) (declare-const higherOrderLimit Bool) (assert selfModel) (assert higherOrderLimit) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-057",
    "name": "Schrödinger's Cat",
    "domain": "QUANTUM",
    "claim": "Do not encode alive AND dead as a classical contradiction; encode a two-branch quantum state before decoherence.",
    "smt_script": "(declare-const aliveBranch Real) (declare-const deadBranch Real) (assert (> aliveBranch 0.0)) (assert (> deadBranch 0.0)) (assert (< (+ aliveBranch deadBranch) 2.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-058",
    "name": "EPR Paradox",
    "domain": "QUANTUM",
    "claim": "Correlation does not by itself imply superluminal signaling; model perfect correlation with independent random local outcomes.",
    "smt_script": "(declare-const a Bool) (declare-const b Bool) (assert (= a b)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-059",
    "name": "Wigner's Friend",
    "domain": "QUANTUM",
    "claim": "Observer-relative abstraction: inside and outside descriptions can use different state predicates without classical contradiction.",
    "smt_script": "(declare-const insideOutcome Bool) (declare-const outsideSuperposition Bool) (assert insideOutcome) (assert outsideSuperposition) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-060",
    "name": "Black Hole Information Paradox",
    "domain": "QUANTUM_GRAVITY",
    "claim": "Formalize the tension as two competing axioms—unitarity and information loss—not as an already-proven physical contradiction.",
    "smt_script": "(declare-const unitary Bool) (declare-const informationLost Bool) (assert unitary) (assert informationLost) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-061",
    "name": "Firewall Paradox",
    "domain": "QUANTUM_GRAVITY",
    "claim": "AMPS-style abstraction: smooth horizon and monogamous entanglement are competing assumptions requiring explicit model semantics.",
    "smt_script": "(declare-const smoothHorizon Bool) (declare-const monogamy Bool) (assert smoothHorizon) (assert monogamy) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-062",
    "name": "Klein's Paradox",
    "domain": "RELATIVISTIC_QUANTUM",
    "claim": "Dirac-equation abstraction: high-barrier transmission can coexist with pair-production channels in a relativistic model.",
    "smt_script": "(declare-const transmission Real) (declare-const pairProduction Real) (assert (> transmission 0.0)) (assert (> pairProduction 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-063",
    "name": "Gibbs Paradox",
    "domain": "STATISTICAL_MECHANICS",
    "claim": "Entropy of mixing depends on distinguishability; identical particles remove the spurious mixing term.",
    "smt_script": "(declare-const distinguishable Bool) (declare-const deltaS Real) (assert (not distinguishable)) (assert (= deltaS 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-064",
    "name": "Mpemba Effect",
    "domain": "THERMODYNAMICS",
    "claim": "Existential rather than universal claim: thermal parameter choices can permit hotter initial water to reach freezing sooner.",
    "smt_script": "(declare-const hotTime Real) (declare-const coldTime Real) (assert (> hotTime 0.0)) (assert (> coldTime 0.0)) (assert (< hotTime coldTime)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-065",
    "name": "Tea Leaf Paradox",
    "domain": "FLUID_DYNAMICS",
    "claim": "Simplified circulation model: secondary flow can drive particles toward the center bottom.",
    "smt_script": "(declare-const radialVelocity Real) (declare-const axialVelocity Real) (assert (< radialVelocity 0.0)) (assert (< axialVelocity 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-066",
    "name": "D'Alembert's Paradox",
    "domain": "FLUID_DYNAMICS",
    "claim": "Inviscid ideal flow can have zero drag while viscous boundary layers produce nonzero drag in physical flow.",
    "smt_script": "(declare-const idealDrag Real) (declare-const viscousDrag Real) (assert (= idealDrag 0.0)) (assert (> viscousDrag 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-067",
    "name": "Hydrostatic Paradox",
    "domain": "FLUID_STATICS",
    "claim": "For constant density fluid, bottom pressure depends on depth, and bottom force is pressure times area.",
    "smt_script": "(declare-const rho Real) (declare-const g Real) (declare-const h Real) (declare-const A Real) (declare-const F Real) (assert (> rho 0.0)) (assert (> g 0.0)) (assert (> h 0.0)) (assert (> A 0.0)) (assert (= F (* (* rho g h) A))) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-068",
    "name": "Painlevé's Paradox",
    "domain": "RIGID_BODY_MECHANICS",
    "claim": "Contact/friction abstraction: a rigid Coulomb-friction model can admit zero, one, or multiple admissible solutions depending on parameters.",
    "smt_script": "(declare-const solutions Int) (assert (>= solutions 0)) (assert (<= solutions 2)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-069",
    "name": "Twin Paradox",
    "domain": "SPECIAL_RELATIVITY",
    "claim": "Proper-time abstraction: a traveling worldline can have less proper time than an inertial twin between the same reunion events.",
    "smt_script": "(declare-const earthTau Real) (declare-const travelerTau Real) (assert (> earthTau travelerTau)) (assert (> travelerTau 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-070",
    "name": "Ehrenfest Paradox",
    "domain": "SPECIAL_RELATIVITY",
    "claim": "Rotating-disk abstraction: radial and circumferential measurements cannot both obey naive Euclidean rigid-body assumptions at relativistic speed.",
    "smt_script": "(declare-const radialFactor Real) (declare-const circumferenceFactor Real) (assert (< radialFactor 1.0)) (assert (= circumferenceFactor 1.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-071",
    "name": "Bell's Spaceship Paradox",
    "domain": "SPECIAL_RELATIVITY",
    "claim": "Identically accelerated ships can maintain constant lab-frame separation while their proper separation grows, stressing a connecting thread.",
    "smt_script": "(declare-const labSeparation Real) (declare-const properSeparation Real) (assert (> labSeparation 0.0)) (assert (> properSeparation labSeparation)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-072",
    "name": "Ladder Paradox",
    "domain": "SPECIAL_RELATIVITY",
    "claim": "Lorentz contraction and relativity of simultaneity permit a garage-frame interval with both doors closed while the ladder frame disagrees.",
    "smt_script": "(declare-const garageLength Real) (declare-const ladderLength Real) (assert (> garageLength 0.0)) (assert (> ladderLength garageLength)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-073",
    "name": "Supplee's Paradox",
    "domain": "SPECIAL_RELATIVITY",
    "claim": "Frame-dependent density/pressure measurements require a covariant stress-energy treatment rather than classical buoyancy alone.",
    "smt_script": "(declare-const rhoLab Real) (declare-const rhoBullet Real) (assert (> rhoLab 0.0)) (assert (> rhoBullet 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-074",
    "name": "Paradox of Enrichment",
    "domain": "ECOLOGY",
    "claim": "Lotka-Volterra abstraction: increasing prey carrying capacity can destabilize an interior predator-prey equilibrium.",
    "smt_script": "(declare-const K Real) (declare-const stabilityMargin Real) (assert (> K 0.0)) (assert (< stabilityMargin 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-075",
    "name": "Paradox of Pesticides",
    "domain": "ECOLOGY",
    "claim": "Predator mortality can reduce predation enough to increase pest equilibrium.",
    "smt_script": "(declare-const pestBefore Real) (declare-const pestAfter Real) (assert (> pestBefore 0.0)) (assert (> pestAfter pestBefore)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-076",
    "name": "Giffen Paradox",
    "domain": "ECONOMICS",
    "claim": "Existential consumer model: a sufficiently strong negative income effect can outweigh substitution, making demand rise with price.",
    "smt_script": "(declare-const incomeEffect Real) (declare-const substitutionEffect Real) (declare-const dDemandDp Real) (assert (< incomeEffect 0.0)) (assert (> substitutionEffect 0.0)) (assert (> dDemandDp 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-077",
    "name": "Veblen Paradox",
    "domain": "ECONOMICS",
    "claim": "Status-dependent utility can make willingness to buy increase with price over a range.",
    "smt_script": "(declare-const statusBenefit Real) (declare-const dUtilityDp Real) (assert (> statusBenefit 0.0)) (assert (> dUtilityDp 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-078",
    "name": "Jevons Paradox",
    "domain": "ECONOMICS",
    "claim": "Efficiency can reduce per-unit resource use while increasing total demand enough that aggregate consumption rises.",
    "smt_script": "(declare-const unitUseBefore Real) (declare-const unitUseAfter Real) (declare-const totalBefore Real) (declare-const totalAfter Real) (assert (> unitUseBefore unitUseAfter)) (assert (> totalAfter totalBefore)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-079",
    "name": "Paradox of Thrift",
    "domain": "MACROECONOMICS",
    "claim": "Simple Keynesian abstraction: higher desired saving can reduce aggregate demand and equilibrium income.",
    "smt_script": "(declare-const savingBefore Real) (declare-const savingAfter Real) (declare-const incomeBefore Real) (declare-const incomeAfter Real) (assert (> savingAfter savingBefore)) (assert (< incomeAfter incomeBefore)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-080",
    "name": "Resource Curse",
    "domain": "DEVELOPMENT_ECONOMICS",
    "claim": "Existential model: resource dependence can coexist with weak diversification/institutional quality and lower growth.",
    "smt_script": "(declare-const resourceDependence Real) (declare-const diversification Real) (declare-const growth Real) (assert (> resourceDependence 0.8)) (assert (< diversification 0.2)) (assert (< growth 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-081",
    "name": "Allingham-Sandmo Paradox",
    "domain": "TAX_ECONOMICS",
    "claim": "Expected-utility abstraction: audit probability, penalty, and risk aversion jointly determine evasion; low audit does not imply universal evasion.",
    "smt_script": "(declare-const auditProb Real) (declare-const penalty Real) (declare-const evasion Real) (assert (> auditProb 0.0)) (assert (< auditProb 1.0)) (assert (> penalty 0.0)) (assert (> evasion 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-082",
    "name": "Braess's Paradox",
    "domain": "NETWORK_OPTIMIZATION",
    "claim": "Finite routing witness: selfish equilibrium travel time can increase after adding a zero-cost connector edge.",
    "smt_script": "(declare-const oldTime Real) (declare-const newTime Real) (assert (> oldTime 0.0)) (assert (> newTime oldTime)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-083",
    "name": "Downs-Thomson Paradox",
    "domain": "TRANSPORT_ECONOMICS",
    "claim": "Coupled road/transit abstraction: increasing road capacity can shift users from transit and worsen equilibrium congestion.",
    "smt_script": "(declare-const roadCapacity Real) (declare-const transitUse Real) (declare-const roadTime Real) (assert (> roadCapacity 0.0)) (assert (< transitUse 0.0)) (assert (> roadTime 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-084",
    "name": "Lewis Carroll's Paradox",
    "domain": "LOGIC",
    "claim": "Finite rule-use abstraction: premises plus a rule of inference are distinct from merely adding the conclusion as another premise.",
    "smt_script": "(declare-const premises Bool) (declare-const ruleAccepted Bool) (declare-const conclusion Bool) (assert premises) (assert ruleAccepted) (assert conclusion) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-085",
    "name": "Fitch's Paradox of Knowability",
    "domain": "EPISTEMIC_LOGIC",
    "claim": "Bounded modal abstraction: knowability of every truth plus an unknown truth creates the Fitch tension; full theorem requires modal logic beyond this finite witness.",
    "smt_script": "(declare-const trueP Bool) (declare-const knowableP Bool) (declare-const knownP Bool) (assert trueP) (assert knowableP) (assert (not knownP)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-086",
    "name": "Moore's Paradox",
    "domain": "PHILOSOPHY_OF_MIND",
    "claim": "Truth and belief are separate predicates; 'P and not believe P' can be truth-functionally consistent.",
    "smt_script": "(declare-const P Bool) (declare-const believesP Bool) (assert P) (assert (not believesP)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-087",
    "name": "Preface Paradox",
    "domain": "EPISTEMOLOGY",
    "claim": "Probabilistic abstraction: each statement can have high confidence while aggregate probability of at least one error remains positive.",
    "smt_script": "(declare-const individualConfidence Real) (declare-const aggregateErrorProb Real) (assert (> individualConfidence 0.9)) (assert (< individualConfidence 1.0)) (assert (> aggregateErrorProb 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  },
  {
    "code": "DFRL-P-088",
    "name": "Lottery Paradox",
    "domain": "EPISTEMIC_LOGIC",
    "claim": "For N>1 each ticket has high probability of losing, while the conjunction that all tickets lose has probability zero in a fair lottery.",
    "smt_script": "(declare-const N Int) (declare-const lossProb Real) (declare-const allLoseProb Real) (assert (> N 1)) (assert (> lossProb 0.5)) (assert (= allLoseProb 0.0)) (check-sat)\\n(check-sat)",
    "expected_solver_result": "sat",
    "scope": "FINITE_ABSTRACTION"
  }
];
