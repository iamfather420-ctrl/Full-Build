package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tether_bubbles")
data class TetherBubble(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val text: String,
    val sourceScreen: String,
    val createdAt: Long = System.currentTimeMillis(),
    val isSelected: Boolean = false
)
