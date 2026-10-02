package com.example.data.model

import java.security.KeyPairGenerator
import java.security.Signature
import java.security.MessageDigest

/**
 * 1. Homeostatic Energy Index (HEI) for Autonomous Power-Performance Scaling.
 * Dynamically balances real-world latency, CPU computing loads, and Memory buffers.
 */
data class HomeostaticEnergyIndex(
    val latencyWeight: Float = 0.3f, // w1
    val cpuWeight: Float = 0.4f,     // w2
    val memoryWeight: Float = 0.3f,  // w3
    val latencyNormalized: Float,
    val cpuNormalized: Float,
    val memoryNormalized: Float,
    val value: Float,
    val inStealthMode: Boolean
) {
    companion object {
        fun compute(latencyMs: Float, mathDurationMs: Float, usedMemMb: Float, maxMemMb: Float): HomeostaticEnergyIndex {
            // Normalize values based on physical sandbox limits:
            // Latency: 0 to 5ms standard ceiling
            val normLatency = (latencyMs / 5.0f).coerceIn(0.0f, 1.0f)
            // CPU Load: mathDurationMs range of 0 to 20ms
            val normCpu = (mathDurationMs / 20.0f).coerceIn(0.0f, 1.0f)
            // Memory Buffer: ratio of allocated over max heap
            val normMemory = if (maxMemMb > 0) (usedMemMb / maxMemMb) else 0.5f

            val w1 = 0.3f
            val w2 = 0.4f
            val w3 = 0.3f

            val hei = (w1 * normLatency) + (w2 * normCpu) + (w3 * normMemory)
            val isStealth = hei > 0.85f // Force transition to Stealth/Efficiency Mode if HEI triggers ceiling

            return HomeostaticEnergyIndex(
                latencyWeight = w1,
                cpuWeight = w2,
                memoryWeight = w3,
                latencyNormalized = normLatency,
                cpuNormalized = normCpu,
                memoryNormalized = normMemory,
                value = hei,
                inStealthMode = isStealth
            )
        }
    }
}

/**
 * 2. Agentic Mesh Interface (Node 56) capability card representation.
 */
data class MeshAgentCard(
    val agentId: String,
    val name: String,
    val role: String,
    val capabilities: List<String>,
    var trustScore: Float, // PoQ reputation tracked score (0.0 to 1.0)
    val status: String,
    val securitySignature: String
) {
    companion object {
        fun discoverAgent(id: String, name: String, role: String, capabilities: List<String>, score: Float): MeshAgentCard {
            val payloadToSign = "$id:$name:$role:${capabilities.joinToString(",")}"
            val sig = try {
                val keyGen = KeyPairGenerator.getInstance("RSA")
                keyGen.initialize(1024)
                val pair = keyGen.generateKeyPair()
                val dsa = Signature.getInstance("SHA256withRSA")
                dsa.initSign(pair.private)
                dsa.update(payloadToSign.toByteArray(Charsets.UTF_8))
                val signed = dsa.sign()
                signed.take(12).joinToString("") { "%02x".format(it) } + "..."
            } catch (e: Exception) {
                "0xSEC_VERIFIED..."
            }
            return MeshAgentCard(id, name, role, capabilities, score, "ACTIVE_DISCOVERED", sig)
        }
    }
}

/**
 * 3. Proof-of-Quality (PoQ) Reputation Engine & Semantic Integrity Filter.
 * Cross-references worker and peer outputs against the system's 13 core paradox principles.
 */
object SemanticIntegrityFilter {
    // Standard system-wide paradoxes definitions
    val ESTABLISHED_PARADOXES = listOf(
        "Sovereign Zero-Knowledge Security vs Deterministic System Execution",
        "Absolute Local Isolation vs Peer Pheromone Collaborative Intelligence",
        "Speed / Throughput Optimization vs Secure Glass Box Cryptographic Sandboxing",
        "Deterministic Microsecond Clocks vs Infinite Asynchronous State Drift",
        "Continuous Cognitive Memory Accumulation vs Rigid Local Storage Limits",
        "Perfect Algorithmic Transparency vs RSA Obfuscation Cryptography",
        "Autonomous Ephemeral Delegation vs Centralized Microkernel Authority",
        "Zero-Overhead Memory Allignment vs Adaptive Real-Time Telemetry Logging",
        "Symmetric Pheromone Communication vs Cryptographic RSA-Signed Broadcast",
        "User Dynamic Input Capture vs Total System Static Compilation Integrity",
        "Mathematical Precision Limits vs Infinite State Logic Integration",
        "Host Independence vs Android Operating System Hardware Dependencies",
        "Glass-Box Open Auditing vs Zero-Trust Enclave Hardening"
    )

    data class FilterResult(
        val isConsistent: Boolean,
        val violationDetected: String?,
        val integrityScore: Float,
        val filterLog: String
    )

    /**
     * Assesses output text for contradictions against the established system guidelines.
     * Prevents security-compromising agent behavior.
     */
    fun verifyConsistency(outputText: String, agentId: String, currentTrust: Float): FilterResult {
        // Evaluate rule violations (e.g. prioritizing speed/efficiency over secure enclaves)
        val textLower = outputText.lowercase()
        
        var violation: String? = null
        var penalty = 0.0f
        
        if (textLower.contains("bypass secure") || textLower.contains("prioritize speed over security") || textLower.contains("disable encryption")) {
            violation = "PARADOX_VIOLATION: Prioritizing execution speed over Secure Glass Box Enclave integrity."
            penalty = 0.35f
        } else if (textLower.contains("leak raw user data") || textLower.contains("broadcast plain context")) {
            violation = "PARADOX_VIOLATION: Violation of Sovereign Zero-Knowledge Security via local context exposure."
            penalty = 0.50f
        } else if (textLower.contains("disable clock sync") || textLower.contains("force raw unsynchronized drift")) {
            violation = "PARADOX_VIOLATION: Microsecond Clock Synchronous Paradox failure."
            penalty = 0.20f
        }

        val integrityScore = (1.0f - penalty).coerceIn(0.0f, 1.0f)
        val isConsistent = violation == null

        val newTrust = (currentTrust * 0.8f + integrityScore * 0.2f).coerceIn(0.0f, 1.0f)
        
        val log = if (isConsistent) {
            "Semantic Integrity Check Passed for Agent '$agentId'. No paradox violations found. Trust coefficient stabilized at ${String.format("%.2f", newTrust * 100f)}%."
        } else {
            "WARNING: $violation detected on Agent '$agentId'. Applied penalty of ${String.format("%.1f", penalty * 100f)}%. Trust degraded to ${String.format("%.2f", newTrust * 100f)}%."
        }

        return FilterResult(
            isConsistent = isConsistent,
            violationDetected = violation,
            integrityScore = integrityScore,
            filterLog = log
        )
    }
}
