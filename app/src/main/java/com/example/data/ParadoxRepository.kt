package com.example.data

import kotlinx.coroutines.flow.Flow

class ParadoxRepository(private val paradoxDao: ParadoxDao) {
    val allParadoxes: Flow<List<ParadoxEntity>> = paradoxDao.getAllParadoxes()
    val allAuditLogs: Flow<List<AuditLogEntity>> = paradoxDao.getAllAuditLogs()
    val wallet: Flow<UserWalletEntity?> = paradoxDao.getWallet()

    suspend fun getParadoxById(id: String): ParadoxEntity? = paradoxDao.getParadoxById(id)

    suspend fun insertParadoxes(paradoxes: List<ParadoxEntity>) {
        paradoxDao.insertParadoxes(paradoxes)
    }

    suspend fun updateParadox(paradox: ParadoxEntity) {
        paradoxDao.updateParadox(paradox)
    }

    suspend fun insertAuditLog(log: AuditLogEntity) {
        paradoxDao.insertAuditLog(log)
    }

    suspend fun updateWallet(wallet: UserWalletEntity) {
        paradoxDao.insertOrUpdateWallet(wallet)
    }

    suspend fun clearAuditLogs() {
        paradoxDao.clearAllAuditLogs()
    }
}
