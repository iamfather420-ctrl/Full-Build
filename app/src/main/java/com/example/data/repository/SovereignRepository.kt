package com.example.data.repository

import com.example.data.local.SovereignDao
import com.example.data.model.TetherBubble
import com.example.data.model.SovereignSolution
import com.example.data.model.SystemMilestone
import com.example.data.model.AppState
import kotlinx.coroutines.flow.Flow

class SovereignRepository(private val dao: SovereignDao) {

    val allTetherBubbles: Flow<List<TetherBubble>> = dao.getAllTetherBubbles()
    val allSolutions: Flow<List<SovereignSolution>> = dao.getAllSolutions()
    val allMilestones: Flow<List<SystemMilestone>> = dao.getAllMilestones()

    suspend fun insertTetherBubble(bubble: TetherBubble): Long {
        return dao.insertTetherBubble(bubble)
    }

    suspend fun updateTetherBubble(bubble: TetherBubble) {
        dao.updateTetherBubble(bubble)
    }

    suspend fun updateAllSelection(selected: Boolean) {
        dao.updateAllSelection(selected)
    }

    suspend fun deleteTetherBubbleById(id: Long) {
        dao.deleteTetherBubbleById(id)
    }

    suspend fun clearAllTetherBubbles() {
        dao.clearAllTetherBubbles()
    }

    suspend fun insertSolution(solution: SovereignSolution): Long {
        return dao.insertSolution(solution)
    }

    suspend fun deleteSolutionById(id: Long) {
        dao.deleteSolutionById(id)
    }

    suspend fun clearAllSolutions() {
        dao.clearAllSolutions()
    }

    suspend fun insertMilestone(milestone: SystemMilestone): Long {
        return dao.insertMilestone(milestone)
    }

    suspend fun clearAllMilestones() {
        dao.clearAllMilestones()
    }

    suspend fun reconcileState(localState: AppState, remoteState: AppState): AppState {
        return if (localState.version >= remoteState.version) {
            pushToRemote(localState)
            localState.copy(isDirty = false)
        } else {
            remoteState.copy(isDirty = false)
        }
    }

    private suspend fun pushToRemote(state: AppState) {
        // Simulates pushing reconciled state to external mesh DHT nodes
    }
}
