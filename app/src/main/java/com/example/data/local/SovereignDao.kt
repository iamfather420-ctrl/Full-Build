package com.example.data.local

import androidx.room.*
import com.example.data.model.TetherBubble
import com.example.data.model.SovereignSolution
import com.example.data.model.SystemMilestone
import kotlinx.coroutines.flow.Flow

@Dao
interface SovereignDao {

    // --- Tether Bubbles ---
    @Query("SELECT * FROM tether_bubbles ORDER BY createdAt DESC")
    fun getAllTetherBubbles(): Flow<List<TetherBubble>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTetherBubble(bubble: TetherBubble): Long

    @Update
    suspend fun updateTetherBubble(bubble: TetherBubble)

    @Query("UPDATE tether_bubbles SET isSelected = :selected")
    suspend fun updateAllSelection(selected: Boolean)

    @Query("DELETE FROM tether_bubbles WHERE id = :id")
    suspend fun deleteTetherBubbleById(id: Long)

    @Query("DELETE FROM tether_bubbles")
    suspend fun clearAllTetherBubbles()


    // --- Sovereign Solutions ---
    @Query("SELECT * FROM sovereign_solutions ORDER BY createdAt DESC")
    fun getAllSolutions(): Flow<List<SovereignSolution>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSolution(solution: SovereignSolution): Long

    @Query("DELETE FROM sovereign_solutions WHERE id = :id")
    suspend fun deleteSolutionById(id: Long)

    @Query("DELETE FROM sovereign_solutions")
    suspend fun clearAllSolutions()


    // --- System Milestones ---
    @Query("SELECT * FROM system_milestones ORDER BY timestamp DESC")
    fun getAllMilestones(): Flow<List<SystemMilestone>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMilestone(milestone: SystemMilestone): Long

    @Query("DELETE FROM system_milestones")
    suspend fun clearAllMilestones()
}
