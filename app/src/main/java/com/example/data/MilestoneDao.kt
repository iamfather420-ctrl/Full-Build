package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface MilestoneDao {
    @Query("SELECT * FROM system_milestones ORDER BY lamportTimestamp DESC, id DESC")
    fun getAllMilestones(): Flow<List<SystemMilestone>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMilestone(milestone: SystemMilestone)

    @Query("SELECT MAX(lamportTimestamp) FROM system_milestones")
    suspend fun getMaxLamportTimestamp(): Long?

    @Query("SELECT * FROM b2b_accounts LIMIT 1")
    fun getActiveAccount(): Flow<B2BAccount?>

    @Query("SELECT * FROM b2b_accounts LIMIT 1")
    suspend fun getActiveAccountDirect(): B2BAccount?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateAccount(account: B2BAccount)

    @Query("DELETE FROM b2b_accounts")
    suspend fun clearAccounts()

    @Query("DELETE FROM system_milestones")
    suspend fun clearMilestones()
}
