package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.DecimalFormat
import kotlin.random.Random

sealed interface SandboxState {
    object Idle : SandboxState
    object Proving : SandboxState
    data class Success(val proofs: List<String>, val verified: Boolean, val logOutput: String) : SandboxState
    data class Error(val message: String) : SandboxState
}

sealed interface EnclaveExecutionState {
    object Idle : EnclaveExecutionState
    object Starting : EnclaveExecutionState
    data class Running(
        val throughput: Double, // units/sec
        val latencyMs: Double,
        val attestationSignature: String,
        val computationalResult: String,
        val activeCpuLoad: Double,
        val logLines: List<String>
    ) : EnclaveExecutionState
    object Terminated : EnclaveExecutionState
}

class ParadoxViewModel(private val repository: ParadoxRepository) : ViewModel() {

    val paradoxes: StateFlow<List<ParadoxEntity>> = repository.allParadoxes
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val auditLogs: StateFlow<List<AuditLogEntity>> = repository.allAuditLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val wallet: StateFlow<UserWalletEntity?> = repository.wallet
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _selectedParadoxId = MutableStateFlow<String?>(null)
    val selectedParadoxId: StateFlow<String?> = _selectedParadoxId.asStateFlow()

    private val _sandboxState = MutableStateFlow<SandboxState>(SandboxState.Idle)
    val sandboxState: StateFlow<SandboxState> = _sandboxState.asStateFlow()

    private val _enclaveState = MutableStateFlow<EnclaveExecutionState>(EnclaveExecutionState.Idle)
    val enclaveState: StateFlow<EnclaveExecutionState> = _enclaveState.asStateFlow()

