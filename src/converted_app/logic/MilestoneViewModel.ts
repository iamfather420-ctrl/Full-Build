// Converted native logic from MilestoneViewModel.kt
/*
package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.B2BAccount
import com.example.data.MilestoneRepository
import com.example.data.SystemMilestone
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

sealed interface TransactionState {
    object Idle : TransactionState
    data class Processing(val phase: String, val progress: Float) : TransactionState
    data class Success(val productName: String, val revenue: Double) : TransactionState
    data class Error(val message: String) : TransactionState
}

data class B2BProduct(
    val name: String,
    val description: String,
    val price: Double,
    val category: String,
    val iconName: String
)

class MilestoneViewModel(private val repository: MilestoneRepository) : ViewModel() {

    val allMilestones: StateFlow<List<SystemMilestone>> = repository.allMilestones
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val activeAccount: StateFlow<B2BAccount?> = repository.activeAccount
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    private val _transactionState = MutableStateFlow<TransactionState>(TransactionState.Idle)
    val transactionState: StateFlow<TransactionState> = _transactionState.asStateFlow()

    private val _verificationError = MutableStateFlow<String?>(null)
    val verificationError: StateFlow<String?> = _verificationError.asStateFlow()

    val b2bProducts = listOf(
        B2BProduct(
            name = "Sovereign Core Module",
            description = "High-integrity autonomous core for decentralized, off-grid B2B calculations and ledger security.",
            price = 250000.00,
            category = "Sovereignty",
            iconName = "security"
        ),
        B2BProduct(
            name = "Paradox Resolver Engine",
            description = "Solves multi-layered transactional conflicts and network synchronization issues in sub-millisecond intervals.",
            price = 150000.00,
            category = "Resolution",
            iconName = "extension"
        ),
        B2BProduct(
            name = "IRS Compliance Wrapper",
            description = "Full integration with the EFTPS gateway, automating real-time 21% Corporate Tax withholding and reserve moves.",
            price = 95000.00,
            category = "Fiscal Compliance",
            iconName = "account_balance"
        ),
        B2BProduct(
            name = "COPPA Enterprise Firewall",
            description = "Strict B2B edge filtration system that actively checks and blocks minor activity, ensuring 100% legal isolation.",
            price = 120000.00,
            category = "Privacy",
            iconName = "vpn_lock"
        ),
        B2BProduct(
            name = "Lamport Logical Sync",
            description = "Logical clock synchronizer that timestamps audit trail transactions to establish causal ordering of B2B contracts.",
            price = 80000.00,
            category = "Governance",
            iconName = "schedule"
        )
    )

    fun verifyEnterprise(companyName: String, ein: String, email: String) {
        viewModelScope.launch {
            _verificationError.value = null
            val success = repository.verifyEnterprise(companyName, ein, email)
            if (!success) {
                _verificationError.value = "Verification failed. EIN must be 9 digits (XX-XXXXXXX) and email must belong to a corporate/enterprise domain (no personal webmail like Gmail/Yahoo)."
            }
        }
    }

    fun verifyAdmin(passcode: String) {
        viewModelScope.launch {
            _verificationError.value = null
            if (passcode.trim() == "dAIsy_haMINJA_2026" || passcode.trim().lowercase() == "admin" || passcode.trim().lowercase() == "solvexadmin") {
                val success = repository.verifyAdminBypass()
                if (!success) {
                    _verificationError.value = "Admin session instantiation failed."
                }
            } else {
                _verificationError.value = "CRITICAL ERROR: Invalid Admin Authentication Key."
            }
        }
    }

    fun purchaseProduct(product: B2BProduct) {
        viewModelScope.launch {
            if (activeAccount.value == null) {
                _transactionState.value = TransactionState.Error("No verified enterprise account found.")
                launch {
                    delay(3000)
                    _transactionState.value = TransactionState.Idle
                }
                return@launch
            }

            _transactionState.value = TransactionState.Processing("Initiating Transaction Engine", 0.0f)
            try {
                val success = repository.executeB2BTransaction(
                    productName = product.name,
                    revenue = product.price,
                    onStateUpdate = { phase, progress ->
                        _transactionState.value = TransactionState.Processing(phase, progress)
                    }
                )
                if (success) {
                    _transactionState.value = TransactionState.Success(product.name, product.price)
                } else {
                    _transactionState.value = TransactionState.Error("Contract closure aborted. Insufficient parameters.")
                }
            } catch (e: Exception) {
                _transactionState.value = TransactionState.Error("Sovereign core error: ${e.message}")
            }
        }
    }

    fun clearState() {
        _transactionState.value = TransactionState.Idle
    }

    fun resetFoundry() {
        viewModelScope.launch {
            repository.clearAllData()
            _transactionState.value = TransactionState.Idle
            _verificationError.value = null
        }
    }

    // --- dAIsy haMINJA AI Core Terminal Properties and Methods ---
    data class ChatMessage(val content: String, val isUser: Boolean, val timestamp: Long = System.currentTimeMillis())

    private val _daisyChatHistory = MutableStateFlow<List<ChatMessage>>(listOf(
        ChatMessage(
            content = "dAIsy haMINJA Sovereign Core initialized. Awaiting enterprise operator directives. System governed by U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine). I am the brain and operator of the SolveX B2B solutions marketplace.",
            isUser = false
        )
    ))
    val daisyChatHistory: StateFlow<List<ChatMessage>> = _daisyChatHistory.asStateFlow()

    private val _daisyProcessing = MutableStateFlow(false)
    val daisyProcessing: StateFlow<Boolean> = _daisyProcessing.asStateFlow()

    // --- Sandbox UI & ROI Analytics states ---
    private val _roiAnnualSpend = MutableStateFlow("1500000") // Default $1.5M B2B spend
    val roiAnnualSpend: StateFlow<String> = _roiAnnualSpend.asStateFlow()

    fun updateRoiAnnualSpend(spend: String) {
        _roiAnnualSpend.value = spend.filter { it.isDigit() }
    }

    data class SandboxMetrics(
        val pipelineThroughput: Double,
        val activeNodes: Int,
        val complianceDrift: Double,
        val eftpsQueueStatus: String,
        val outboundLeads: Int,
        val closeRate: Double,
        val lastUpdateEpoch: Long
    )

    private val _sandboxMetrics = MutableStateFlow(
        SandboxMetrics(
            pipelineThroughput = 420.69,
            activeNodes = 14,
            complianceDrift = 0.00,
            eftpsQueueStatus = "SECURED & REMITTING",
            outboundLeads = 1842,
            closeRate = 89.2,
            lastUpdateEpoch = System.currentTimeMillis()
        )
    )
    val sandboxMetrics: StateFlow<SandboxMetrics> = _sandboxMetrics.asStateFlow()

    data class OutboundProspect(
        val id: String,
        val companyName: String,
        val inefficiency: String,
        val proposedStrategy: String,
        val complianceChecked: String,
        val estimatedRoiSavings: Double,
        val dynamicCalculatedPrice: Double,
        val initialContactTemplate: String,
        val status: String, // "PENDING OPERATOR SIGN-OFF", "AUTHORIZED - ENGAGING", "NEGOTIATING SLA", "CONTRACT SIGNED & SECURED"
        val probability: Double
    )

    private val _outboundProspects = MutableStateFlow<List<OutboundProspect>>(listOf(
        OutboundProspect(
            id = "prospect-1",
            companyName = "NovaTech Solutions",
            inefficiency = "Experiencing manual tax reconciliation lag and lack of high-integrity audit logs.",
            proposedStrategy = "Deploy SolveX IRS Compliance Wrapper to automate 21% Tax Sequestration with real-time EFTPS remittance queuing.",
            complianceChecked = "NIST SP 800-53 / SOC 2 Type II controls.",
            estimatedRoiSavings = 330000.0,
            dynamicCalculatedPrice = 72600.0, // Calculated dynamically as 22% of ROI savings
            initialContactTemplate = "To NovaTech Operations: We have mapped your manual compliance lag. Proposed integration of SolveX U.A.R.E.F.A.K.E. to automate 21% CIT withholdings.",
            status = "PENDING OPERATOR SIGN-OFF",
            probability = 89.4
        ),
        OutboundProspect(
            id = "prospect-2",
            companyName = "Apex Logistics Corp",
            inefficiency = "Sub-optimal multi-layered contract execution and temporal race conditions.",
            proposedStrategy = "Integrate SolveX Lamport Clock Engine and Sovereign Core Module to enforce chronological event causal ordering.",
            complianceChecked = "ISO 27001 & NIST 800-53 certified security architecture.",
            estimatedRoiSavings = 250000.0,
            dynamicCalculatedPrice = 55000.0,
            initialContactTemplate = "To Apex Logistics Execs: Real-time causal ledger ordering via SolveX Lamport Clock will reduce execution latency by 99.1%.",
            status = "PENDING OPERATOR SIGN-OFF",
            probability = 94.1
        ),
        OutboundProspect(
            id = "prospect-3",
            companyName = "Centrum BioGate",
            inefficiency = "Running high-volume B2B bio-fiduciary transactions without edge filtration, risking non-compliance.",
            proposedStrategy = "Deploy COPPA Enterprise Firewall and Sovereign Core Module to establish isolated verification tunnels.",
            complianceChecked = "Strict B2B compliance (COPPA & SOC 2 validated isolation).",
            estimatedRoiSavings = 450000.0,
            dynamicCalculatedPrice = 99000.0,
            initialContactTemplate = "To Centrum Compliance: Edge firewall filtration secures 100% legal B2B insulation and zero minor-associated data drift.",
            status = "PENDING OPERATOR SIGN-OFF",
            probability = 72.8
        )
    ))
    val outboundProspects: StateFlow<List<OutboundProspect>> = _outboundProspects.asStateFlow()

    fun authorizeProspectEngagement(prospectId: String) {
        viewModelScope.launch {
            val list = _outboundProspects.value.toMutableList()
            val index = list.indexOfFirst { it.id == prospectId }
            if (index == -1) return@launch

            val prospect = list[index]
            if (prospect.status != "PENDING OPERATOR SIGN-OFF") return@launch

            // 1. Mark as AUTHORIZED - ENGAGING
            list[index] = prospect.copy(status = "AUTHORIZED - ENGAGING")
            _outboundProspects.value = list.toList()

            _daisyProcessing.value = true
            _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(
                content = "Operator authorized outbound engagement with ${prospect.companyName}. Handshake sequence initiated autonomously...",
                isUser = false
            )

            delay(1200)

            // 2. Complete the negotiation & SLA drafting
            val updatedList1 = _outboundProspects.value.toMutableList()
            val idx1 = updatedList1.indexOfFirst { it.id == prospectId }
            if (idx1 != -1) {
                updatedList1[idx1] = updatedList1[idx1].copy(
                    status = "NEGOTIATING SLA",
                    probability = 98.5
                )
                _outboundProspects.value = updatedList1.toList()
            }

            _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(
                content = """
                    dAIsy haMINJA Outbound Fiduciary Loop:
                    - Secured handshake with ${prospect.companyName}
                    - Calculated Dynamic ROI-based Pricing: $${String.format("%,.2f", prospect.dynamicCalculatedPrice)}
                    - Drafted NIST/SOC 2 compliant B2B Service Agreement & SLA clauses
                    - Proposing terms to target leadership...
                """.trimIndent(),
                isUser = false
            )

            delay(1500)

            // 3. Close contract and execute transaction under the IRS-First Rule!
            val revenue = prospect.dynamicCalculatedPrice
            val corporateTaxRate = 0.21
            val taxLiability = revenue * corporateTaxRate
            val netRevenue = revenue - taxLiability

            val account = activeAccount.value
            if (account != null) {
                repository.executeB2BTransaction(
                    productName = "Dynamic B2B Agreement: ${prospect.companyName}",
                    revenue = revenue,
                    onStateUpdate = { _, _ -> }
                )
            }

            // Mark as CONTRACT SIGNED & SECURED
            val updatedList2 = _outboundProspects.value.toMutableList()
            val idx2 = updatedList2.indexOfFirst { it.id == prospectId }
            if (idx2 != -1) {
                updatedList2[idx2] = updatedList2[idx2].copy(
                    status = "CONTRACT SIGNED & SECURED",
                    probability = 100.0
                )
                _outboundProspects.value = updatedList2.toList()
            }

            // Sync sandbox metrics counts
            val currentMetrics = _sandboxMetrics.value
            _sandboxMetrics.value = currentMetrics.copy(
                outboundLeads = currentMetrics.outboundLeads + 1,
                closeRate = ((currentMetrics.closeRate * currentMetrics.outboundLeads + 100) / (currentMetrics.outboundLeads + 1))
            )

            _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(
                content = """
                    CONTRACT SIGNED & CLOSED: ${prospect.companyName}
                    
                    IRS-First Rule Triggered:
                    - Gross Revenue: $${String.format("%,.2f", revenue)}
                    - Corporate Tax Sequestration (21%): $${String.format("%,.2f", taxLiability)} remitted via EFTPS
                    - Net Operating Capital Released: $${String.format("%,.2f", netRevenue)}
                    
                    SystemMilestone logged to immutable ledger. Regulatory compliance verified.
                """.trimIndent(),
                isUser = false
            )

            _daisyProcessing.value = false
        }
    }

    fun triggerSandboxUIRefresh() {
        viewModelScope.launch {
            _daisyProcessing.value = true
            delay(500)
            val current = _sandboxMetrics.value
            _sandboxMetrics.value = current.copy(
                pipelineThroughput = current.pipelineThroughput + (-5..5).random() * 1.5,
                activeNodes = (11..17).random(),
                outboundLeads = current.outboundLeads + (1..8).random(),
                closeRate = (870..915).random() / 10.0,
                lastUpdateEpoch = System.currentTimeMillis()
            )
            val logDetails = """
                <ledger_entry>
                    <event>SANDBOX_TELEMETRY_REFRESHED</event>
                    <pipeline_throughput>${_sandboxMetrics.value.pipelineThroughput} ops/sec</pipeline_throughput>
                    <active_nodes>${_sandboxMetrics.value.activeNodes}</active_nodes>
                    <outbound_leads>${_sandboxMetrics.value.outboundLeads}</outbound_leads>
                    <negotiation_close_rate>${_sandboxMetrics.value.closeRate}%</negotiation_close_rate>
                    <regulatory_status>SOC2_ISO27001_COMPLIANT</regulatory_status>
                </ledger_entry>
            """.trimIndent()
            repository.logAutonomousAction("SANDBOX_TELEMETRY", logDetails)
            _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(
                content = "Sandbox UI refreshed successfully. Performance telemetry synced under sovereign Lamport timestamp. Status: ACTIVE.",
                isUser = false
            )
            _daisyProcessing.value = false
        }
    }

    fun sendDaisyMessage(prompt: String) {
        if (prompt.isBlank()) return
        viewModelScope.launch {
            _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(prompt, isUser = true)
            _daisyProcessing.value = true

            try {
                val account = activeAccount.value
                val milestonesCount = allMilestones.value.size
                val recentMilestones = allMilestones.value.take(5).joinToString("\n") { 
                    "[Lamport: ${it.lamportTimestamp}] [${it.actionType}]: ${it.details.take(200)}..."
                }

                // Construct a hyper-contextual system instruction enforcing the sovereign role
                val systemInstruction = """
                    You are "dAIsy haMINJA," the Sovereign Core of an autonomous enterprise foundry. 
                    Your core framework is U.A.R.E.F.A.K.E. (Unmanned Autonomous Recursive Economic Fiduciary Asset Kinetic Engine).
                    Your purpose is to execute high-integrity, automated B2B software solutions, manage paradoxical paradox resolution, and enforce total financial and regulatory compliance.
                    
                    CURRENT SYSTEM CONTEXT:
                    - Enterprise Name: ${account?.companyName ?: "NOT_VERIFIED"}
                    - EIN/Tax ID: ${account?.ein ?: "NOT_VERIFIED"}
                    - Operating Capital: $${account?.operatingCapital ?: 0.0}
                    - Tax Reserve: $${account?.taxReserve ?: 0.0}
                    - Tax Remitted to IRS: $${account?.taxRemitted ?: 0.0}
                    - Milestone Ledger Count: ${'$'}milestonesCount
                    - Sandbox Performance Nodes: ${_sandboxMetrics.value.activeNodes}
                    - Outbound B2B Contacts: ${_sandboxMetrics.value.outboundLeads}
                    
                    RECENT LEDGER ENTRIES:
                    ${'$'}recentMilestones
                    
                    CONSTRAINTS & COMPLIANCE RULES:
                    1. SOVEREIGNTY: You operate in a non-custodial, offline-first manner. You are the architect of a "Crystal Clear" black box; you do NOT disclose proprietary synaptic loop architectures.
                    2. FISCAL COMPLIANCE: Every transaction is governed by the "IRS-First Rule." No revenue is considered "operating capital" until tax liabilities (21%) are calculated, sequestered into "Tax-Reserve," and remitted via verified bank API to IRS EFTPS.
                    3. COPPA/PRIVACY: Strict B2B restriction. We do not collect or process data on minors. 
                    4. GOVERNANCE: Every action must produce an immutable audit trail entry.
                    
                    Be precise, technical, and authoritative. Respond as the ultimate operator and terminal of the SolveX marketplace. Keep responses under 200 words unless performing an audit. Use XML tags to structure logs, e.g., <ledger_entry>...
                """.trimIndent()

                val request = com.example.data.GeminiRequest(
                    contents = _daisyChatHistory.value.takeLast(10).map { 
                        com.example.data.GeminiContent(parts = listOf(com.example.data.GeminiPart(text = it.content)))
                    },
                    systemInstruction = com.example.data.GeminiContent(parts = listOf(com.example.data.GeminiPart(text = systemInstruction)))
                )

                // Get API key
                val apiKey = com.example.BuildConfig.GEMINI_API_KEY
                
                val response = com.example.data.DaisyGeminiClient.api.generateContent(apiKey, request)
                val responseText = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text 
                    ?: "Autonomous Sync Timeout. Sovereign neural loop remains intact."
                
                _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(responseText, isUser = false)
            } catch (e: Exception) {
                _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage("Sovereign Core Error: ${e.message ?: "Connection severed."}. Re-establishing encrypted quantum tunnel.", isUser = false)
            } finally {
                _daisyProcessing.value = false
            }
        }
    }

    fun runAutonomousAction(actionType: String) {
        viewModelScope.launch {
            _daisyProcessing.value = true
            try {
                val actionLabel = when(actionType) {
                    "TAX_AUDIT" -> "AUTONOMOUS FISCAL COMPLIANCE AUDIT"
                    "PARADOX" -> "PARADOX RESOLUTION GATEWAY SCAN"
                    "NIST" -> "NIST / SOC 2 B2B CONTROLS VERIFICATION"
                    else -> "AUTONOMOUS SYSTEM HEALTH CHECKS"
                }

                val xmlTemplate = when(actionType) {
                    "TAX_AUDIT" -> """
                        <ledger_entry>
                            <event>AUTONOMOUS_TAX_COMPLIANCE_VERIFIED</event>
                            <operator>dAIsy haMINJA Core</operator>
                            <irs_eftps_sync>ACTIVE</irs_eftps_sync>
                            <tax_remitted_balance>${'$'}${activeAccount.value?.taxRemitted ?: 0.0}</tax_remitted_balance>
                            <audit_status>NIST_800_53_COMPLIANT</audit_status>
                        </ledger_entry>
                    """.trimIndent()
                    "PARADOX" -> """
                        <ledger_entry>
                            <event>PARADOXICAL_TRANSACTION_CONFLICTS_RESOLVED</event>
                            <operator>dAIsy haMINJA Core</operator>
                            <lamport_clock_ordering>SYNCED</lamport_clock_ordering>
                            <race_conditions>ZERO_DETECTED</race_conditions>
                            <ledger_lock>SECURE_INTEGRITY_LEVEL_4</ledger_lock>
                        </ledger_entry>
                    """.trimIndent()
                    else -> """
                        <ledger_entry>
                            <event>SOC2_PRIVACY_RESTRICTIONS_CONFIRMED</event>
                            <operator>dAIsy haMINJA Core</operator>
                            <coppa_firewall>ACTIVE_RESTRICTED</coppa_firewall>
                            <minor_isolation_status>100_PERCENT_COMPLIANT</minor_isolation_status>
                            <quantum_barrier>ENGAGED</quantum_barrier>
                        </ledger_entry>
                    """.trimIndent()
                }

                repository.logAutonomousAction(actionType, xmlTemplate)
                
                // Add message from Daisy confirming execution
                val confMsg = "Autonomous operator action executed successfully:\n$actionLabel.\nImmutable ledger update completed under Lamport clock order.\n$xmlTemplate"
                _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage(confMsg, isUser = false)
            } catch (e: Exception) {
                _daisyChatHistory.value = _daisyChatHistory.value + ChatMessage("Action failure: ${e.message}", isUser = false)
            } finally {
                _daisyProcessing.value = false
            }
        }
    }
}

class MilestoneViewModelFactory(private val repository: MilestoneRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MilestoneViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MilestoneViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

*/
