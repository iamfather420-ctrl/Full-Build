package com.example.engine

import com.example.data.TetherNode
import com.example.data.DaisyRepository
import kotlinx.coroutines.flow.first
import java.util.UUID

class TetherManager(
    private val repository: DaisyRepository,
    private val voiceCoPilot: VoiceCoPilot
) {

    /**
     * Binds to a user-authorized element. Assigns a unique session ID.
     */
    suspend fun bindToElement(name: String, targetElement: String, bucket: String): String {
        val sessionId = "node_${UUID.randomUUID().toString().substring(0, 8)}"
        val node = TetherNode(
            sessionId = sessionId,
            name = name,
            targetElement = targetElement,
            status = "CONNECTED",
            targetBucket = bucket,
            lastToken = ""
        )
        repository.insertTetherNode(node)
        repository.log("Bound browser session to element node '$targetElement' as $name. ID: $sessionId", "INFO")
        
        voiceCoPilot.speak("Successfully bound new MMTAI node $name to element $targetElement. Ready to stream.")
        return sessionId
    }

    /**
     * Writes token input into the element container.
     */
    suspend fun writeToInput(sessionId: String, tokenString: String) {
        val node = repository.getTetherNodeById(sessionId)
        if (node == null) {
            repository.log("Cannot write to input: Node $sessionId not found.", "ERROR")
            return
        }
        
        if (node.status == "RATE_LIMITED" || node.status == "DISCONNECTED") {
            triggerCircuitBreaker(sessionId, "Node in unstable state: ${node.status}")
            return
        }

        val updatedNode = node.copy(
            status = "SYNCING",
            lastToken = tokenString
        )
        repository.insertTetherNode(updatedNode)
        repository.log("Programmatically injecting token string: \"$tokenString\" into ${node.name} [${node.targetElement}]", "INFO")
    }

    /**
     * Simulates DOM observer reading response streams token-by-token.
     * In a production Chrome context, this acts as the callback from MutationObserver.
     */
    suspend fun receiveResponseToken(sessionId: String, token: String) {
        val node = repository.getTetherNodeById(sessionId) ?: return
        
        // Check for common rate limiting trigger words or simulated failures
        if (token.contains("429") || token.contains("Too Many Requests") || token.contains("Rate Limit Exceeded")) {
            triggerCircuitBreaker(sessionId, "HTTP 429 Rate Limit Encountered on external endpoint.")
            return
        }

        if (token.contains("Layout Mutation Error") || token.contains("DOM Anchor Severed")) {
            triggerCircuitBreaker(sessionId, "DOM element layout mutated unexpectedly.")
            return
        }

        val updatedNode = node.copy(
            status = "CONNECTED",
            lastToken = token,
            errorCount = 0
        )
        repository.insertTetherNode(updatedNode)
    }

    /**
     * Instantly trips the circuit breaker on failures, rolls back state, and hot-swaps active tasks.
     */
    suspend fun triggerCircuitBreaker(sessionId: String, reason: String) {
        val node = repository.getTetherNodeById(sessionId) ?: return
        
        repository.log("Circuit breaker TRIPPED for ${node.name}: $reason", "CIRCUIT_BREAKER")
        voiceCoPilot.speak("${node.name} hit a limit. Automatically tripping circuit breaker and rerouting workload.")

        val brokenNode = node.copy(
            status = "RATE_LIMITED",
            errorCount = node.errorCount + 1,
            rateLimitedAt = System.currentTimeMillis()
        )
        repository.insertTetherNode(brokenNode)

        // Attempt a hot-swap to another healthy tethered session
        val healthyAlternative = repository.tetherNodes.first().firstOrNull { 
            it.sessionId != sessionId && it.status == "CONNECTED" 
        }

        if (healthyAlternative != null) {
            repository.log("Hot-swapped context to active node: ${healthyAlternative.name}", "ROUTING")
            voiceCoPilot.speak("Rerouting execution from broken node to open ${healthyAlternative.name} text box now.")
            
            // Move target bucket association or task mapping
            val remappedNode = healthyAlternative.copy(
                targetBucket = node.targetBucket,
                status = "HOT_SWAPPING"
            )
            repository.insertTetherNode(remappedNode)
        } else {
            repository.log("No healthy alternative node available to handle hot-swap!", "WARNING")
            voiceCoPilot.speak("Warning. No available backup nodes in current cluster. Session is stalled.")
        }
    }
}
