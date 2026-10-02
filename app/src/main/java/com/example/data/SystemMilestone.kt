package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "system_milestones")
data class SystemMilestone(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val lamportTimestamp: Long,
    val actionType: String,
    val details: String, // Stored in XML log format as requested
    val timestamp: Long = System.currentTimeMillis()
)
