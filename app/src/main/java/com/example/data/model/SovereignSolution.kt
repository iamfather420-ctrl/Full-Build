package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sovereign_solutions")
data class SovereignSolution(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val description: String,
    val learnedFrom: String,
    val implementationMethod: String,
    val performanceBoost: Double = 99.8,
    val createdAt: Long = System.currentTimeMillis()
)
