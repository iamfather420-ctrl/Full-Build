package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_sessions")
data class UserSession(
    @PrimaryKey val id: Int = 1,
    val username: String,
    val role: String, // "ME_ADMIN" or "CLIENT_BUYER"
    val institution: String,
    val loggedInAt: Long = System.currentTimeMillis()
)
