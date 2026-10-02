package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "products")
@Serializable
data class Product(
    @PrimaryKey val id: String,
    val title: String,
    val subtitle: String,
    val domain: String,
    val priceCad: String,
    val priceNumeric: Long,
    val description: String,
    val dueDiligenceSpecs: String,
    val zkHashTeaser: String,
    val executablePayload: String,
    val isPurchased: Boolean = false,
    val slaUptime: String = "99.999% SLA",
    val complianceStatus: String = "SOC2 Type 2 • OSFI B-13 Verified"
)
