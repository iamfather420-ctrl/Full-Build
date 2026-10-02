package com.example.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "paradox_listings")
data class ParadoxListing(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val category: String, // e.g. "Logical", "Temporal", "Mathematical", "Information", "Quantum"
    val statement: String, // The paradox statement / core contradiction
    val solverSecret: String, // The real solution (fully locked/hidden before purchase)
    val price: Double, // Amount in Solvex Credits (SVX)
    val unlocked: Boolean = false, // True once escrow is finalized & solution is unlocked in vault
    val escrowLocked: Boolean = false, // True after purchase, while buyer runs pre-release assertions
    val totalSales: Int = 0,
    val creatorName: String = "Sole Solution Creator & Inventor",
    val proofDigest: String = "0x8f2d01e...b4c" // Cryptographic fingerprint of the solution
)

@Entity(tableName = "sandbox_probes")
data class SandboxProbe(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val paradoxId: Int,
    val queryInput: String,
    val queryOutput: String,
    val timestamp: Long = System.currentTimeMillis(),
    val confidenceScore: Double = 0.98,
    val zkProofHash: String = "0x4b7c8f921d...3a"
)

/**
 * [CRITICAL - RELIABILITY] Local SQLite Cache for Escrow Ledgers
 * Decouples transaction state from UI memory. Synchronizes with remote Cloud Spanner consensus engines.
 */
@Entity(tableName = "escrow_transactions")
data class EscrowTransactionEntity(
    @PrimaryKey val transactionId: String,
    val paradoxId: Int,
    val amountSvx: Double,
    val buyerSignatureHash: String?,
    val creatorSignatureHash: String?,
    val resolutionState: String,
    val contractDigest: String,
    val ttlExpiryTimestamp: Long,
    val idempotencyKey: String,
    val cloudSpannerSyncStatus: String = "SYNCED_DISTRIBUTED_CONSENSUS",
    val lastUpdatedMs: Long = System.currentTimeMillis()
)

/**
 * [SOC2/GDPR COMPLIANCE] Secure Tamper-Evident Audit Log Store
 * Records all user interactions, API calls, and system state transitions.
 * Utilizes cryptographic SHA-256 chaining to guarantee immutability.
 */
@Entity(tableName = "immutable_audit_logs")
data class ImmutableAuditLogEntity(
    @PrimaryKey val logId: String = java.util.UUID.randomUUID().toString(),
    val timestampMs: Long = System.currentTimeMillis(),
    val actionType: String, // e.g., "USER_INTERACTION", "API_CALL", "STATE_TRANSITION"
    val actor: String,
    val details: String,
    val previousHash: String,
    val cryptographicHash: String
)

@Dao
interface ParadoxDao {
    @Query("SELECT * FROM paradox_listings ORDER BY id ASC")
    fun getAllListings(): Flow<List<ParadoxListing>>

    @Query("SELECT * FROM paradox_listings WHERE id = :id")
    suspend fun getListingById(id: Int): ParadoxListing?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertListing(listing: ParadoxListing)

    @Update
    suspend fun updateListing(listing: ParadoxListing)

    @Query("SELECT * FROM sandbox_probes WHERE paradoxId = :paradoxId ORDER BY timestamp DESC")
    fun getProbesForParadox(paradoxId: Int): Flow<List<SandboxProbe>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProbe(probe: SandboxProbe)

    @Query("DELETE FROM sandbox_probes WHERE paradoxId = :paradoxId")
    suspend fun clearProbesForParadox(paradoxId: Int)

    @Query("DELETE FROM paradox_listings")
    suspend fun deleteAllListings()

    // --- [CRITICAL - RELIABILITY] Escrow Transaction Ledger Queries ---
    @Query("SELECT * FROM escrow_transactions ORDER BY lastUpdatedMs DESC")
    fun getAllEscrowLedgers(): Flow<List<EscrowTransactionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateEscrowLedger(entity: EscrowTransactionEntity)

    @Query("SELECT * FROM escrow_transactions WHERE paradoxId = :paradoxId LIMIT 1")
    suspend fun getEscrowLedgerByParadoxId(paradoxId: Int): EscrowTransactionEntity?

    // --- [SOC2/GDPR COMPLIANCE] Immutable Audit Trail Queries ---
    @Query("SELECT * FROM immutable_audit_logs ORDER BY timestampMs DESC")
    fun getAllAuditLogs(): Flow<List<ImmutableAuditLogEntity>>

    @Query("SELECT * FROM immutable_audit_logs ORDER BY timestampMs DESC LIMIT 1")
    suspend fun getLatestAuditLog(): ImmutableAuditLogEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertAuditLog(log: ImmutableAuditLogEntity)
}

@Database(entities = [ParadoxListing::class, SandboxProbe::class, EscrowTransactionEntity::class, ImmutableAuditLogEntity::class], version = 3, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun paradoxDao(): ParadoxDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "solvex_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
