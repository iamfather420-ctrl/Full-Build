package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "b2b_accounts")
data class B2BAccount(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val companyName: String,
    val ein: String,
    val email: String = "",
    val corporateEmail: String = email,
    val isVerified: Boolean = false,
    val balance: Double = 0.0,
    val timestamp: Long = System.currentTimeMillis(),
    val operatingCapital: Double = 0.0,
    val taxReserve: Double = 0.0,
    val taxRemitted: Double = 0.0
)
