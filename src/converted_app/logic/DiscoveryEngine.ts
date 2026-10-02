// Converted native logic from DiscoveryEngine.kt
/*
package com.example.engine

import com.example.data.DiscoveryLink
import com.example.data.IngressFile
import com.example.data.DaisyRepository
import org.json.JSONArray
import org.json.JSONObject

class DiscoveryEngine(
    private val repository: DaisyRepository,
    private val voiceCoPilot: VoiceCoPilot
) {

    /**
     * Predictive logic that analyzes user requirements against the current codebase state.
     */
    suspend fun analyzeRequirements(prompt: String, currentFiles: List<IngressFile>) {
        repository.log("Discovery Engine initiated. Scanning codebase files for requirements analysis...", "INFO")
        repository.clearAllDiscoveryLinks()

        var success = false
        try {
            val filesSummary = currentFiles.joinToString("\n") { "- ${it.path} (${it.size} bytes)" }
            val systemInstruction = """
                You are DAISY's Discovery Engine. 
                Analyze the user's software architecture request against the current codebase files in the sandbox.
                Identify missing external services, protocols, APIs, or libraries that the user will need to learn about or integrate to complete their goal.
                Return a valid JSON array of objects, where each object has these exact fields:
                - "title": (String) name of the documentation, api spec, or library reference
                - "url": (String) valid web URL of the official docs/references (e.g. https://stripe.com/docs/api, https://firebase.google.com/docs, etc.)
                - "description": (String) how this fits into their project goal
                - "requiredInfo": (String) specific classes, parameters, headers, or API contracts that they need to pay attention to.

                Do not wrap the JSON inside markdown. Return ONLY the raw JSON array string.
            """.trimIndent()

            val promptForGemini = """
                User Request Goal: "$prompt"

                Current Sandbox Files:
                $filesSummary
            """.trimIndent()

            repository.log("Calling real Gemini API to discover architectural gaps...", "INFO")
            val jsonResponse = GeminiClient.getCompletion(promptForGemini, systemInstruction, jsonOutput = true)
            
            // Clean markdown response wrapping if any
            val cleanJson = cleanJsonResponse(jsonResponse)
            
            val jsonArray = JSONArray(cleanJson)
            if (jsonArray.length() > 0) {
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val gap = DiscoveryLink(
                        title = obj.optString("title", "Reference doc"),
                        url = obj.optString("url", "https://developer.android.com"),
                        description = obj.optString("description", "Required reference material"),
                        status = "PENDING",
                        requiredInfo = obj.optString("requiredInfo", "General classes and configurations")
                    )
                    repository.insertDiscoveryLink(gap)
                }
                val verb = if (jsonArray.length() == 1) "1 target link" else "${jsonArray.length()} target links"
                voiceCoPilot.speak("I've analyzed your project and cataloged requirements. I've generated $verb to acquire missing schemas.")
                repository.log("Discovery complete via Gemini API: generated ${jsonArray.length()} anchor discovery links.", "INFO")
                success = true
            }
        } catch (e: Exception) {
            repository.log("Gemini API Discovery skipped or failed: ${e.message}. Falling back to predictive local dictionary...", "WARNING")
        }

        if (!success) {
            runFallbackPredictiveAnalysis(prompt, currentFiles)
        }
    }

    private fun cleanJsonResponse(response: String): String {
        var clean = response.trim()
        if (clean.startsWith("```json")) {
            clean = clean.removePrefix("```json")
        } else if (clean.startsWith("```")) {
            clean = clean.removePrefix("```")
        }
        if (clean.endsWith("```")) {
            clean = clean.removeSuffix("```")
        }
        return clean.trim()
    }

    private suspend fun runFallbackPredictiveAnalysis(prompt: String, currentFiles: List<IngressFile>) {
        val missingGaps = mutableListOf<DiscoveryLink>()
        val lowercasePrompt = prompt.lowercase()

        // 1. Stripe/Payment Gaps
        if (lowercasePrompt.contains("payment") || lowercasePrompt.contains("stripe") || lowercasePrompt.contains("checkout")) {
            val hasStripe = currentFiles.any { it.content.contains("stripe", ignoreCase = true) }
            if (!hasStripe) {
                missingGaps.add(
                    DiscoveryLink(
                        title = "Stripe Core API Spec",
                        url = "https://stripe.com/docs/api",
                        description = "Required schemas for implementing decentralized payment tethers.",
                        status = "PENDING",
                        requiredInfo = "Stripe-Signature, PaymentIntent validation contracts"
                    )
                )
            }
        }

        // 2. Weather/Weather API Gaps
        if (lowercasePrompt.contains("weather") || lowercasePrompt.contains("temp")) {
            val hasWeather = currentFiles.any { it.content.contains("weather", ignoreCase = true) }
            if (!hasWeather) {
                missingGaps.add(
                    DiscoveryLink(
                        title = "OpenWeather One Call v3 Contract",
                        url = "https://openweathermap.org/api/one-call-3",
                        description = "Standard dynamic API payload format required to map weather nodes.",
                        status = "PENDING",
                        requiredInfo = "OneCallResponse schema, kelvin-to-celsius parser mapping"
                    )
                )
            }
        }

        // 3. Database/Room persistence contracts
        if (lowercasePrompt.contains("database") || lowercasePrompt.contains("room") || lowercasePrompt.contains("persist")) {
            val hasRoom = currentFiles.any { it.content.contains("@Database") }
            if (!hasRoom) {
                missingGaps.add(
                    DiscoveryLink(
                        title = "Jetpack Room Integration Reference",
                        url = "https://developer.android.com/training/data-storage/room",
                        description = "Database configuration templates for offline-first state synchronization.",
                        status = "PENDING",
                        requiredInfo = "RoomDatabase, Entity Annotation rules"
                    )
                )
            }
        }

        // 4. Gemini AI SDK API Contracts
        if (lowercasePrompt.contains("ai") || lowercasePrompt.contains("gemini") || lowercasePrompt.contains("llm")) {
            val hasGemini = currentFiles.any { it.content.contains("gemini", ignoreCase = true) || it.content.contains("firebase.ai") }
            if (!hasGemini) {
                missingGaps.add(
                    DiscoveryLink(
                        title = "Gemini API Generation Schema",
                        url = "https://ai.google.dev/api/rest",
                        description = "Direct REST payload structure for model orchestrations.",
                        status = "PENDING",
                        requiredInfo = "GenerateContentRequest, ThinkingConfig, responseModalities array"
                    )
                )
            }
        }

        // 5. Firebase Authentication Core
        if (lowercasePrompt.contains("auth") || lowercasePrompt.contains("login") || lowercasePrompt.contains("credentials")) {
            val hasAuth = currentFiles.any { it.content.contains("auth", ignoreCase = true) }
            if (!hasAuth) {
                missingGaps.add(
                    DiscoveryLink(
                        title = "Firebase Auth REST API Specifications",
                        url = "https://firebase.google.com/docs/reference/rest/auth",
                        description = "Core credentials verification and OAuth tethers reference endpoints.",
                        status = "PENDING",
                        requiredInfo = "VerifyPasswordResponse, token refresh contracts"
                    )
                )
            }
        }

        // If no matches found, offer a general base link
        if (missingGaps.isEmpty()) {
            missingGaps.add(
                DiscoveryLink(
                    title = "Android Kotlin API Reference",
                    url = "https://developer.android.com/reference/kotlin/packages",
                    description = "Core language specifications and Android Jetpack platform framework schemas.",
                    status = "PENDING",
                    requiredInfo = "LifecycleRegistry, Flow, StateFlow coroutine bridges"
                )
            )
        }

        // Persist gaps
        for (gap in missingGaps) {
            repository.insertDiscoveryLink(gap)
        }

        val verb = if (missingGaps.size == 1) "1 target link" else "${missingGaps.size} target links"
        voiceCoPilot.speak("I've cataloged your requirements. I've generated $verb to acquire missing schema contracts.")
        repository.log("Requirement discovery complete: generated ${missingGaps.size} anchor discovery links.", "INFO")
    }
}

*/
