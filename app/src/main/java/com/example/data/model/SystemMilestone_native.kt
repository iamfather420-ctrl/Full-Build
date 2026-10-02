package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "system_milestones")
data class SystemMilestone(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val description: String,
    val timestamp: Long = System.currentTimeMillis(),
    val milestoneType: String // e.g. "LEARNED_SOLUTION", "PARADOX_REALIGNED", "SANDBOX_COMPILATION"
)
