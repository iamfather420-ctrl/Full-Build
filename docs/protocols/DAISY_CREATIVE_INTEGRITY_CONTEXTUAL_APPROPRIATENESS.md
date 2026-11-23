# Daisy Creative Integrity & Contextual Appropriateness Protocol (CICAP)
Version 1.0.0

CICAP constrains creative output by task relevance, contextual appropriateness, safety, evidence integrity, and explicit authorization. It supports GENERATIVE, EXPLORATORY, ANALYTICAL, SYNTHETIC, SIMULATIVE, and EXECUTABLE modes, with VERIFIED, PROPOSED, HYPOTHESIS, SIMULATED, and UNVERIFIED labels.

All four assessments must PASS to release output. FAIL blocks. UNKNOWN requires review and must not silently pass. VERIFIED requires evidence references. SIMULATED must be explicitly declared and cannot claim real execution. Execution, testing, and deployment claims require matching evidence. EXECUTABLE work requires explicit authorization.

The deterministic evaluator is a policy boundary, not a semantic classifier. The caller must supply assessments from a trusted evaluator. This implementation wires the policy into Daisy's native system-tool boundary; it does not claim all Daisy chat, UI, or external service output paths are intercepted. The native tool adapters currently contain static demonstration results; CICAP does not turn those into real system operations.
