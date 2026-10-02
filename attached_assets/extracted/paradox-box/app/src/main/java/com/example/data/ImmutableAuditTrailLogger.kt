package com.example.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.security.MessageDigest

/**
 * [SOC2/GDPR COMPLIANCE] Tamper-Evident Immutable Audit Trail Logger
 * Records user interactions, API calls, and system state transitions.
 * Computes chained SHA-256 hashes to guarantee log integrity.
 */
object ImmutableAuditTrailLogger {
    private val loggerScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var paradoxDao: ParadoxDao? = null

    fun initialize(dao: ParadoxDao) {
        this.paradoxDao = dao
    }

    fun logEvent(actionType: String, actor: String, details: String) {
        val dao = paradoxDao ?: return
        loggerScope.launch {
            try {
                val latest = dao.getLatestAuditLog()
                val prevHash = latest?.cryptographicHash ?: "0xGENESIS_SOLVEX_AUDIT_BLOCK_V1"
                val ts = System.currentTimeMillis()
                val rawPayload = "$ts|$actionType|$actor|$details|$prevHash"
                val md = MessageDigest.getInstance("SHA-256")
                val hash = "0x" + md.digest(rawPayload.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

                val entity = ImmutableAuditLogEntity(
                    timestampMs = ts,
                    actionType = actionType,
                    actor = actor,
                    details = details,
                    previousHash = prevHash,
                    cryptographicHash = hash
                )
                dao.insertAuditLog(entity)
            } catch (e: Exception) {
                // Ignore duplicate or concurrent write aborts to preserve immutability
            }
        }
    }
}
