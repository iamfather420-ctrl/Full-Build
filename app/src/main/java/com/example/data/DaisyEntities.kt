package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "ingress_files")
data class IngressFile(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val path: String,
    val bucket: String, // "MAIN", "SOURCE", "METADATA"
    val content: String,
    val size: Long,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "daisy_tether_nodes")
data class DaisyTetherNode(
    @PrimaryKey val sessionId: String,
    val name: String, // e.g. "Google AI Studio Node Alpha", "Meta AI Node Beta"
    val targetElement: String, // e.g. "div.prompt-textarea", "textarea[name='prompt']"
    val status: String, // "CONNECTED", "SYNCING", "DISCONNECTED", "HOT_SWAPPING", "RATE_LIMITED"
    val targetBucket: String, // "MAIN", "SOURCE", "METADATA"
    val lastToken: String,
    val errorCount: Int = 0,
    val rateLimitedAt: Long = 0L,
    val xPosition: Float = 100f,
    val yPosition: Float = 300f
)

@Entity(tableName = "discovery_links")
data class DiscoveryLink(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val url: String,
    val description: String,
    val status: String, // "PENDING", "CONNECTED"
    val requiredInfo: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "daisy_consensus_tasks")
data class DaisyConsensusTask(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val objective: String,
    val status: String, // "SPLIT", "REDUCING", "COMPLETED", "ARBITRATING"
    val parentId: Long = 0L, // 0 for parent task
    val assignedNodeId: String = "", // sessionId of the tether node
    val resultCode: String = "",
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "daisy_log_events")
data class DaisyLogEvent(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val message: String,
    val type: String, // "INFO", "WARNING", "ERROR", "CIRCUIT_BREAKER", "TTS", "ROUTING"
    val timestamp: Long = System.currentTimeMillis()
)

@Dao
interface DaisyDao {
    // Ingress files
    @Query("SELECT * FROM ingress_files ORDER BY timestamp DESC")
    fun getAllIngressFiles(): Flow<List<IngressFile>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIngressFile(file: IngressFile)

    @Query("DELETE FROM ingress_files")
    suspend fun clearAllIngressFiles()

    // Tether nodes
    @Query("SELECT * FROM daisy_tether_nodes")
    fun getAllTetherNodes(): Flow<List<DaisyTetherNode>>

    @Query("SELECT * FROM daisy_tether_nodes WHERE sessionId = :sessionId")
    suspend fun getTetherNodeById(sessionId: String): DaisyTetherNode?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTetherNode(node: DaisyTetherNode)

    @Query("DELETE FROM daisy_tether_nodes WHERE sessionId = :sessionId")
    suspend fun deleteTetherNode(sessionId: String)

    @Query("DELETE FROM daisy_tether_nodes")
    suspend fun clearAllTetherNodes()

    // Discovery links
    @Query("SELECT * FROM discovery_links ORDER BY timestamp DESC")
    fun getAllDiscoveryLinks(): Flow<List<DiscoveryLink>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDiscoveryLink(link: DiscoveryLink)

    @Query("DELETE FROM discovery_links")
    suspend fun clearAllDiscoveryLinks()

    // Consensus tasks
    @Query("SELECT * FROM daisy_consensus_tasks ORDER BY timestamp DESC")
    fun getAllConsensusTasks(): Flow<List<DaisyConsensusTask>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConsensusTask(task: DaisyConsensusTask): Long

    @Query("DELETE FROM daisy_consensus_tasks")
    suspend fun clearAllConsensusTasks()

    // Log events
    @Query("SELECT * FROM daisy_log_events ORDER BY timestamp DESC LIMIT 100")
    fun getAllLogEvents(): Flow<List<DaisyLogEvent>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLogEvent(event: DaisyLogEvent)

    @Query("DELETE FROM daisy_log_events")
    suspend fun clearAllLogEvents()
}

@Database(
    entities = [
        IngressFile::class,
        DaisyTetherNode::class,
        DiscoveryLink::class,
        DaisyConsensusTask::class,
        DaisyLogEvent::class
    ],
    version = 1,
    exportSchema = false
)
abstract class DaisyDatabase : RoomDatabase() {
    abstract fun daisyDao(): DaisyDao
}
