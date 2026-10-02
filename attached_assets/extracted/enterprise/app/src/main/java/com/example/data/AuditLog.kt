package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "audit_logs")
data class AuditLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val actor: String,
    val action: String,
    val details: String,
    val severity: String // "INFO", "WARN", "CRITICAL", "SUCCESS"
)
