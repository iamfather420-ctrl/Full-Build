package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ParadoxDao {
    @Query("SELECT * FROM paradoxes")
    fun getAllParadoxes(): Flow<List<ParadoxEntity>>

    @Query("SELECT * FROM paradoxes WHERE id = :id LIMIT 1")
    suspend fun getParadoxById(id: String): ParadoxEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertParadoxes(paradoxes: List<ParadoxEntity>)

    @Update
    suspend fun updateParadox(paradox: ParadoxEntity)

    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC")
    fun getAllAuditLogs(): Flow<List<AuditLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAuditLog(log: AuditLogEntity)

    @Query("SELECT * FROM user_wallet WHERE id = 1 LIMIT 1")
    fun getWallet(): Flow<UserWalletEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateWallet(wallet: UserWalletEntity)

    @Query("DELETE FROM audit_logs")
    suspend fun clearAllAuditLogs()
}
