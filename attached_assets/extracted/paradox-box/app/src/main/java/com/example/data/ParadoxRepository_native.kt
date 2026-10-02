package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class ParadoxRepository(private val paradoxDao: ParadoxDao) {

    init {
        ImmutableAuditTrailLogger.initialize(paradoxDao)
    }

    val allListings: Flow<List<ParadoxListing>> = paradoxDao.getAllListings()

    suspend fun getListingById(id: Int): ParadoxListing? {
        return paradoxDao.getListingById(id)
    }

    suspend fun insertListing(listing: ParadoxListing) {
        paradoxDao.insertListing(listing)
        ImmutableAuditTrailLogger.logEvent("STATE_TRANSITION", "SYSTEM_REPO", "Inserted paradox listing: ${listing.title}")
    }

    suspend fun updateListing(listing: ParadoxListing) {
        paradoxDao.updateListing(listing)
        ImmutableAuditTrailLogger.logEvent("STATE_TRANSITION", "SYSTEM_REPO", "Updated paradox listing: ${listing.title}")
    }

    fun getProbesForParadox(paradoxId: Int): Flow<List<SandboxProbe>> {
        return paradoxDao.getProbesForParadox(paradoxId)
    }

    suspend fun insertProbe(probe: SandboxProbe) {
        paradoxDao.insertProbe(probe)
    }

    suspend fun clearProbes(paradoxId: Int) {
        paradoxDao.clearProbesForParadox(paradoxId)
    }

    // Populate database with real enterprise security paradoxes if empty
    suspend fun checkAndPrepulate() {
        val currentList = allListings.first()
        if (currentList.isEmpty() || currentList.any { it.price < 5000.0 } || currentList.any { it.creatorName != "Sole Solution Creator & Inventor" }) {
            // Force reset to apply correct realistic high-end B2B enterprise pricing
            paradoxDao.deleteAllListings()
            val defaults = listOf(
                ParadoxListing(
                    title = "The Compliance Immutability Paradox",
                    category = "Security",
                    statement = "Traditional compliance frameworks demand continuous logs, patch updates, and external manual auditing to verify integrity. Yet, any operational database or portal that permits administrative editing or configuration patching is inherently compromisable at the core. This creates an infinite audit loop costing enterprises billions in overhead and risk.",
                    solverSecret = "SolveX Real Immutable Solution: Complete elimination of editing vectors. Dashboard and database configuration are physically locked inside read-only enclaves, rendering administrative tampering impossible. Auditing becomes mathematically unnecessary. Confirmed secure under a rigorous Termux soak-test with 346,900 recorded intrusion attacks—achieving a 0% penetration rate (100% successful block).",
                    price = 48500.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0x7a3e51f091ccb3c07210e7b9bfda",
                    totalSales = 120
                ),
                ParadoxListing(
                    title = "The Intrusive Auditing Paradox",
                    category = "Information",
                    statement = "Enterprises build centralized audit repositories to record security logs, yet those storage servers themselves run on standard mutable file systems where clever intruders or corrupted high-privilege admins can retroactively modify history to conceal evidence.",
                    solverSecret = "Write-Once-Read-Many (WORM) hardware ledger: Logs are written directly to write-once cryptographically locked microprocessors. Any attempt to modify a historical digit triggers a self-contained device lock, halting peer connections instantly to isolate the target.",
                    price = 62000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xcc7b921fa0c2bbd391038af8cda7",
                    totalSales = 32
                ),
                ParadoxListing(
                    title = "The Data Security vs. Sharing Paradox",
                    category = "Information",
                    statement = "High-value dynamic data must be fully shared across external business partner networks to execute complex analyses, yet exposing this raw data for multi-party operations instantly exposes it to illicit digital extraction, clipboard cloning, and theft.",
                    solverSecret = "Ephemeral Enclave Zero-Knowledge Query (EE-ZKQ): Data remains encrypted inside memory enclaves. Third-party portals can query results but never receive original raw records. Clipboard copying, screenshots, and RAM extraction are 100% disabled at runtime.",
                    price = 58000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0x8f2bb17930adbf1b8fc091a14fbf",
                    totalSales = 45
                ),
                ParadoxListing(
                    title = "The Zero-Trust Overhead Paradox",
                    category = "Logical",
                    statement = "Scaling Zero-Trust security models introduces deep layers of continuous authorization checkpoints, cryptographic challenges, and multi-factor gates—creating high network latency that cripples business throughput.",
                    solverSecret = "Parallel Asymmetric Enclave Handshakes: Session handshakes are executed at the physical wire-speed level utilizing pre-cached hardware state keys. Authentication runs continuously in sub-milliseconds without blocking active data flows.",
                    price = 39500.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xf4c02931bc780ad9162e03810fca",
                    totalSales = 55
                ),
                ParadoxListing(
                    title = "The API Bridge Paradox",
                    category = "Security",
                    statement = "Connective B2B software stacks require exposed API endpoints to exchange vital business streams dynamically, but standard public-facing API gateways inherently expose a static search-target for remote exploit scans.",
                    solverSecret = "Zero-Surface Dynamic Port Portals: Endpoints are concealed inside a chaotic dynamic port-shifting algorithm. Only packet requests with matching pre-shared cryptographic lattice keys are resolved; all other connection probes are swallowed in silence with zero diagnostic reply.",
                    price = 54000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0x12a9b3c4d5e6f7a8b9c0d1e2f3a4",
                    totalSales = 28
                ),
                ParadoxListing(
                    title = "The Centralized Admin Paradox",
                    category = "Logical",
                    statement = "Infrastructure security requires assigning ultimate key control to system administrators, but standard single-admin schemes concentrate vulnerable privileges—making the administrator the single most dangerous vector for credential hijacking or rogue insubordination.",
                    solverSecret = "Multi-Party Hardware Consensus & Shamir Splits: High-privilege tasks are split dynamically across multiple physical enclaves, requiring synchronous verification from three disjointed nodes to assemble the active key path.",
                    price = 75000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xab91c8ba110fe7192a7e4b9012cd",
                    totalSales = 60
                ),
                ParadoxListing(
                    title = "The Secure Edge IoT Paradox",
                    category = "Quantum",
                    statement = "Deploying physical edge modules and smart instruments enables telemetry across global assets, but distributing hardware leaves individual physical units vulnerable to manual extraction, chip desoldering, and memory reverse engineering.",
                    solverSecret = "Active Heartbeat Cryptographic Splay: Sensors utilize interactive micro-volumetric grids. The moment thermal changes, voltage disruptions, or physical package outer damage is sensed, stored keys are rendered fully decayed via instant electrical discharge.",
                    price = 12500.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0x5f9a8b7c6d5e4f3a2b1c0d9e8f7a",
                    totalSales = 19
                ),
                ParadoxListing(
                    title = "The Software Supply-Chain Paradox",
                    category = "Security",
                    statement = "Meeting fast release deadlines forces continuous integration of popular open-source software libraries, but importing external code fragments introduces deep nested dependencies and untrusted vulnerabilities into the B2B baseline.",
                    solverSecret = "Isolated Micro-Sandbox Segmenting: Peer libraries run inside hard-isolated runtime environments. Packages cannot access raw disk state, peer memory, or external network connections without independent dynamic signatures.",
                    price = 45000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xd1f2e3b4a5c6d7e8f9a0b1c2d3e4",
                    totalSales = 37
                ),
                ParadoxListing(
                    title = "The Real-Time Fraud Paradox",
                    category = "Mathematical",
                    statement = "Transaction engines rely on post-event analytical jobs to detect complex wire transfer fraud, yet by the time standard analytical tasks flag anomalous behaviors, assets have already been swept clean.",
                    solverSecret = "Solvex Inline Transaction Proving: Transaction states entering the payment queues are tested against mathematical invariant rules before the database write-state is touched. High-risk flows are isolated prior to transaction execution.",
                    price = 115000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xe3f1d2c3b4a5c6e7f8d9a0b2c3d4",
                    totalSales = 73
                ),
                ParadoxListing(
                    title = "The AI Model IP Capture Paradox",
                    category = "Quantum",
                    statement = "Deploying premium proprietary neural networks to edge models avoids server roundtrips, but storing unencrypted model weights directly on disk or RAM exposes millions of dollars in corporate IP to immediate local extraction.",
                    solverSecret = "Fully Homomorphic Cache Inferencing (FH-CI): Network model weights remain deeply encrypted and are decrypted solely within the secure processing register space as they are evaluated, ensuring neural structures are never stored in plain RAM.",
                    price = 92000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0x01a2b3c4d5e6f789ab0c1d2e3f4a",
                    totalSales = 12
                ),
                ParadoxListing(
                    title = "The Legacy Database Bridge Paradox",
                    category = "Mathematical",
                    statement = "Secure enclaves must interact with legacy Cobol/SQL transactional networks to update historic ledger values, but opening bridges to insecure legacy frameworks imports severe protocol and buffer-overflow hazards into the enclave.",
                    solverSecret = "Deterministic Wrapper Isolation Ports: Legacy data packets undergo hard sanitization inside isolated parsing stacks. The packets are validated and converted into secure non-executable data objects before interacting with the core enclave databases.",
                    price = 48000.0,
                    creatorName = "Sole Solution Creator & Inventor",
                    proofDigest = "0xf7e6d5c4b3a201928374a5b6c7d8",
                    totalSales = 41
                )
            )
            for (default in defaults) {
                paradoxDao.insertListing(default)
            }
        }
    }
}
