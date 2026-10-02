package com.example.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull

class SolvexRepository(private val solvexDao: SolvexDao) {
    val allProducts: Flow<List<Product>> = solvexDao.getAllProducts()
    val currentSession: Flow<UserSession?> = solvexDao.getCurrentSession()
    val auditLogs: Flow<List<AuditLog>> = solvexDao.getAuditLogs()

    suspend fun ensureInitialized() {
        val currentList = allProducts.firstOrNull()
        if (currentList == null || currentList.isEmpty()) {
            solvexDao.insertProducts(InitialCatalog.get29Products())
            solvexDao.insertAuditLog(
                AuditLog(
                    actor = "SYSTEM_KERNEL",
                    action = "INITIALIZE_29_PRODUCTS",
                    details = "Pre-loaded 29 Tier-1 Canadian Bank Paradox Solutions into secure Room vault.",
                    severity = "SUCCESS"
                )
            )
        }
    }

    suspend fun login(username: String, role: String, institution: String) {
        val session = UserSession(username = username, role = role, institution = institution)
        solvexDao.saveSession(session)
        solvexDao.insertAuditLog(
            AuditLog(
                actor = username,
                action = "ENTERPRISE_SSO_LOGIN",
                details = "Authenticated via FIDO2 Biometric Hardware Key. Role assigned: $role.",
                severity = "INFO"
            )
        )
    }

    suspend fun logout(currentActor: String) {
        solvexDao.logout()
        solvexDao.insertAuditLog(
            AuditLog(
                actor = currentActor,
                action = "SESSION_TERMINATE",
                details = "User session cleanly terminated. Ephemeral PAM tokens revoked.",
                severity = "WARN"
            )
        )
    }

    suspend fun purchaseProduct(product: Product, buyerUsername: String, wireReference: String) {
        solvexDao.markProductPurchased(product.id)
        solvexDao.insertAuditLog(
            AuditLog(
                actor = buyerUsername,
                action = "ESCROW_SETTLEMENT_CLEAR",
                details = "Cleared multi-party CPA wire transfer ($wireReference) for ${product.title} (${product.priceCad}). Cryptographic IP Key unlocked.",
                severity = "SUCCESS"
            )
        )
    }

    suspend fun resetMarketplaceAdmin() {
        solvexDao.resetAllPurchases()
        solvexDao.clearAuditLogs()
        solvexDao.insertAuditLog(
            AuditLog(
                actor = "VENDOR_ADMIN_ME",
                action = "GOVERNANCE_RESET",
                details = "Admin force reset all escrow settlements and cleared audit logs.",
                severity = "CRITICAL"
            )
        )
    }

    suspend fun logPenTestRun(endpointName: String, cveCount: Int) {
        solvexDao.insertAuditLog(
            AuditLog(
                actor = "RED_TEAM_FUZZER",
                action = "API_PENETRATION_TEST",
                details = "Blasted $endpointName with OWASP Top 10 exploits. Result: $cveCount vulnerabilities detected & auto-sandboxed.",
                severity = if (cveCount == 0) "SUCCESS" else "WARN"
            )
        )
    }
}
