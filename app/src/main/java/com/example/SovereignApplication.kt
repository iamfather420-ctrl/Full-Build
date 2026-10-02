package com.example

import android.app.Application
import android.util.Log
import com.example.data.local.SovereignDatabase

/**
 * SovereignApplication
 * Common entry point for the dAIsy haMINJA sovereign kernel application process.
 * Responsible for system-wide initialization, telemetry setup, and local persistence pre-caching.
 */
class SovereignApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i("SovereignApplication", "dAIsy haMINJA Sovereign Kernel Application Process Initialized.")
        
        // Eagerly initialize local SQLite database
        try {
            SovereignDatabase.getDatabase(this)
            Log.i("SovereignApplication", "Sovereign Room Database pre-cached successfully.")
        } catch (e: Exception) {
            Log.e("SovereignApplication", "Failed to pre-cache Sovereign Room Database", e)
        }
    }
}
