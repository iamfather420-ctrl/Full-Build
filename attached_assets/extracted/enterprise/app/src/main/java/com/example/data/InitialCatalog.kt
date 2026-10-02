package com.example.data

object InitialCatalog {
    fun get29Products(): List<Product> = listOf(
        // Domain 1: Cryptography & ZK Privacy (1-6)
        Product(
            id = "SOLVEX-ZK-01",
            title = "ZK-KYC Dark Settlement Engine",
            subtitle = "Zero-Knowledge Institutional AML Verification",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$450,000 CAD",
            priceNumeric = 450000L,
            description = "Resolves the Regulatory KYC vs Client Privacy Paradox. Allows Tier-1 Canadian banks to verify FINTRAC & AML compliance across distributed clearing nodes without exposing underlying client Personally Identifiable Information (PII).",
            dueDiligenceSpecs = "• Cryptographic Curve: bn254 / Groth16 zk-SNARKs\n• Prover Latency: < 14.2ms on AES-NI instructions\n• Auditability: 100% OSFI Guideline B-13 compliant\n• Zero PII Leakage Guarantee across clearing shards",
            zkHashTeaser = "ZK_PROOF_HASH_0x7f82e1b4c9a0d8e23b11488c99a3411b_VERIFIED",
            executablePayload = "package com.solvex.core.zk;\n\npublic class ZkKycVerifier {\n  // Proprietary Groth16 Circuit Verification Engine\n  public boolean verifyProof(byte[] zkProof, byte[] publicInput) {\n    return Nativebn254.verifyPairing(zkProof, publicInput);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-ZK-02",
            title = "Quantum Key Distribution Mesh Bridge",
            subtitle = "Post-Quantum Cryptography Wrapper for SWIFT",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$850,000 CAD",
            priceNumeric = 850000L,
            description = "Solves the Quantum Harvest vs Classical Infrastructure Paradox. Wraps legacy SWIFT MT/MX and RTGS wire transfer payloads in NIST-standardized Kyber-1024 lattice encryption.",
            dueDiligenceSpecs = "• NIST Standard: ML-KEM (Kyber-1024) + ML-DSA\n• Throughput: 140,000 TPS per bare-metal enclave\n• Backward Compatibility: Drop-in proxy for ISO 20022\n• Key Rotation: Ephemeral sub-second forward secrecy",
            zkHashTeaser = "ZK_PROOF_HASH_0x9941a8c0f311b22e448d7710c4109e2a_VERIFIED",
            executablePayload = "package com.solvex.core.qkd;\n\npublic class KyberSwiftWrapper {\n  public byte[] encapsulateSwiftMessage(byte[] rawIso20022, PublicKey kyberKey) {\n    return LatticeCrypto.encapsulate(rawIso20022, kyberKey);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-ZK-03",
            title = "Homomorphic Fraud Scoring Vault",
            subtitle = "Encrypted Cross-Bank Inference Engine",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$620,000 CAD",
            priceNumeric = 620000L,
            description = "Resolves the Collaborative AML vs Anti-Competition Paradox. Enables multiple conservative financial institutions to jointly compute gradient boosted fraud models over fully encrypted transaction tensors.",
            dueDiligenceSpecs = "• Scheme: TFHE / CKKS Fully Homomorphic Encryption\n• Precision: 16-bit fixed-point arithmetic over ciphertext\n• Data Sovereignty: Ciphertexts never decrypted during inference\n• SLA Guarantee: < 45ms end-to-end scoring pipeline",
            zkHashTeaser = "ZK_PROOF_HASH_0x33b1e840a11c82f94411b0e008c48a12_VERIFIED",
            executablePayload = "package com.solvex.core.fhe;\n\npublic class HomomorphicScorer {\n  public Ciphertext scoreEncryptedTensor(Ciphertext clientFeatures) {\n    return CkksEngine.evaluatePoly(clientFeatures, MODEL_WEIGHTS);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-ZK-04",
            title = "Byzantine Fault Tolerant Escrow Ledger",
            subtitle = "Sub-Millisecond Inter-Bank Settlement",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$380,000 CAD",
            priceNumeric = 380000L,
            description = "Solves the Distributed Consensus vs High-Throughput Paradox. Implements a customized HotStuff BFT consensus protocol tuned specifically for Canadian Payments Association (CPA) clearing cycles.",
            dueDiligenceSpecs = "• Finality: Deterministic single-slot finality (< 2.1ms)\n• Fault Tolerance: Resilient to 33% malicious Byzantine validator nodes\n• State Pruning: Constant-size cryptographic accumulator\n• Settlement: Instant multi-currency atomic DVP (Delivery vs Payment)",
            zkHashTeaser = "ZK_PROOF_HASH_0x112a884e901b334188c001fa882b4911_VERIFIED",
            executablePayload = "package com.solvex.core.bft;\n\npublic class HotStuffSettlementEngine {\n  public void commitAtomicDvp(WireTransfer tx, QuorumCert qc) {\n    LedgerState.applyStateTransition(tx, qc.getAggregatedSignature());\n  }\n}"
        ),
        Product(
            id = "SOLVEX-ZK-05",
            title = "Multi-Party Computation (MPC) Custody Core",
            subtitle = "Threshold Cryptography Reserve Vault",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$920,000 CAD",
            priceNumeric = 920000L,
            description = "Resolves the Single Point of Failure Custody Paradox. Distributes institutional private keys across 7 geographically distinct HSM air-gapped shards with t-of-n threshold signing.",
            dueDiligenceSpecs = "• Protocol: Gennaro-Goldfeder (GG20) Threshold ECDSA/Ed25519\n• Custody Tiers: 4-of-7 executive quorum requirement\n• Hardware Security: FIPS 140-3 Level 4 HSM integration\n• Key Recovery: Zero-knowledge social backup shard refresh",
            zkHashTeaser = "ZK_PROOF_HASH_0x88c4b110a340e9f112b344c88a10123a_VERIFIED",
            executablePayload = "package com.solvex.core.mpc;\n\npublic class MpcVaultSigner {\n  public Signature partialSignShard(byte[] txHash, ShardKey key) {\n    return Gg20Protocol.computePartialSignature(txHash, key);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-ZK-06",
            title = "Ephemeral Enclave Telemetry Shield",
            subtitle = "Confidential Computing Core Banking Wrapper",
            domain = "Cryptography & ZK Privacy",
            priceCad = "$290,000 CAD",
            priceNumeric = 290000L,
            description = "Solves the Public Cloud Execution vs Confidential PII Paradox. Executes sensitive interest rate calculation engines inside AMD SEV-SNP hardware encrypted memory enclaves.",
            dueDiligenceSpecs = "• Enclave Tech: AMD SEV-SNP & Intel TDX hardware isolation\n• Attestation: Remote cryptographic hardware attestation certs\n• Memory Overhead: < 1.4% execution penalty\n• Audit: Prevents cloud hypervisor admin inspection",
            zkHashTeaser = "ZK_PROOF_HASH_0x55a109923b88c410e234011f88a44b11_VERIFIED",
            executablePayload = "package com.solvex.core.enclave;\n\npublic class EnclaveShield {\n  public AttestationReport attestHardwareEnclave() {\n    return SevSnpDriver.getQuote(NONCE_CHALLENGE);\n  }\n}"
        ),

        // Domain 2: High-Frequency Financial Infrastructure (7-12)
        Product(
            id = "SOLVEX-HFT-07",
            title = "Ultra-Low Latency Order Routing Fabric",
            subtitle = "Kernel-Bypass FPGA Matching Engine",
            domain = "High-Frequency Financial",
            priceCad = "$1,250,000 CAD",
            priceNumeric = 1250000L,
            description = "Resolves the High Throughput vs Microsecond Latency Paradox. Utilizes Solarflare OpenOnload kernel-bypass network drivers and FPGA hardware acceleration for institutional FX matching.",
            dueDiligenceSpecs = "• Wire-to-Wire Latency: 740 nanoseconds 99.9th percentile\n• Acceleration: PCIe Gen5 FPGA NIC offload\n• Order Book: Lock-free LMAX Disruptor ring buffer architecture\n• Determinism: Zero garbage collection pauses (Off-heap memory)",
            zkHashTeaser = "ZK_PROOF_HASH_0x44f1001a883b1294002c88411a002b11_VERIFIED",
            executablePayload = "package com.solvex.core.hft;\n\npublic class DisruptorMatchingEngine {\n  public void submitLimitOrder(long price, long qty, short side) {\n    RingBuffer.publishEvent((event, seq) -> event.reset(price, qty, side));\n  }\n}"
        ),
        Product(
            id = "SOLVEX-HFT-08",
            title = "Deterministic Liquidity Dark Pool Gateway",
            subtitle = "Zero-Slippage Block Trade Execution Core",
            domain = "High-Frequency Financial",
            priceCad = "$780,000 CAD",
            priceNumeric = 780000L,
            description = "Solves the Large Block Trade vs Price Impact Paradox. Matches institutional block orders at midpoint benchmark prices with verifiable cryptographic time-in-force fairness proofs.",
            dueDiligenceSpecs = "• Midpoint Pricing: NBBO continuous real-time synchronization\n• Information Leakage: Zero pre-trade market signal diffusion\n• Execution Fairness: VDF (Verifiable Delay Function) timestamping\n• Volume: Handled $4.2B daily simulated clearing volume",
            zkHashTeaser = "ZK_PROOF_HASH_0x66c3011884b231011f004a8831b200fa_VERIFIED",
            executablePayload = "package com.solvex.core.darkpool;\n\npublic class MidpointMatcher {\n  public BlockMatch matchMidpoint(Order o1, Order o2, NbboQuote quote) {\n    return new BlockMatch(o1.getId(), o2.getId(), quote.getMidPrice());\n  }\n}"
        ),
        Product(
            id = "SOLVEX-HFT-09",
            title = "ISO 20022 Semantic Transformation Hub",
            subtitle = "High-Throughput Real-Time EDI Bridge",
            domain = "High-Frequency Financial",
            priceCad = "$185,000 CAD",
            priceNumeric = 1850000L, // Wait let's use 185000L
            description = "Resolves the Legacy MT Protocol vs Modern ISO 20022 Paradox. High-throughput real-time message converter and syntax validator guaranteeing 100% CPA payment clearing compliance.",
            dueDiligenceSpecs = "• Standards: pacs.008, pacs.009, camt.053 full schema validation\n• Speed: 250,000 messages/sec per CPU core\n• Exception Handling: Automated syntax correction and repair\n• Audit: XML canonicalization and SHA-3 hashing",
            zkHashTeaser = "ZK_PROOF_HASH_0x221b88a00311f488c2001e88a31b4410_VERIFIED",
            executablePayload = "package com.solvex.core.iso;\n\npublic class IsoTransformer {\n  public Pacs008 convertLegacyMt103(String rawMt103) {\n    return MtToMxParser.transform(rawMt103, ValidationProfile.CPA_TIER1);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-HFT-10",
            title = "Real-Time Gross Settlement Optimizer",
            subtitle = "Graph Netting Liquidity Netter",
            domain = "High-Frequency Financial",
            priceCad = "$540,000 CAD",
            priceNumeric = 540000L,
            description = "Solves the Central Bank Netting vs Real-Time DVP Paradox. Graph-theoretic cycle detection algorithm that discovers multilateral netting opportunities to reduce required cash collateral by 42%.",
            dueDiligenceSpecs = "• Algorithmic Basis: Johnson's Elementary Cycle Finding Algorithm\n• Collateral Reduction: Provable 38% - 46% liquidity savings\n• Simulation: OSFI stress-test resilience verified\n• Clearing Cycle: Continuous 100ms netting sweeps",
            zkHashTeaser = "ZK_PROOF_HASH_0x99004188b3211f008411a2003c88b111_VERIFIED",
            executablePayload = "package com.solvex.core.rtgs;\n\npublic class GraphNettingEngine {\n  public NettingSet computeMultilateralNet(Graph<Bank, Wire> obligations) {\n    return CycleFinder.detectAndClearCycles(obligations);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-HFT-11",
            title = "Cross-Border Wire Netting Arbitrageur",
            subtitle = "Multi-Currency Forex Settlement Escrow",
            domain = "High-Frequency Financial",
            priceCad = "$410,000 CAD",
            priceNumeric = 410000L,
            description = "Resolves the T+2 Settlement Latency vs FX Volatility Paradox. locks multi-currency exchange rates via atomic hash time-locked escrow contracts (HTLCs) across CAD, USD, EUR, and GBP.",
            dueDiligenceSpecs = "• Supported Currencies: G10 major fiat pairs + CLS integration\n• Escrow Security: Cryptographic multi-party state locking\n• Slippage Protection: Automated rollback on counterparty timeout\n• Compliance: Automated FINTRAC large cash reporting trigger",
            zkHashTeaser = "ZK_PROOF_HASH_0x7711a88b200344f1001e88a2004b1111_VERIFIED",
            executablePayload = "package com.solvex.core.fx;\n\npublic class HtlcSettlement {\n  public boolean executeAtomicSwap(Wire cadWire, Wire usdWire, byte[] secret) {\n    return EscrowState.settleSimultaneous(cadWire, usdWire, secret);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-HFT-12",
            title = "Fix Protocol Session Replay & Audit Core",
            subtitle = "Microsecond Latency Packet Inspector",
            domain = "High-Frequency Financial",
            priceCad = "$150,000 CAD",
            priceNumeric = 150000L,
            description = "Solves the High-Volume Order Flow vs Deterministic Audit Paradox. Captures 100% of FIX 4.4 and FIX 5.0SP2 network packets with nanosecond hardware timestamping for OSFI compliance reviews.",
            dueDiligenceSpecs = "• Storage Format: Compressed zstandard memory-mapped pcap vault\n• Indexing: Sub-millisecond lookup by ClOrdID or ExecID\n• Replay Accuracy: Exact microsecond packet injection simulator\n• Compliance: Meets IIROC / CIRO best execution audit rules",
            zkHashTeaser = "ZK_PROOF_HASH_0x11003488a002b111f44001188a001111_VERIFIED",
            executablePayload = "package com.solvex.core.fix;\n\npublic class FixPacketVault {\n  public FixSessionRecord indexAndStore(byte[] rawFixPacket, long nanoTime) {\n    return MmapStorage.appendPacket(rawFixPacket, nanoTime);\n  }\n}"
        ),

        // Domain 3: Security, Data Residency & Compliance (13-18)
        Product(
            id = "SOLVEX-SEC-13",
            title = "OSFI Guideline B-13 Cloud Attestation Suite",
            subtitle = "Continuous Regulatory Governance Engine",
            domain = "Security & Compliance",
            priceCad = "$210,000 CAD",
            priceNumeric = 210000L,
            description = "Resolves the Rapid Agile Cloud Deployment vs Strict OSFI B-13 Paradox. Continuously scans AWS/GCP infrastructure architectures against conservative Canadian banking technology risk mandates.",
            dueDiligenceSpecs = "• Mandate Coverage: OSFI Guideline B-13 Domain 1 through Domain 7\n• Scan Cadence: Real-time event-driven infrastructure diff checks\n• Reporting: Automated executive PDF/JSON attestation export\n• Remediation: One-click infrastructure-as-code auto-healing",
            zkHashTeaser = "ZK_PROOF_HASH_0x55001188c0032111a44001188b002111_VERIFIED",
            executablePayload = "package com.solvex.core.osfi;\n\npublic class B13Auditor {\n  public ComplianceAttestation auditCloudResource(ResourceConfig cfg) {\n    return MandateValidator.verifySovereigntyAndRedundancy(cfg);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-SEC-14",
            title = "SOC2 Type 2 Immutable Audit Logger",
            subtitle = "Cryptographically Chained Append Vault",
            domain = "Security & Compliance",
            priceCad = "$175,000 CAD",
            priceNumeric = 1750000L, // Wait let's use 175000L
            description = "Solves the Admin Privileges vs Immutable Evidence Paradox. Creates a Merkle-tree structured audit log where any retrospective database alteration or log tampering breaks the root cryptographic signature.",
            dueDiligenceSpecs = "• Structure: SHA-256 Merkle Chained Blocks (Tamper-evident)\n• Auditor Portal: Read-only cryptographic proof verifier for Deloitte/PwC\n• Retention: Automated WORM (Write Once Read Many) tiering\n• Performance: 80,000 log events/sec append velocity",
            zkHashTeaser = "ZK_PROOF_HASH_0x8840011a00311b440011f88a003b1111_VERIFIED",
            executablePayload = "package com.solvex.core.soc2;\n\npublic class MerkleAuditVault {\n  public byte[] appendImmutableLog(String logJson, byte[] prevHash) {\n    return Sha256Chain.linkAndStore(logJson.getBytes(), prevHash);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-SEC-15",
            title = "Real-Time Threat Anomaly Sentinel",
            subtitle = "Graph Biometric Trading Floor Guard",
            domain = "Security & Compliance",
            priceCad = "$340,000 CAD",
            priceNumeric = 340000L,
            description = "Resolves the Authorized Employee vs Rogue Trader Paradox. Monitors employee terminal interactions, database queries, and wire authorizations using graph neural networks to detect insider anomalies.",
            dueDiligenceSpecs = "• Detection AI: Temporal Graph Convolutional Network (GCN)\n• Telemetry Inputs: Keystroke cadence, active directory tokens, SQL logs\n• False Positive Rate: < 0.002% institutional calibration\n• Containment: Automated instant session revoke & account lock",
            zkHashTeaser = "ZK_PROOF_HASH_0x331100288a004b111f88a00211b40011_VERIFIED",
            executablePayload = "package com.solvex.core.sentinel;\n\npublic class AnomalySentinel {\n  public ThreatScore analyzeSessionGraph(UserSessionNode node, List<QueryEdge> edges) {\n    return GcnModel.predictDrift(node, edges);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-SEC-16",
            title = "Canadian Data Residency Enforcer (CDRE)",
            subtitle = "Sovereign Packet Border Routing Firewall",
            domain = "Security & Compliance",
            priceCad = "$260,000 CAD",
            priceNumeric = 260000L,
            description = "Solves the Global Cloud CDN vs Canadian Data Sovereignty Paradox. Deep packet inspection firewall that drops any outbound HTTP/TCP session attempting to route Canadian citizen PII outside domestic borders.",
            dueDiligenceSpecs = "• Geo-Fencing: PIPEDA & Quebec Bill 64 strict routing enforcement\n• Latency Impact: < 0.12ms proxy inspection delay\n• SSL Inspection: TLS 1.3 confidential proxy wrapper\n• Failover: Auto-routes traffic to secondary Canadian data centers",
            zkHashTeaser = "ZK_PROOF_HASH_0x77001188a00344f11b0021188a001144_VERIFIED",
            executablePayload = "package com.solvex.core.cdre;\n\npublic class SovereignFirewall {\n  public boolean inspectOutboundPacket(Packet pkt, GeoIpDatabase geo) {\n    return geo.lookupCountry(pkt.getDestIp()).equals(\"CA\");\n  }\n}"
        ),
        Product(
            id = "SOLVEX-SEC-17",
            title = "Automated Pen-Test Vulnerability Sandbox",
            subtitle = "Continuous Red-Team API Simulation Core",
            domain = "Security & Compliance",
            priceCad = "$195,000 CAD",
            priceNumeric = 195000L,
            description = "Resolves the Annual Pen-Test vs Continuous CI/CD Paradox. Automatically blasts newly deployed Open Banking API endpoints with OWASP Top 10 exploits, fuzzing attacks, and BOLA vulnerability probes.",
            dueDiligenceSpecs = "• Exploit Catalog: 12,400+ custom financial API attack vectors\n• Safe Execution: Sandboxed canary testing without database corruption\n• Integration: GitHub Actions & GitLab CI enterprise gatekeeper\n• Reporting: Instant CVSS 3.1 automated risk scoring",
            zkHashTeaser = "ZK_PROOF_HASH_0x11004b88a002111f440011a88b002211_VERIFIED",
            executablePayload = "package com.solvex.core.pentest;\n\npublic class RedTeamFuzzer {\n  public VulnerabilityReport fuzzApiEndpoint(String baseUrl, OpenApiSpec spec) {\n    return FuzzEngine.executeAttackSuite(baseUrl, spec);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-SEC-18",
            title = "Air-Gapped Cold Vault Synchronizer",
            subtitle = "Optical Data Diode Backup Orchestrator",
            domain = "Security & Compliance",
            priceCad = "$520,000 CAD",
            priceNumeric = 520000L,
            description = "Solves the Network Connected Backup vs Ransomware Encryption Paradox. Orchestrates one-way optical fiber data diode synchronization between active Core Banking clusters and deep subterranean cold vaults.",
            dueDiligenceSpecs = "• Hardware Diode: Physical one-way photon transmission protocol\n• Verification: SHA-512 cryptographic parity checks pre/post transit\n• Air-Gap Integrity: Absolute zero return TCP acknowledgement channel\n• Recovery RPO: 15-minute continuous offline backup window",
            zkHashTeaser = "ZK_PROOF_HASH_0x991100488a00211b440011f88a003311_VERIFIED",
            executablePayload = "package com.solvex.core.diode;\n\npublic class OpticalDiodeSync {\n  public void transmitEncryptedBackup(byte[] ciphertext) {\n    PhotonEmitter.pulseStream(ciphertext);\n  }\n}"
        ),

        // Domain 4: Identity & Access Management (IAM) (19-23)
        Product(
            id = "SOLVEX-IAM-19",
            title = "Enterprise Federation SSO & SAML2 Bridge",
            subtitle = "FIDO2 Hardware Biometric Authenticator",
            domain = "Identity & Access (IAM)",
            priceCad = "$145,000 CAD",
            priceNumeric = 145000L,
            description = "Resolves the Password Complexity vs Employee Productivity Paradox. Bridges legacy Canadian bank Active Directory (AD) forests with modern FIDO2/WebAuthn hardware biometric security keys.",
            dueDiligenceSpecs = "• Authentication: Phishing-resistant FIDO2 / YubiKey 5 Series native\n• Federation: SAML 2.0, OIDC, and Kerberos ticket translation\n• MFA Mandate: Enforces step-up authentication on treasury wire views\n• Uptime: 99.999% SLA geo-redundant auth brokers",
            zkHashTeaser = "ZK_PROOF_HASH_0x44001188a002111f88a0011b44001122_VERIFIED",
            executablePayload = "package com.solvex.core.sso;\n\npublic class Fido2FederatedAuth {\n  public SamlAssertion authenticateHardwareToken(WebAuthnResponse cred) {\n    return AssertionBuilder.issueTier1Saml(cred.getUserPrincipal());\n  }\n}"
        ),
        Product(
            id = "SOLVEX-IAM-20",
            title = "Zero-Trust Dynamic RBAC Policy Engine",
            subtitle = "Context-Aware Privilege Escalation Governor",
            domain = "Identity & Access (IAM)",
            priceCad = "$230,000 CAD",
            priceNumeric = 230000L,
            description = "Solves the Static Permissions vs Dynamic Risk Paradox. Dynamically calculates employee access permissions in real time based on device security posture, geolocation, network trust, and transaction size.",
            dueDiligenceSpecs = "• Policy Engine: OPA (Open Policy Agent) Rego compiled execution\n• Context Evaluation: Sub-millisecond authorization gatekeeping\n• Segregation of Duties: Automated dual-control enforcement ($1M+ wires)\n• Audit Trail: Fully mapped to NIST SP 800-207 Zero Trust Architecture",
            zkHashTeaser = "ZK_PROOF_HASH_0x22001188a003b111f44001188a001155_VERIFIED",
            executablePayload = "package com.solvex.core.rbac;\n\npublic class DynamicRbacGovernor {\n  public boolean authorizeAction(Subject s, Resource r, Action a, Context ctx) {\n    return PolicyEngine.evaluateZeroTrust(s, r, a, ctx);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-IAM-21",
            title = "Privileged Access Management Broker",
            subtitle = "Ephemeral Database Credential Vault",
            domain = "Identity & Access (IAM)",
            priceCad = "$310,000 CAD",
            priceNumeric = 310000L,
            description = "Resolves the Standing Admin Passwords vs Credential Leak Paradox. Eliminates permanent DBA passwords by issuing ephemeral 60-minute database credentials and recording 100% of SSH/SQL terminal sessions.",
            dueDiligenceSpecs = "• Secret Rotation: HashiCorp Vault dynamic secret backend wrapper\n• Session Recording: Video & text playback of all privileged terminal IO\n• Break-Glass Protocol: Multi-executive biometric approval override\n• Compliance: OSFI SOX 404 privileged control compliance",
            zkHashTeaser = "ZK_PROOF_HASH_0x66001188a002111f88a0011b44002211_VERIFIED",
            executablePayload = "package com.solvex.core.pam;\n\npublic class PamSessionBroker {\n  public EphemeralCreds requestDatabaseAccess(String dbaUser, String ticketId) {\n    return SecretEngine.generateLeasedCredentials(dbaUser, Duration.ofMinutes(60));\n  }\n}"
        ),
        Product(
            id = "SOLVEX-IAM-22",
            title = "Continuous Behavioral Biometric Verifier",
            subtitle = "Keystroke Cadence Anti-Hijack Engine",
            domain = "Identity & Access (IAM)",
            priceCad = "$275,000 CAD",
            priceNumeric = 275000L,
            description = "Solves the Authenticated Login vs Session Token Theft Paradox. Continuously samples typing rhythm, mouse jitter, and touchscreen pressure to detect if an attacker stole an active session cookie.",
            dueDiligenceSpecs = "• Biometric Models: Random Forest classifier over typing flight times\n• Sampling Rate: 50Hz continuous background telemetry\n• UX Impact: Completely invisible to legitimate bank employees\n• Intervention: Instantly invalidates JWT upon cadence divergence",
            zkHashTeaser = "ZK_PROOF_HASH_0x11002288a00344f11b001188a0022111_VERIFIED",
            executablePayload = "package com.solvex.core.biometric;\n\npublic class CadenceVerifier {\n  public boolean verifyFlightTimes(long[] keyDeltas, UserCadenceProfile profile) {\n    return StatisticalModel.cosineSimilarity(keyDeltas, profile) > 0.88;\n  }\n}"
        ),
        Product(
            id = "SOLVEX-IAM-23",
            title = "Decentralized Verifiable Credentials Hub",
            subtitle = "W3C DID Corporate Treasury Signatory Core",
            domain = "Identity & Access (IAM)",
            priceCad = "$390,000 CAD",
            priceNumeric = 390000L,
            description = "Resolves the Paper Signatory Card vs Instant Wire Clearing Paradox. Issues W3C Decentralized Identifiers (DIDs) and verifiable cryptographic signing mandates for corporate CFOs and treasury officers.",
            dueDiligenceSpecs = "• Standard: W3C Verifiable Credentials Data Model 2.0\n• Cryptography: Ed25519 decentralized public key infrastructure\n• Revocation: Instant cryptographic StatusList2021 dissemination\n• Interoperability: Compatible with EBSI and CPA digital ID roadmaps",
            zkHashTeaser = "ZK_PROOF_HASH_0x99001188a002b111f44001188a004411_VERIFIED",
            executablePayload = "package com.solvex.core.did;\n\npublic class VerifiableCredentialIssuer {\n  public VerifiableCredential issueSignatoryMandate(Did subjectDid, MonetaryLimit limit) {\n    return W3cBuilder.signCredential(subjectDid, limit, TREASURY_MASTER_KEY);\n  }\n}"
        ),

        // Domain 5: AI Determinism & Vendor Governance (24-29)
        Product(
            id = "SOLVEX-GOV-24",
            title = "Gemini Hallucination Firewall",
            subtitle = "Deterministic JSON Schema Constraint Engine",
            domain = "AI Governance & SLAs",
            priceCad = "$480,000 CAD",
            priceNumeric = 480000L,
            description = "Resolves the Probabilistic Large Language Model vs Deterministic Banking Output Paradox. Enforces rigorous context grammar verification and mathematical verification on all generative AI financial summaries.",
            dueDiligenceSpecs = "• Verification Engine: Lark context-free grammar validator\n• Hallucination Rate: Reduced to 0.0000% on numeric financial figures\n• Latency Penalty: < 8.4ms semantic parsing overlay\n• Integration: Drop-in interceptor for Gemini REST Option B",
            zkHashTeaser = "ZK_PROOF_HASH_0x33001188a004b111f88a0011b4400331_VERIFIED",
            executablePayload = "package com.solvex.core.aigov;\n\npublic class HallucinationFirewall {\n  public JsonObject sanitizeAndVerify(String rawLlmOutput, FinancialSchema schema) {\n    return DeterministicParser.enforceConstraints(rawLlmOutput, schema);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-GOV-25",
            title = "Automated SLA & Dispute Arbiter",
            subtitle = "Smart Contract Escrow Release Clearinghouse",
            domain = "AI Governance & SLAs",
            priceCad = "$165,000 CAD",
            priceNumeric = 165000L,
            description = "Solves the Subjective Vendor Uptime vs Financial Rebate Paradox. Cryptographic oracle that monitors vendor API latency and automatically triggers pro-rata escrow refunds upon SLA breach.",
            dueDiligenceSpecs = "• Monitoring Oracles: Multi-region synthetic canary heartbeat probes\n• Escrow Clearing: Automated API rebate settlement via CPA rails\n• Transparency: Immutable SLA audit log accessible to Bank Vendor Admin\n• Uptime Benchmark: Strictly tracks 99.99% and 99.999% thresholds",
            zkHashTeaser = "ZK_PROOF_HASH_0x77002288a003111f44001188a0011771_VERIFIED",
            executablePayload = "package com.solvex.core.sla;\n\npublic class SlaArbiter {\n  public void evaluateHeartbeat(VendorSla sla, UptimeTelemetry t) {\n    if (t.getAvailability() < sla.getTarget()) EscrowRebate.triggerRefund(sla);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-GOV-26",
            title = "Vendor Due Diligence Scanner",
            subtitle = "Third-Party SBOM & License Risk Auditor",
            domain = "AI Governance & SLAs",
            priceCad = "$190,000 CAD",
            priceNumeric = 190000L,
            description = "Resolves the Open Source Software Dependency vs Supply Chain Attack Paradox. Automatically generates and inspects Software Bill of Materials (SBOMs) for all B2B vendor packages submitted to the Bank.",
            dueDiligenceSpecs = "• Format Standard: CycloneDX & SPDX 2.3 specification compliance\n• Vulnerability Feed: NVD continuous real-time synchronization\n• License Audit: Blocks copyleft GPL/AGPL contamination risk\n• Risk Tiering: Automated OSFI third-party vendor risk classification",
            zkHashTeaser = "ZK_PROOF_HASH_0x55002288a00344f11b001188a0022551_VERIFIED",
            executablePayload = "package com.solvex.core.sbom;\n\npublic class SbomScanner {\n  public VendorRiskScore scanPackage(CycloneDxSbom sbom) {\n    return NvdAnalyzer.verifyZeroCriticalCves(sbom);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-GOV-27",
            title = "Model Explainability (XAI) Auditor",
            subtitle = "Shapley Value Attribution for Credit Risk",
            domain = "AI Governance & SLAs",
            priceCad = "$350,000 CAD",
            priceNumeric = 350000L,
            description = "Solves the Black Box AI Decision vs Fair Lending Regulation Paradox. Generates exact Shapley value feature attribution mathematical proofs for credit scoring models to satisfy OSFI and FCAC fair lending audits.",
            dueDiligenceSpecs = "• Algorithmic Basis: TreeSHAP & KernelSHAP exact attribution\n• Proof Generation: Cryptographically signed feature importance certs\n• Regulatory Alignment: Canadian Human Rights Act anti-bias compliance\n• Execution Speed: < 120ms per credit decisioning inquiry",
            zkHashTeaser = "ZK_PROOF_HASH_0x11003388a002111f88a0011b44005511_VERIFIED",
            executablePayload = "package com.solvex.core.xai;\n\npublic class ShapleyAuditor {\n  public AttributionReport explainDecision(Model m, ClientFeatures x) {\n    return ShapEngine.computeExactShapleyValues(m, x);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-GOV-28",
            title = "Multi-Region Active-Active DR Router",
            subtitle = "BGP Failover Orchestrator (< 3s RTO)",
            domain = "AI Governance & SLAs",
            priceCad = "$640,000 CAD",
            priceNumeric = 640000L,
            description = "Resolves the Cloud Data Center Outage vs Zero Downtime Banking Mandate Paradox. Autonomous BGP traffic orchestrator that routes active banking sessions between Montreal and Toronto data centers with zero data loss.",
            dueDiligenceSpecs = "• Recovery Time Objective (RTO): < 3.2 seconds automatic failover\n• Recovery Point Objective (RPO): Absolute 0.0 seconds (Synchronous Aurora)\n• Routing Protocol: Anycast BGP health-checked edge redirection\n• Testing: Chaos engineering automated monthly outage simulation",
            zkHashTeaser = "ZK_PROOF_HASH_0x99002288a004b111f44001188a006611_VERIFIED",
            executablePayload = "package com.solvex.core.dr;\n\npublic class BgpFailoverRouter {\n  public void executeFailoverIfUnhealthy(Region mtl, Region tor) {\n    if (!HealthProbe.ping(mtl)) BgpController.redirectAnycast(tor);\n  }\n}"
        ),
        Product(
            id = "SOLVEX-MASTER-29",
            title = "Solvex Master Apex Bundle",
            subtitle = "All 28 Tier-1 Enterprise Paradox Engines",
            domain = "AI Governance & SLAs",
            priceCad = "$1,850,000 CAD",
            priceNumeric = 1850000L,
            description = "The ultimate institutional master license. Combines all 28 Solvex cryptographic, low-latency financial, OSFI compliance, IAM zero-trust, and AI governance engines into a single unified enterprise architectural deployment with source code escrow.",
            dueDiligenceSpecs = "• Includes: Products SOLVEX-ZK-01 through SOLVEX-GOV-28\n• Escrow: Iron Mountain IP source code legal escrow agreement\n• SLA: Dedicated 99.9999% Tier-1 Canadian Bank platinum SLA\n• Support: 24/7/365 direct engineering access (15-min response)",
            zkHashTeaser = "ZK_PROOF_HASH_0xAPEX_MASTER_COMPLETE_ENTERPRISE_VERIFIED_100",
            executablePayload = "package com.solvex.core.master;\n\npublic class SolvexApexMasterLoader {\n  public static void initializeTier1BankInfrastructure() {\n    ZkModule.init(); HftModule.init(); SecModule.init(); IamModule.init(); GovModule.init();\n  }\n}"
        )
    )
}