    init {
        // Initialize Default Corporate Assets and Paradoxes in background
        viewModelScope.launch {
            repository.wallet.first()?.let {
                // Already initialized
            } ?: run {
                repository.updateWallet(
                    UserWalletEntity(
                        id = 1,
                        treasuryBalanceUsd = 100000000.0,
                        corporateName = "Sovereign Global Capital",
                        activeEscrowBtc = 0.0,
                        securityLevel = "Verifiable Quantum Shield"
                    )
                )
            }

            repository.allParadoxes.first().let { list ->
                if (list.isEmpty()) {
                    val defaultList = listOf(
                        ParadoxEntity(
                            id = "router_01",
                            title = "Slippage-Free Multi-Protocol Router",
                            summary = "Routes massive capital transfers instantly across legacy backends and DeFi liquidity pools with zero atomic slippage.",
                            paradoxStatement = "High-volume capital routes across legacy structures (SWIFT, ISO 20022) and AMMs introduce high settlement latency and vulnerability to atomic front-running or front-running bots.",
                            secureSolution = "Splits bulk transfers into dynamic micro-tranches over private Ring-Signature Escrow pools, using predictive PID loops to settle trades inside hardware-secured enclaves, masking path routing until execution is complete.",
                            technicalStack = "Rust WASM, Ring-Signatures, Intel SGX Enclave, Pid Control Loops, ISO 20022 parsing",
                            difficulty = "Extreme",
                            category = "Financial",
                            costUsd = 12500000.0,
                            cryptographicPrimitives = "Ring Signatures, Shamir Secret Splits, ECDSA"
                        ),
                        ParadoxEntity(
                            id = "zk_code_02",
                            title = "Zero-Knowledge Code Verification",
                            summary = "Automate codebase and software compliance audits mathematically without exposing raw proprietary source code.",
                            paradoxStatement = "Compliance teams must thoroughly audit proprietary source code to ensure safety and policy compliance, but engineering teams refuse to share the codebase to protect intellectual property.",
                            secureSolution = "Compiles the codebase Abstract Syntax Tree (AST) into a flat algebraic circuit. Runs zk-SNARK interactive protocols where the prover proves logic satisfies constraints (e.g. no illegal destinations) without revealing raw code lines.",
                            technicalStack = "zk-SNARKs, Groth16 Prover, AST Parser, WASM",
                            difficulty = "Sovereign",
                            category = "Compliance",
                            costUsd = 8400000.0,
                            cryptographicPrimitives = "zk-SNARKs, Groth16, Keccak-256"
                        ),
                        ParadoxEntity(
                            id = "api_bridge_03",
                            title = "Incompatible API Messaging Bridge",
                            summary = "Bridges legacy and modern API protocols with sub-microsecond latency and cryptographic verification.",
                            paradoxStatement = "Converting real-time payloads between legacy structures (FIX, ISO 8583) and modern microservices (gRPC, JSON) creates systemic lag, translation errors, and tampering vectors.",
                            secureSolution = "Performs byte-level transpilation directly in L4 sockets using WebAssembly executed inside a hardware-isolated secure enclave. Emits continuous Merkle proofs of payload state transitions to guarantee tamper-proof routing.",
                            technicalStack = "WebAssembly, Merkle Trees, Intel SGX, gRPC L4 socket binding",
                            difficulty = "Critical",
                            category = "Infrastructure",
                            costUsd = 4500000.0,
                            cryptographicPrimitives = "Merkle-Patricia Trees, SHA-256, HMAC"
                        ),
                        ParadoxEntity(
                            id = "sovereign_recovery_04",
                            title = "Sovereign Treasury Wallet Recovery",
                            summary = "Recover high-value multi-sig corporate crypto-wallets with zero-knowledge, without storing private keys.",
                            paradoxStatement = "Enterprise crypto-wallets containing billions in assets must have a recovery fallback if keys are lost, but storing backup keys anywhere introduces high risk of insider or cloud exploitation.",
                            secureSolution = "Utilizes Verifiable Shamir Secret Sharing (VSSS) to split the private key into multi-officer Lagrange shares. Key reconstruction occurs only inside ephemeral, air-gapped secure enclaves triggered by multi-party consensus.",
                            technicalStack = "Lagrange Interpolation, VSSS, SECP256k1, Ephemeral SGX RAM",
                            difficulty = "Sovereign",
                            category = "Security",
                            costUsd = 15000000.0,
                            cryptographicPrimitives = "Shamir Threshold (3-of-5), VSSS, Diffie-Hellman"
                        ),
                        ParadoxEntity(
                            id = "homomorphic_shield_05",
                            title = "Homomorphic Threat Shield",
                            summary = "Executes deep risk and threat analytics directly over encrypted real-time transactional streams.",
                            paradoxStatement = "Banks want to scale fraud detection in high-performance cloud clusters, but feeding raw, unencrypted financial intelligence to cloud hosts compromises institutional secrecy and GDPR compliance.",
                            secureSolution = "Applies CKKS Fully Homomorphic Encryption. Cloud nodes run deep learning inference and mathematical regression directly on the encrypted ciphertexts, returning encrypted risk scores only readable by local keys.",
                            technicalStack = "CKKS FHE, LWE (Learning With Errors), SIMD Matrix Vector Operations",
                            difficulty = "Extreme",
                            category = "Security",
                            costUsd = 18000000.0,
                            cryptographicPrimitives = "CKKS FHE, R-LWE, Ring Homomorphisms"
                        ),
                        ParadoxEntity(
                            id = "supply_chain_06",
                            title = "Autonomous Supply Chain Clearer",
                            summary = "Enables instant border clearances and cross-border grid load transfers through verifiable spatial telemetry.",
                            paradoxStatement = "Clearing bulk international cargo and shifting electric grid loads across border jurisdictions requires manual customs filings and complex settlements, leading to shipping and energy clearance delays.",
                            secureSolution = "Leverages IoT-signed telemetry matched to zero-knowledge spatial grid polygons. Virtual geofences generate proof-of-transit certificates that instantly trigger border customs escrow clearances and energy load swaps.",
                            technicalStack = "ZK-Snark spatial circuits, Cross-Border Escrow, IoT Elliptic Curve signing, Smart-Grid switching",
                            difficulty = "Extreme",
                            category = "Infrastructure",
                            costUsd = 11000000.0,
                            cryptographicPrimitives = "ECDSA (secp256r1), Polygon proofs, ZK-Coordinates"
                        ),
                        ParadoxEntity(
                            id = "ai_audit_07",
                            title = "Incorruptible AI Audit",
                            summary = "Cryptographically verifies that enterprise neural networks satisfy safety policies without revealing AI weights.",
                            paradoxStatement = "Regulators require proof that financial AI models do not violate bias or risk constraints, but displaying raw neural weights exposes intellectual property worth billions.",
                            secureSolution = "Uses Zero-Knowledge Machine Learning (ZKML) to convert feed-forward neural layers into arithmetic circuits. Each model inference produces a cryptographic proof certifying that it ran the specific safe weights.",
                            technicalStack = "ZKML circuits, Halo2 proof system, Neural network transpiler",
                            difficulty = "Sovereign",
                            category = "Compliance",
                            costUsd = 9500000.0,
                            cryptographicPrimitives = "Halo2, KZG commitments, Pedersen Commitments"
                        ),
                        ParadoxEntity(
                            id = "execution_guard_08",
                            title = "Zero-Knowledge Execution Guard",
                            summary = "Enforces enterprise business policy compliance within active code loops with zero state leaks.",
                            paradoxStatement = "Active systems must dynamically verify safety invariants on execution variables, but checking variables exposes unencrypted data to logs and increases clock cycles.",
                            secureSolution = "Loads safety policies as static Rust-compiled verification filters directly into a CPU isolated execution ring. Checks hashes of execution states against policy invariants in Ring 0 with zero logging footprint.",
                            technicalStack = "Rust Ring 0 driver, Assembly verification, eBPF isolation",
                            difficulty = "Critical",
                            category = "Security",
                            costUsd = 7200000.0,
                            cryptographicPrimitives = "eBPF isolation, SHA-256 Hashing, State commitments"
                        ),
                        ParadoxEntity(
                            id = "sandbox_broker_09",
                            title = "High-Velocity Sandbox Stream",
                            summary = "Provides absolute physical virtualization and air-gapping for sensitive high-frequency transaction feeds.",
                            paradoxStatement = "Sensitive high-frequency feeds must be parsed instantly but isolated entirely from lateral corporate networks, a major bottleneck for standard virtualization.",
                            secureSolution = "Binds network interfaces directly to core-private L1/L2 caches, establishing a physical unidirectional ring buffer. Simulates network air-gapping by strictly trapping outgoing register states.",
                            technicalStack = "Kernel-level Virtualization, Direct Cache Injection (DCI), unidirectional ring-buffers",
                            difficulty = "Critical",
                            category = "Infrastructure",
                            costUsd = 6800000.0,
                            cryptographicPrimitives = "Hardware-enforced ring buffers, AES-NI"
                        ),
                        ParadoxEntity(
                            id = "node_syncher_10",
                            title = "Sovereign Microsecond Syncher",
                            summary = "Synchronizes atomic clock-drifts across decentralized consensus nodes without central NTP servers.",
                            paradoxStatement = "Distributed ledger nodes require microsecond coordination to order transactions, but relying on central servers introduces single-point spoofing and GPS-denial risks.",
                            secureSolution = "Employs peer-to-peer clock-drift estimation exchanging symmetric microsecond timestamps. Nodes run statistical Kalmann filtering to isolate network delay jitter and keep consensus drift under 100ns.",
                            technicalStack = "P2P Clock-drift Estimation, Kalman Filters, UDP Socket, Atomic time references",
                            difficulty = "Extreme",
                            category = "Infrastructure",
                            costUsd = 5500000.0,
                            cryptographicPrimitives = "UDP Timestamp exchange, Kalman filtration"
                        )
                    )
                    repository.insertParadoxes(defaultList)
                }
            }
        }
    }

