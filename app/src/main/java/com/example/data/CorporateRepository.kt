package com.example.data

import kotlinx.coroutines.flow.Flow
import java.util.regex.Pattern

class CorporateRepository(private val database: AppDatabase) {
    val allTethers: Flow<List<TetherNode>> = database.tetherNodeDao().getAllTethers()
    val allLogs: Flow<List<LogEvent>> = database.logEventDao().getRecentLogs()
    val activeAccount: Flow<B2BAccount?> = database.b2bAccountDao().getActiveAccountFlow()
    val allTasks: Flow<List<ConsensusTask>> = database.consensusTaskDao().getAllTasks()
    val allParadoxes: Flow<List<SolvedParadox>> = database.solvedParadoxDao().getAllParadoxes()
    val allBalanceSheetRecords: Flow<List<BalanceSheetRecord>> = database.balanceSheetDao().getAllRecords()

    suspend fun getAllBalanceSheetRecordsList(): List<BalanceSheetRecord> {
        return database.balanceSheetDao().getAllRecordsList()
    }

    suspend fun insertBalanceRecord(record: BalanceSheetRecord) {
        database.balanceSheetDao().insertRecord(record)
    }

    suspend fun clearBalanceSheet() {
        database.balanceSheetDao().clearAll()
    }

    suspend fun insertAllParadoxes(paradoxes: List<SolvedParadox>) {
        database.solvedParadoxDao().insertAll(paradoxes)
    }

    suspend fun getAllParadoxesList(): List<SolvedParadox> {
        return database.solvedParadoxDao().getAllParadoxesList()
    }

    suspend fun insertParadox(paradox: SolvedParadox) {
        database.solvedParadoxDao().insertParadox(paradox)
    }

    suspend fun insertTether(node: TetherNode) {
        database.tetherNodeDao().insertTether(node)
        log("Tether Bound: ${node.name} established to '${node.targetElement}'", "INFO")
    }

    suspend fun deleteTether(id: Int) {
        database.tetherNodeDao().deleteTether(id)
    }

    suspend fun log(message: String, level: String) {
        database.logEventDao().insertLog(LogEvent(message = message, level = level))
    }

    suspend fun updateAccount(account: B2BAccount) {
        database.b2bAccountDao().updateAccount(account)
    }

    suspend fun insertTask(task: ConsensusTask) {
        database.consensusTaskDao().insertTask(task)
    }

    suspend fun verifyEnterprise(companyName: String, ein: String, email: String): Boolean {
        // EIN must be 9 digits formatted as XX-XXXXXXX or similar 9 digit pattern
        val cleanEin = ein.replace("-", "").trim()
        if (cleanEin.length != 9 || !cleanEin.all { it.isDigit() }) {
            log("Verification Failed: EIN format invalid.", "WARN")
            return false
        }

        // Email domain check (no generic personal domains)
        val emailLower = email.lowercase().trim()
        val personalDomains = listOf("gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com")
        val domain = emailLower.substringAfter("@", "")
        if (domain.isEmpty() || personalDomains.contains(domain)) {
            log("Verification Failed: Corporate/Enterprise email domain required.", "WARN")
            return false
        }

        val account = B2BAccount(
            companyName = companyName,
            ein = ein,
            email = email,
            balance = 500000.00,
            isVerified = true
        )
        database.b2bAccountDao().clearAll()
        database.b2bAccountDao().insertAccount(account)
        log("Enterprise Verified: Initial $500,000.00 credit issued to $companyName ($ein)", "COMPLIANCE")
        return true
    }

    suspend fun triggerAdminBypass() {
        val account = B2BAccount(
            companyName = "Sovereign Admin Bypass Corp",
            ein = "99-9999999",
            email = "admin@solvex.global",
            balance = 1000000.00,
            isVerified = true
        )
        database.b2bAccountDao().clearAll()
        database.b2bAccountDao().insertAccount(account)
        log("Admin Override: Bypassed compliance gates. Initialized Corporate Treasury.", "SYSTEM")
    }

    suspend fun logout() {
        database.b2bAccountDao().clearAll()
        log("Session Disconnected: Securely shredded active authentication cache.", "INFO")
    }

    suspend fun clearAll() {
        database.tetherNodeDao().clearAll()
        database.logEventDao().clearAll()
        database.b2bAccountDao().clearAll()
        database.consensusTaskDao().clearAll()
        database.balanceSheetDao().clearAll()
    }
}
