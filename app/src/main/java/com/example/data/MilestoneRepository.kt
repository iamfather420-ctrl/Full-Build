package com.example.data

import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import java.text.DecimalFormat

class MilestoneRepository(private val milestoneDao: MilestoneDao) {

    val allMilestones: Flow<List<SystemMilestone>> = milestoneDao.getAllMilestones()
    val activeAccount: Flow<B2BAccount?> = milestoneDao.getActiveAccount()

    private val currencyFormat = DecimalFormat("$#,##0.00")

    private suspend fun getNextLamportTimestamp(): Long {
        val currentMax = milestoneDao.getMaxLamportTimestamp() ?: 0L
        return currentMax + 1
    }

    private suspend fun logSystemMilestone(actionType: String, xmlDetails: String) {
        val lamport = getNextLamportTimestamp()
        val milestone = SystemMilestone(
            lamportTimestamp = lamport,
            actionType = actionType,
            details = xmlDetails
        )
        milestoneDao.insertMilestone(milestone)
    }

    suspend fun logAutonomousAction(actionType: String, xmlDetails: String) {
        logSystemMilestone(actionType, xmlDetails)
    }

    /**
     * Verifies the enterprise under COPPA rules (B2B only, no minors)
     * and initializes the corporate account with a standard operating budget of $1,000,000.00.
     */
    suspend fun verifyEnterprise(companyName: String, ein: String, email: String): Boolean {
        // Validation: EIN format is typically XX-XXXXXXX or 9 digits
        val cleanEin = ein.replace("-", "").trim()
        if (cleanEin.length != 9 || !cleanEin.all { it.isDigit() }) {
            return false
        }

        // COPPA Check: Ensure corporate email domain (rudimentary check, blocking personal/minor-associated domains)
        val lowerEmail = email.lowercase().trim()
        val commonMinorOrPersonalDomains = listOf(
            "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "protonmail.com"
        )
        val domain = lowerEmail.substringAfter("@", "")
        if (domain.isEmpty() || commonMinorOrPersonalDomains.contains(domain)) {
            // In a strict enterprise B2B foundry, personal webmail is rejected to guarantee COPPA B2B compliance
            return false
        }

        // Initialize B2B Account
        val account = B2BAccount(
            companyName = companyName,
            ein = ein,
            corporateEmail = email,
            isVerified = true,
            operatingCapital = 1000000.00, // $1,000,000.00 operational credit
            taxReserve = 0.0,
            taxRemitted = 0.0
        )

        milestoneDao.clearAccounts()
        milestoneDao.insertOrUpdateAccount(account)

        // Log enterprise verification milestone
        val xmlDetails = """
            <ledger_entry>
                <event>ENTERPRISE_VERIFICATION_SECURED</event>
                <company_name>$companyName</company_name>
                <ein>$ein</ein>
                <corporate_domain>$domain</corporate_domain>
                <coppa_status>COMPLIANT_B2B_RESTRICTED</coppa_status>
                <initial_allocation>$1,000,000.00</initial_allocation>
            </ledger_entry>
        """.trimIndent()

        logSystemMilestone("ENTERPRISE_VERIFIED", xmlDetails)
        return true
    }

    /**
     * Instantiates an admin bypass session to access full operational build.
     */
    suspend fun verifyAdminBypass(): Boolean {
        val account = B2BAccount(
            companyName = "Sovereign Admin Core",
            ein = "00-0000000",
            corporateEmail = "admin@solvex.corp",
            isVerified = true,
            operatingCapital = 999999999.00,
            taxReserve = 0.0,
            taxRemitted = 0.0
        )

        milestoneDao.clearAccounts()
        milestoneDao.insertOrUpdateAccount(account)

        val xmlDetails = """
            <ledger_entry>
                <event>ADMIN_BYPASS_VERIFICATION_SECURED</event>
                <company_name>Sovereign Admin Core</company_name>
                <ein>00-0000000</ein>
                <corporate_domain>solvex.corp</corporate_domain>
                <coppa_status>OVERRIDE_ADMIN_ACCESS</coppa_status>
                <initial_allocation>$999,999,999.00</initial_allocation>
            </ledger_entry>
        """.trimIndent()

        logSystemMilestone("ADMIN_BYPASS_VERIFIED", xmlDetails)
        return true
    }

