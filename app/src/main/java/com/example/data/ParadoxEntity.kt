package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "paradoxes")
data class ParadoxEntity(
    @PrimaryKey val id: String,
    val title: String,
    val summary: String,
    val paradoxStatement: String,
    val secureSolution: String,
    val technicalStack: String,
    val difficulty: String, // e.g., "Critical", "Extreme", "Sovereign"
    val category: String, // e.g., "Financial", "Compliance", "Infrastructure", "Security"
    val costUsd: Double,
    val isLicensed: Boolean = false,
    val cryptographicPrimitives: String // comma-separated list
)
