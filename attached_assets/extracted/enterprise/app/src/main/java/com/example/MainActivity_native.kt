package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.LoginScreen
import com.example.ui.MainContainerScreen
import com.example.ui.SolvexViewModel
import com.example.ui.theme.ObsidianNavy
import com.example.ui.theme.SolvexEnterpriseTheme

class MainActivity : ComponentActivity() {
    private val viewModel: SolvexViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SolvexEnterpriseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = ObsidianNavy
                ) {
                    val session by viewModel.currentSession.collectAsStateWithLifecycle()
                    val products by viewModel.allProducts.collectAsStateWithLifecycle()
                    val auditLogs by viewModel.auditLogs.collectAsStateWithLifecycle()
                    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
                    val selectedDomain by viewModel.selectedDomain.collectAsStateWithLifecycle()
                    val selectedProduct by viewModel.selectedProduct.collectAsStateWithLifecycle()
                    val copilotMessages by viewModel.copilotMessages.collectAsStateWithLifecycle()
                    val isCopilotLoading by viewModel.isCopilotLoading.collectAsStateWithLifecycle()

                    if (session == null) {
                        LoginScreen(
                            onLogin = { user, role, inst ->
                                viewModel.login(user, role, inst)
                            }
                        )
                    } else {
                        MainContainerScreen(
                            session = session!!,
                            products = products,
                            auditLogs = auditLogs,
                            searchQuery = searchQuery,
                            onSearchChange = { viewModel.setSearchQuery(it) },
                            selectedDomain = selectedDomain,
                            onDomainSelect = { viewModel.setSelectedDomain(it) },
                            selectedProduct = selectedProduct,
                            onProductSelect = { viewModel.selectProduct(it) },
                            copilotMessages = copilotMessages,
                            isCopilotLoading = isCopilotLoading,
                            onSendCopilotPrompt = { viewModel.sendCopilotQuery(it) },
                            onPurchaseProduct = { prod, wireRef ->
                                viewModel.purchaseProduct(prod, wireRef)
                            },
                            onLogout = { viewModel.logout() },
                            onAdminReset = { viewModel.adminResetMarketplace() },
                            onRunPenTest = { viewModel.runPenTestSimulation(it) }
                        )
                    }
                }
            }
        }
    }
}
