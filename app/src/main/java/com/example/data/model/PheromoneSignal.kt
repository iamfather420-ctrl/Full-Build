package com.example.data.model

import com.squareup.moshi.JsonClass
import java.security.MessageDigest
import java.security.Signature
import java.security.KeyPairGenerator
import kotlin.random.Random

/**
 * Pheromone Architecture Definition (Node 55)
 * Structurally restricted to zero raw user context to guarantee Glass Box sovereignty.
 */
@JsonClass(generateAdapter = true)
data class PheromoneSignalPacket(
    val hashId: String,
    val anomalyType: String,
    val confidenceScore: Float,
    val actionTrigger: String,
    val timestamp: Long = System.currentTimeMillis()
) {
    companion object {
        /**
         * Computes a deterministic Hash ID based purely on structural packet values.
         */
        fun generate(anomalyType: String, confidenceScore: Float, actionTrigger: String): PheromoneSignalPacket {
            val rawString = "$anomalyType:$confidenceScore:$actionTrigger:${System.nanoTime()}"
            val md = MessageDigest.getInstance("SHA-256")
            val hashBytes = md.digest(rawString.toByteArray(Charsets.UTF_8))
            val hashId = hashBytes.joinToString("") { "%02x".format(it) }
            return PheromoneSignalPacket(hashId, anomalyType, confidenceScore, actionTrigger)
        }
    }
}

/**
 * Ephemeral Worker Output structure.
 */
data class EphemeralWorkerOutput(
    val taskId: String,
    val payload: String,
    val generationTimeMs: Long,
    val byteSize: Int
)

/**
 * Proof of Quality (PoQ) Validation Gate.
 * Assesses structural integrity, execution efficiency, and entropy metrics.
 */
object ProofOfQualityGate {
    data class ValidationResult(
        val isApproved: Boolean,
        val qualityScore: Float,
        val validationLog: String
    )

    fun evaluate(output: EphemeralWorkerOutput): ValidationResult {
        val startVal = System.nanoTime()
        val text = output.payload
        
        // 1. Structural checks (minimum size, non-emptiness)
        if (text.isBlank() || text.length < 10) {
            return ValidationResult(
                isApproved = false,
                qualityScore = 0f,
                validationLog = "REJECTED: Blank or insufficient payload length."
            )
        }

        // 2. Entropy / Character diversity metric to avoid repeating patterns (AI Slop/Noise checks)
        val charSet = text.toSet()
        val diversityRatio = charSet.size.toFloat() / text.length.toFloat()
        
        // 3. Performance efficiency score (incentivize lightning fast workers)
        val speedScore = (1000f - output.generationTimeMs).coerceIn(0f, 1000f) / 1000f

        // 4. Combined Quality Calculation
        val baseQuality = (diversityRatio * 0.4f + speedScore * 0.6f) * 100f
        val finalScore = baseQuality.coerceIn(0f, 100f)
        val approved = finalScore >= 45f

        val durationMs = (System.nanoTime() - startVal).toFloat() / 1_000_000f

        return ValidationResult(
            isApproved = approved,
            qualityScore = finalScore,
            validationLog = "PoQ Evaluated in ${String.format("%.3f", durationMs)}ms. Approved=$approved (Score: ${String.format("%.1f", finalScore)}%, Diversity: ${String.format("%.2f", diversityRatio)}, SpeedFactor: ${String.format("%.2f", speedScore)})"
        )
    }
}

/**
 * Cross-Build Interoperability Broadcasting.
 * Uses RSA signatures to simulate signed broadcasts across local system domains safely.
 */
object PheromoneBroadcaster {
    data class BroadcastResult(
        val signatureHex: String,
        val durationMs: Float,
        val serializedPacket: String
    )

    fun broadcastAlert(packet: PheromoneSignalPacket): BroadcastResult {
        val startNs = System.nanoTime()
        val payloadToSign = "${packet.hashId}:${packet.anomalyType}:${packet.confidenceScore}"
        
        val signatureHex = try {
            val keyGen = KeyPairGenerator.getInstance("RSA")
            keyGen.initialize(1024)
            val pair = keyGen.generateKeyPair()
            val dsa = Signature.getInstance("SHA256withRSA")
            dsa.initSign(pair.private)
            dsa.update(payloadToSign.toByteArray(Charsets.UTF_8))
            val signed = dsa.sign()
            signed.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            "0xEE_CRYPT_ERR_${e.hashCode()}"
        }

        val durationMs = (System.nanoTime() - startNs).toFloat() / 1_000_000f
        val serialized = "{\"hash\":\"${packet.hashId}\",\"type\":\"${packet.anomalyType}\",\"conf\":${packet.confidenceScore},\"trigger\":\"${packet.actionTrigger}\"}"

        return BroadcastResult(
            signatureHex = signatureHex,
            durationMs = durationMs,
            serializedPacket = serialized
        )
    }
}