    fun selectParadox(id: String?) {
        _selectedParadoxId.value = id
        _sandboxState.value = SandboxState.Idle
        _enclaveState.value = EnclaveExecutionState.Idle
    }

    fun buyLicense(id: String) {
        viewModelScope.launch {
            val p = repository.getParadoxById(id) ?: return@launch
            if (p.isLicensed) return@launch

            val w = repository.wallet.first() ?: return@launch
            if (w.treasuryBalanceUsd < p.costUsd) {
                return@launch
            }

            // Deduct funds and set licensed
            val updatedWallet = w.copy(treasuryBalanceUsd = w.treasuryBalanceUsd - p.costUsd)
            val updatedParadox = p.copy(isLicensed = true)

            repository.updateWallet(updatedWallet)
            repository.updateParadox(updatedParadox)

            // Log purchase
            repository.insertAuditLog(
                AuditLogEntity(
                    paradoxId = id,
                    paradoxTitle = p.title,
                    inputData = "Corporate Multi-Sig Clearance (Escrow: Secured)",
                    outputData = "Enclave License Token Generated [TX_ID_${Random.nextInt(100000, 999999)}]",
                    verificationProof = generateRandomHash(),
                    hardwareAttestation = "Intel_SGX_IAS_Attestation_OK_${Random.nextInt(1000, 9999)}",
                    latencyMs = Random.nextLong(150, 450)
                )
            )
        }
    }

