// Converted native logic from Daos.kt
/*
package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface TetherNodeDao {
    @Query("SELECT * FROM tether_nodes ORDER BY timestamp DESC")
    fun getAllTethers(): Flow<List<TetherNode>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTether(node: TetherNode)

    @Query("DELETE FROM tether_nodes WHERE id = :id")
    suspend fun deleteTether(id: Int)

    @Query("DELETE FROM tether_nodes")
    suspend fun clearAll()
}

@Dao
interface LogEventDao {
    @Query("SELECT * FROM log_events ORDER BY timestamp DESC LIMIT 100")
    fun getRecentLogs(): Flow<List<LogEvent>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: LogEvent)

    @Query("DELETE FROM log_events")
    suspend fun clearAll()
}

@Dao
interface B2BAccountDao {
    @Query("SELECT * FROM b2b_accounts LIMIT 1")
    fun getActiveAccountFlow(): Flow<B2BAccount?>

    @Query("SELECT * FROM b2b_accounts LIMIT 1")
    suspend fun getActiveAccount(): B2BAccount?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAccount(account: B2BAccount)

    @Update
    suspend fun updateAccount(account: B2BAccount)

    @Query("DELETE FROM b2b_accounts")
    suspend fun clearAll()
}

@Dao
interface ConsensusTaskDao {
    @Query("SELECT * FROM consensus_tasks ORDER BY timestamp DESC")
    fun getAllTasks(): Flow<List<ConsensusTask>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTask(task: ConsensusTask)

    @Query("DELETE FROM consensus_tasks WHERE id = :id")
    suspend fun deleteTask(id: Int)

    @Query("DELETE FROM consensus_tasks")
    suspend fun clearAll()
}

@Dao
interface SolvedParadoxDao {
    @Query("SELECT * FROM solved_paradoxes ORDER BY id ASC")
    fun getAllParadoxes(): Flow<List<SolvedParadox>>

    @Query("SELECT * FROM solved_paradoxes ORDER BY id ASC")
    suspend fun getAllParadoxesList(): List<SolvedParadox>

    @Query("SELECT COUNT(*) FROM solved_paradoxes")
    suspend fun getCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertParadox(paradox: SolvedParadox)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(paradoxes: List<SolvedParadox>)

    @Query("DELETE FROM solved_paradoxes WHERE id = :id")
    suspend fun deleteParadox(id: Int)

    @Query("DELETE FROM solved_paradoxes")
    suspend fun clearAll()
}

@Dao
interface BalanceSheetDao {
    @Query("SELECT * FROM balance_sheet_records ORDER BY timestamp DESC")
    fun getAllRecords(): Flow<List<BalanceSheetRecord>>

    @Query("SELECT * FROM balance_sheet_records ORDER BY timestamp DESC")
    suspend fun getAllRecordsList(): List<BalanceSheetRecord>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: BalanceSheetRecord)

    @Query("DELETE FROM balance_sheet_records")
    suspend fun clearAll()
}


*/
