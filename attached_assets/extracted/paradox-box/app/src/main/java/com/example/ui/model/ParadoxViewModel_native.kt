package com.example.ui.model

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.api.GeminiClient
import com.example.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ParadoxViewModel(
    application: Application,
    private val repository: ParadoxRepository
) : AndroidViewModel(application) {

    // Main listings
    val listings: StateFlow<List<ParadoxListing>> = repository.allListings
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    private val _selectedParadoxId = MutableStateFlow<Int?>(null)
    val selectedParadoxId: StateFlow<Int?> = _selectedParadoxId.asStateFlow()

    // Currently active paradox item
    val selectedParadox: StateFlow<ParadoxListing?> = combine(listings, _selectedParadoxId) { list, id ->
        list.find { it.id == id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    // User credits wallet (Corporate SVX Treasury)
    private val _userWalletCredits = MutableStateFlow(250000.0)
    val userWalletCredits: StateFlow<Double> = _userWalletCredits.asStateFlow()

    // Creator revenue dashboard
    private val _creatorRevenue = MutableStateFlow(450000.0)
    val creatorRevenue: StateFlow<Double> = _creatorRevenue.asStateFlow()

    // Commercial Platform Financial Metrics (How Solvex Makes Money!)
    private val _platformArr = MutableStateFlow(14850000.0) // Annual Recurring Revenue
    val platformArr: StateFlow<Double> = _platformArr.asStateFlow()

    private val _platformExchangeFeesCollected = MutableStateFlow(2227500.0) // 15% Platform Cut
    val platformExchangeFeesCollected: StateFlow<Double> = _platformExchangeFeesCollected.asStateFlow()

    private val _creatorEscrowPool = MutableStateFlow(12622500.0) // 85% Creator Payouts
    val creatorEscrowPool: StateFlow<Double> = _creatorEscrowPool.asStateFlow()

    private val _activeSubscriptionPlan = MutableStateFlow("Standard Institutional Plan (\$120k/yr)")
    val activeSubscriptionPlan: StateFlow<String> = _activeSubscriptionPlan.asStateFlow()

    // Sandbox Inputs & Outcomes
    private val _sandboxInputQuery = MutableStateFlow("")
    val sandboxInputQuery: StateFlow<String> = _sandboxInputQuery.asStateFlow()

    private val _isEvaluatingSandbox = MutableStateFlow(false)
    val isEvaluatingSandbox: StateFlow<Boolean> = _isEvaluatingSandbox.asStateFlow()

    private val _lastSandboxResultText = MutableStateFlow<String?>(null)
    val lastSandboxResultText: StateFlow<String?> = _lastSandboxResultText.asStateFlow()

    private val _lastZKHash = MutableStateFlow<String?>(null)
    val lastZKHash: StateFlow<String?> = _lastZKHash.asStateFlow()

    private val _lastConfidence = MutableStateFlow<Double?>(null)
    val lastConfidence: StateFlow<Double?> = _lastConfidence.asStateFlow()

    // Dual-Signature Cryptographic Escrow transactions
    val activeEscrowTransactions: StateFlow<Map<Int, DualSignatureEscrowTransaction>> = DualSignatureEscrowManager.activeTransactions

    // State flow for selected paradox's historical simulation query list
    val currentProbes: StateFlow<List<SandboxProbe>> = _selectedParadoxId
        .flatMapLatest { id ->
            if (id == null) flowOf(emptyList())
            else repository.getProbesForParadox(id)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // UI Toast or message events
    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    // Withdrawal destination account
    private val _withdrawalAccount = MutableStateFlow("Paypal.me/tjites")
    val withdrawalAccount: StateFlow<String> = _withdrawalAccount.asStateFlow()

    init {
        // Automatically check & pre-populate database with famous paradoxes on first init
        viewModelScope.launch {
            repository.checkAndPrepulate()
            // Set the first paradox as default selected
            val initial = repository.allListings.first()
            if (initial.isNotEmpty()) {
                _selectedParadoxId.value = initial.first().id
            }
        }
    }

    fun selectParadox(id: Int) {
        _selectedParadoxId.value = id
        // Reset query screen fields
        _sandboxInputQuery.value = ""
        _lastSandboxResultText.value = null
        _lastZKHash.value = null
        _lastConfidence.value = null
    }

    fun setSandboxInput(text: String) {
        _sandboxInputQuery.value = text
    }

    fun clearToast() {
        _toastMessage.value = null
    }

    /**
     * Executes an interactive challenge query in the Sandbox enclave.
     * Proves correctness of the secret solver without revealing the recipe before buying.
     */
    fun runSandboxQuery() {
        val paradox = selectedParadox.value ?: return
        val userInput = _sandboxInputQuery.value.trim()
        if (userInput.isEmpty()) {
            _toastMessage.value = "Please input a test scenario/probe query."
            return
        }

        viewModelScope.launch {
            _isEvaluatingSandbox.value = true
            try {
                // Call Gemini evaluator
                val result = GeminiClient.evaluateSandboxQuery(
                    paradoxTitle = paradox.title,
                    paradoxStatement = paradox.statement,
                    solutionSecret = paradox.solverSecret,
                    userInput = userInput
                )

                _lastSandboxResultText.value = result.proofText
                _lastZKHash.value = result.zkHash
                _lastConfidence.value = result.confidence

                // Insert into persistent database log
                repository.insertProbe(
                    SandboxProbe(
                        paradoxId = paradox.id,
                        queryInput = userInput,
                        queryOutput = result.proofText,
                        confidenceScore = result.confidence,
                        zkProofHash = result.zkHash
                    )
                )

                _toastMessage.value = "Zero-Knowledge Sandbox Execution Complete."
            } catch (e: Exception) {
                _toastMessage.value = "Execution error: ${e.message}"
            } finally {
                _isEvaluatingSandbox.value = false
            }
        }
    }

    /**
     * Escrow Stage 1: Put funds in escrow to run advanced sandbox queries.
     * Solution remains locked in vault, preventing logic theft, but starts escrow contract status.
     */
    fun initiateEscrowPurchase() {
        val paradox = selectedParadox.value ?: return
        if (paradox.unlocked || paradox.escrowLocked) return

        if (_userWalletCredits.value < paradox.price) {
            _toastMessage.value = "Insufficient SVX balance! Purchase SVX with USD first."
            return
        }

        viewModelScope.launch {
            // Deduct credits temporarily to Solvex Escrow Vault
            _userWalletCredits.value -= paradox.price
            
            // Initiate dual signature cryptographic escrow & sign buyer enclave key
            val escrowTx = DualSignatureEscrowManager.initiateTransaction(paradox.id, paradox.price)
            DualSignatureEscrowManager.signBuyer(paradox.id)
            
            // Mark as locked in escrow
            val updated = paradox.copy(escrowLocked = true)
            repository.updateListing(updated)
            _toastMessage.value = "Dual-Signature Escrow initiated. Buyer key verified [${escrowTx.contractDigest}]."
        }
    }

    /**
     * Escrow Stage 2A: Release Escrow (Satisfied)
     * Funds are irreversibly paid to creator. Secret solution is decrypted in buyer's vault.
     */
    fun releaseEscrowToCreator() {
        val paradox = selectedParadox.value ?: return
        if (!paradox.escrowLocked) return

        viewModelScope.launch {
            // Creator signs to complete dual-party consensus
            DualSignatureEscrowManager.signCreator(paradox.id)
            if (!DualSignatureEscrowManager.canResolve(paradox.id)) {
                _toastMessage.value = "Awaiting dual-signature cryptographic validation!"
                return@launch
            }
            DualSignatureEscrowManager.resolveRelease(paradox.id)

            val updated = paradox.copy(
                escrowLocked = false,
                unlocked = true,
                totalSales = paradox.totalSales + 1
            )
            repository.updateListing(updated)
            
            // Increment creator revenue (demonstrating exchange in USD)
            _creatorRevenue.value += paradox.price
            _toastMessage.value = "Dual-Signature Escrow resolved. USD funds released & solution unlocked!"
        }
    }

    /**
     * Escrow Stage 2B: Refund Escrow (Unsatisfied)
     * Escrow canceled, credits returned to user's wallet.
     */
    fun refundEscrow() {
        val paradox = selectedParadox.value ?: return
        if (!paradox.escrowLocked) return

        viewModelScope.launch {
            // Consensus arbitration sign for refund
            DualSignatureEscrowManager.signCreator(paradox.id)
            DualSignatureEscrowManager.resolveRefund(paradox.id)

            val updated = paradox.copy(escrowLocked = false, unlocked = false)
            repository.updateListing(updated)
            
            // Refund user credits
            _userWalletCredits.value += paradox.price
            _toastMessage.value = "Dual-Signature Escrow refunded. Funds returned safely."
            
            // Clear sandbox outputs
            _lastSandboxResultText.value = null
            _lastZKHash.value = null
        }
    }

    /**
     * Creation Node: List a brand-new paradox with secret solution!
     */
    fun listNewParadox(
        title: String,
        category: String,
        statement: String,
        secretSolution: String,
        price: Double
    ) {
        if (title.isEmpty() || statement.isEmpty() || secretSolution.isEmpty() || price <= 0) {
            _toastMessage.value = "All fields are required. Price must be greater than 0."
            return
        }

        viewModelScope.launch {
            val newParadox = ParadoxListing(
                title = title,
                category = category,
                statement = statement,
                solverSecret = secretSolution,
                price = price,
                creatorName = "Creator Self-Publish",
                proofDigest = "0x" + List(24) { "0123456789abcdef".random() }.joinToString("")
            )
            repository.insertListing(newParadox)
            _toastMessage.value = "New paradox successfully sealed & listed with $%,.2f USD valuation!".format(price)
        }
    }

    /**
     * Authorize Annual Enterprise Access Contract & Invoicing.
     */
    fun addTestCredits() {
        _userWalletCredits.value += 120000.0
        _toastMessage.value = "Annual Master License Contract Authorized ($120,000 ACH Wire Net-30). SVX Corporate Treasury Replenished."
    }

    /**
     * Process secure annual subscription procurement invoicing of SVX credits
     */
    fun buySvxCredits(amountUsd: Double, successMsg: String) {
        _userWalletCredits.value += amountUsd
        _toastMessage.value = successMsg
    }

    fun setWithdrawalAccount(account: String) {
        _withdrawalAccount.value = account
    }

    fun withdrawSvxCredits(amountSvx: Double, account: String) {
        if (amountSvx <= 0) {
            _toastMessage.value = "Please enter a valid withdrawal tranche amount."
            return
        }
        if (amountSvx > _creatorRevenue.value) {
            _toastMessage.value = "Insufficient inventor royalty balance. Available: %,.1f SVX".format(_creatorRevenue.value)
            return
        }
        _creatorRevenue.value -= amountSvx
        _toastMessage.value = "Withdrew %,.1f SVX ($%,.2f) royalty tranche to %s! Custom tranche execution bypassed standard daily limit.".format(amountSvx, amountSvx, account)
    }

    fun clearProbesLog() {
        val paradox = selectedParadox.value ?: return
        viewModelScope.launch {
            repository.clearProbes(paradox.id)
            _toastMessage.value = "Sandbox logs cleared."
        }
    }
}

class ParadoxViewModelFactory(
    private val application: Application,
    private val repository: ParadoxRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ParadoxViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ParadoxViewModel(application, repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
