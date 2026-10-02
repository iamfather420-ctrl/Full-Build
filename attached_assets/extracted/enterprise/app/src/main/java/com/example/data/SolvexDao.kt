package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SolvexDao {
    @Query("SELECT * FROM products ORDER BY priceNumeric DESC")
    fun getAllProducts(): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: String): Product?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<Product>)

    @Query("UPDATE products SET isPurchased = 1 WHERE id = :id")
    suspend fun markProductPurchased(id: String)

    @Query("UPDATE products SET isPurchased = 0")
    suspend fun resetAllPurchases()

    @Query("SELECT * FROM user_sessions WHERE id = 1")
    fun getCurrentSession(): Flow<UserSession?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSession(session: UserSession)

    @Query("DELETE FROM user_sessions")
    suspend fun logout()

    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC")
    fun getAuditLogs(): Flow<List<AuditLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAuditLog(log: AuditLog)

    @Query("DELETE FROM audit_logs")
    suspend fun clearAuditLogs()
}