    /**
     * Executes a B2B contract sale, enforcing the IRS-First Split-Logic Rule.
     * Updates account state step-by-step and emits milestones.
     */
    suspend fun executeB2BTransaction(
        productName: String,
        revenue: Double,
        onStateUpdate: suspend (phase: String, progress: Float) -> Unit
    ): Boolean {
        val account = milestoneDao.getActiveAccountDirect() ?: return false
        val corporateTaxRate = 0.21 // 21% Corporate Tax

        // PHASE 1: CALCULATE tax liability
        onStateUpdate("PHASE 1: CALCULATING TAX LIABILITY", 0.1f)
        delay(1200) // Simulated high-integrity calculation delay

        val taxLiability = revenue * corporateTaxRate
        val netRevenue = revenue - taxLiability

        val calcXml = """
            <ledger_entry>
                <phase>1_CALCULATE</phase>
                <contract_product>$productName</contract_product>
                <gross_revenue>${currencyFormat.format(revenue)}</gross_revenue>
                <corporate_tax_rate>${(corporateTaxRate * 100).toInt()}%</corporate_tax_rate>
                <tax_liability>${currencyFormat.format(taxLiability)}</tax_liability>
                <api_status>TAX_SERVICE_RESOLVED</api_status>
            </ledger_entry>
        """.trimIndent()
        logSystemMilestone("TAX_CALCULATED", calcXml)

        // PHASE 2: SEQUESTER tax liability into holding
        onStateUpdate("PHASE 2: SEQUESTERING TAX TO RESERVE SUB-ACCOUNT", 0.35f)
        delay(1500)

        // Add revenue temporarily, but immediately isolate the tax reserve
        val accountPhase2 = account.copy(
            taxReserve = account.taxReserve + taxLiability
        )
        milestoneDao.insertOrUpdateAccount(accountPhase2)

        val sequesterXml = """
            <ledger_entry>
                <phase>2_SEQUESTER</phase>
                <action>TRANSFER_SUB_ACCOUNT</action>
                <source>INCOMING_REVENUE</source>
                <destination>TAX_RESERVE_SUB_ACCOUNT</destination>
                <sequestered_amount>${currencyFormat.format(taxLiability)}</sequestered_amount>
                <ledger_lock>SEQUESTERED_HOLD_CONFIRMED</ledger_lock>
            </ledger_entry>
        """.trimIndent()
        logSystemMilestone("TAX_SEQUESTERED", sequesterXml)

        // PHASE 3: REMIT payment to IRS (EFTPS) via simulated Bank API
        onStateUpdate("PHASE 3: REMITTING TO IRS (EFTPS) VIA BANK API", 0.60f)
        delay(1800)

        val remitXml = """
            <ledger_entry>
                <phase>3_REMIT</phase>
                <payment_destination>IRS_EFTPS_GATEWAY</payment_destination>
                <eftps_trace_id>EFTPS-${System.currentTimeMillis() % 1000000000}</eftps_trace_id>
                <remitted_amount>${currencyFormat.format(taxLiability)}</remitted_amount>
                <bank_status>TRANSMISSION_SUCCESSFUL</bank_status>
            </ledger_entry>
        """.trimIndent()
        logSystemMilestone("TAX_REMITTED", remitXml)

        // PHASE 4: VERIFY payment is queued and release remaining net funds to operating capital
        onStateUpdate("PHASE 4: VERIFYING EFTPS & RELEASING OPERATING FUNDS", 0.85f)
        delay(1400)

        val finalAccount = account.copy(
            operatingCapital = account.operatingCapital + netRevenue,
            taxReserve = account.taxReserve + taxLiability - taxLiability, // Moves from reserve
            taxRemitted = account.taxRemitted + taxLiability
        )
        milestoneDao.insertOrUpdateAccount(finalAccount)

        val verifyXml = """
            <ledger_entry>
                <phase>4_VERIFY_AND_RELEASE</phase>
                <eftps_verification>EFTPS_SETTLED_ACK</eftps_verification>
                <net_operating_release>${currencyFormat.format(netRevenue)}</net_operating_release>
                <operating_capital_total>${currencyFormat.format(finalAccount.operatingCapital)}</operating_capital_total>
                <system_lock>RESOLVED_SETTLEMENT</system_lock>
            </ledger_entry>
        """.trimIndent()
        logSystemMilestone("OPERATING_REVENUE_RELEASED", verifyXml)

        onStateUpdate("TRANSACTION COMPLETED & LOGGED SUCCESSFULLY", 1.0f)
        delay(1000)

        return true
    }

    suspend fun clearAllData() {
        milestoneDao.clearAccounts()
        milestoneDao.clearMilestones()
    }
}