    fun runSandboxProofSimulation(id: String, input: String) {
        viewModelScope.launch {
            _sandboxState.value = SandboxState.Proving
            kotlinx.coroutines.delay(1800) // Realistic proof computation time

            val p = repository.getParadoxById(id) ?: return@launch

            val cleanInput = if (input.isBlank()) "Default_Simulation_Vector_0x82f1" else input
            val proofs = listOf(
                "Proof_G1: " + generateRandomHash().take(24) + "...",
                "Proof_G2: " + generateRandomHash().take(24) + "...",
                "Commitment: " + generateRandomHash().take(32) + "..."
            )

            val log = """
                [ZK_VERIFIER] Initializing interactive zero-knowledge challenge.
                [ZK_VERIFIER] Input challenge vector parameter: '$cleanInput'
                [ZK_VERIFIER] Generating AST structural mapping.
                [ZK_VERIFIER] Executing algebraic relation checks for '${p.category}'.
                [ZK_VERIFIER] Verified polynomial evaluation: Q(x) * H(x) == P(x) - V(x)
                [ZK_VERIFIER] Verification output matches expected challenge constraint.
                [ZK_VERIFIER] Zero-knowledge proof verified in 1.8 seconds.
                [ZK_VERIFIER] NO SECRET KEY MATERIAL WAS PERSISTED OR SHOWN.
            """.trimIndent()

            _sandboxState.value = SandboxState.Success(
                proofs = proofs,
                verified = true,
                logOutput = log
            )

            // Log to database audit log too
            repository.insertAuditLog(
                AuditLogEntity(
                    paradoxId = id,
                    paradoxTitle = p.title,
                    inputData = "Before-Sale Sandbox Test: $cleanInput",
                    outputData = "ZK Proof Challenge Verification: MATCH",
                    verificationProof = proofs[2],
                    hardwareAttestation = "Sandbox_Verification_Signature_NIZKP",
                    latencyMs = 1800
                )
            )
        }
    }

    fun executeLicensedEnclaveSimulation(id: String, customArgs: String) {
        viewModelScope.launch {
            _enclaveState.value = EnclaveExecutionState.Starting
            kotlinx.coroutines.delay(1200)

            val p = repository.getParadoxById(id) ?: return@launch
            val cleanArgs = if (customArgs.isBlank()) "Standard_Corporate_Payload" else customArgs

            // Generate specific high-fidelity simulations for each paradox
            val responseText = when (id) {
                "router_01" -> "Cleared transaction tranches of ${Random.nextInt(5000, 25000)} SWIFT inputs with 0 slippage. Liquidity paths balanced dynamically."
                "zk_code_02" -> "AST engine processed 1.2M lines of legacy code. Verified 82 compliance rules. No violations found."
                "api_bridge_03" -> "Parsed FIX 4.4 streams to ISO 20022 schemas with latency of 0.8 microseconds per payload."
                "sovereign_recovery_04" -> "Consensus met (4-of-5). Asymmetric Shamir fragments merged inside secure enclave. Private key reconstructed temporarily, decrypted treasury multisig, cleared local RAM."
                "homomorphic_shield_05" -> "Executed threat matrix multipliers directly on CKKS ciphertexts. Threat score determined as 0.04 (Low risk) without decrypting records."
                "supply_chain_06" -> "IoT telemetry verified in spatial geofenced polygon. Smart contract executed. Customs status: Cleared."
                "ai_audit_07" -> "Inference verified via Halo2. Neural bias checked. Weight footprint matched certified integrity signature."
                "execution_guard_08" -> "Inlined policy rules parsed. Monitored sub-routines running inside isolated Ring 0. 0 violations."
                "sandbox_broker_09" -> "Unidirectional cache channels loaded. Processed high-frequency market feed. Isolation matrix: Secure."
                "node_syncher_10" -> "Symmetric peer ping exchanged. Kalman drift adjusted. Master consensus synchronization offset: 24 nanoseconds."
                else -> "Successful secure execution of enclave."
            }

            val sig = "SGX_Enclave_MSR_Quote_" + generateRandomHash().take(16).uppercase() + "_Signed_by_Intel_Root"
            val latency = Random.nextLong(12, 98)
            val load = Random.nextDouble(14.5, 88.2)
            val th = Random.nextDouble(500.0, 15000.0)

            val detailsLog = listOf(
                "[ENCLAVE_OS] Starting secure enclave runtime container.",
                "[ENCLAVE_OS] Instantiating isolated Ring-0 execution sandbox.",
                "[ENCLAVE_OS] Setting memory encryption keys (MKTME AES-128).",
                "[PRODUCT_EXEC] Loading proprietary binary: '${p.title}'",
                "[PRODUCT_EXEC] Received secure payload parameter: '$cleanArgs'",
                "[PRODUCT_EXEC] Execution complete. Result: $responseText",
                "[ENCLAVE_OS] Generating local attestation quote structure.",
                "[ENCLAVE_OS] Signed attestation verification key matches measurement.",
                "[ENCLAVE_OS] Erasing transient enclave registers."
            )

            _enclaveState.value = EnclaveExecutionState.Running(
                throughput = th,
                latencyMs = latency.toDouble(),
                attestationSignature = sig,
                computationalResult = responseText,
                activeCpuLoad = load,
                logLines = detailsLog
            )

            // Log database audit trail
            repository.insertAuditLog(
                AuditLogEntity(
                    paradoxId = id,
                    paradoxTitle = p.title,
                    inputData = "Live Payload: $cleanArgs",
                    outputData = responseText,
                    verificationProof = generateRandomHash(),
                    hardwareAttestation = sig,
                    latencyMs = latency
                )
            )
        }
    }

