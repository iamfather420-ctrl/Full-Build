package com.example

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.SovereignDashboard
import com.example.ui.SovereignViewModel

/**
 * Common entry Composable for the dAIsy haMINJA Sovereign Kernel application.
 * Serves as the central root for all UI layers and state distribution.
 */
@Composable
fun App() {
    val viewModel: SovereignViewModel = viewModel()
    SovereignDashboard(viewModel = viewModel)
}