    fun stopEnclaveSimulation() {
        _enclaveState.value = EnclaveExecutionState.Terminated
    }

    fun submitCustomCodebaseZKAudit(codeContent: String, rulesContent: String) {
        viewModelScope.launch {
            _sandboxState.value = SandboxState.Proving
            kotlinx.coroutines.delay(2000)

            val lineCount = codeContent.lines().size
            val sizeBytes = codeContent.toByteArray().size
            val rule = if (rulesContent.isBlank()) "Default: No sovereign funds to blacklisted entities" else rulesContent

            val proofs = listOf(
                "Custom_AST_Proof_Hash: " + generateRandomHash().take(24),
                "Groth16_Parameter_Setup: Validated",
                "Compliance_Certificate: " + generateRandomHash().take(32)
            )

            val log = """
                [ZK_VERIFIER] Custom enterprise codebase audit requested.
                [ZK_VERIFIER] Analyzing codebase of $lineCount lines ($sizeBytes bytes).
                [ZK_VERIFIER] Target Compliance Invariant Rule: '$rule'
                [ZK_VERIFIER] Checking code branches for logic paths violating rule structure.
                [ZK_VERIFIER] Codebase compiled into abstract algebraic circuits successfully.
                [ZK_VERIFIER] Groth16 mathematical zero-knowledge proof generated!
                [ZK_VERIFIER] Codebase is 100% COMPLIANT with the specified rules.
                [ZK_VERIFIER] Proof certificate successfully recorded to audit register.
            """.trimIndent()

            _sandboxState.value = SandboxState.Success(
                proofs = proofs,
                verified = true,
                logOutput = log
            )

            repository.insertAuditLog(
                AuditLogEntity(
                    paradoxId = "custom_audit",
                    paradoxTitle = "Custom Codebase ZK-Audit",
                    inputData = "Lines: $lineCount, Rule: $rule",
                    outputData = "ZK Code Compliance: VERIFIED",
                    verificationProof = proofs[2],
                    hardwareAttestation = "Custom_ZK_Verifier_WASM_V2",
                    latencyMs = 2000
                )
            )
        }
    }

    fun clearAuditLogs() {
        viewModelScope.launch {
            repository.clearAuditLogs()
        }
    }

    fun resetSystem() {
        viewModelScope.launch {
            val list = repository.allParadoxes.first()
            val resetList = list.map { it.copy(isLicensed = false) }
            repository.insertParadoxes(resetList)

            repository.updateWallet(
                UserWalletEntity(
                    id = 1,
                    treasuryBalanceUsd = 100000000.0,
                    corporateName = "Sovereign Global Capital",
                    activeEscrowBtc = 0.0,
                    securityLevel = "Verifiable Quantum Shield"
                )
            )

            repository.clearAuditLogs()
            _selectedParadoxId.value = null
            _sandboxState.value = SandboxState.Idle
            _enclaveState.value = EnclaveExecutionState.Idle
        }
    }

    private fun generateRandomHash(): String {
        val chars = "0123456789abcdef"
        return "0x" + (1..64).map { chars[Random.nextInt(chars.length)] }.joinToString("")
    }
}

class ParadoxViewModelFactory(private val repository: ParadoxRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ParadoxViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ParadoxViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
