package com.example.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AuditLog
import com.example.data.Product
import com.example.data.UserSession
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainContainerScreen(
    session: UserSession,
    products: List<Product>,
    auditLogs: List<AuditLog>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    selectedDomain: String,
    onDomainSelect: (String) -> Unit,
    selectedProduct: Product?,
    onProductSelect: (Product?) -> Unit,
    copilotMessages: List<ChatMessage>,
    isCopilotLoading: Boolean,
    onSendCopilotPrompt: (String) -> Unit,
    onPurchaseProduct: (Product, String) -> Unit,
    onLogout: () -> Unit,
    onAdminReset: () -> Unit,
    onRunPenTest: (String) -> Unit
) {
    var clientTab by remember { mutableStateOf(0) } // 0: Marketplace, 1: Due Diligence, 2: AI Copilot, 3: IP Vault

    val isAdmin = session.role == "ME_ADMIN"

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (isAdmin) Icons.Default.AdminPanelSettings else Icons.Default.AccountBalance,
                            contentDescription = null,
                            tint = if (isAdmin) RichGold else CyberCyan,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                if (isAdmin) "VENDOR ADMIN DASHBOARD (\"ME\")" else "INSTITUTIONAL CLIENT PORTAL",
                                style = MaterialTheme.typography.titleMedium.copy(color = TextPrimary, fontWeight = FontWeight.Bold)
                            )
                            Text(
                                "${session.username} • ${session.institution}",
                                style = MaterialTheme.typography.labelSmall.copy(color = if (isAdmin) RichGold else CyberCyan, fontSize = 10.sp)
                            )
                        }
                    }
                },
                actions = {
                    TextButton(onClick = onLogout, modifier = Modifier.testTag("logout_button")) {
                        Icon(Icons.Default.Logout, contentDescription = null, tint = CrimsonAlert, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("SIGN OUT", color = CrimsonAlert, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = RoyalSlate,
                    titleContentColor = TextPrimary
                )
            )
        },
        bottomBar = {
            if (!isAdmin) {
                NavigationBar(
                    containerColor = RoyalSlate,
                    contentColor = CyberCyan
                ) {
                    NavigationBarItem(
                        selected = clientTab == 0,
                        onClick = { clientTab = 0 },
                        icon = { Icon(Icons.Default.Storefront, contentDescription = null) },
                        label = { Text("Marketplace (${products.size})", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = ObsidianNavy, selectedTextColor = CyberCyan, indicatorColor = CyberCyan, unselectedIconColor = TextSecondary, unselectedTextColor = TextSecondary)
                    )
                    NavigationBarItem(
                        selected = clientTab == 1,
                        onClick = { clientTab = 1 },
                        icon = { Icon(Icons.Default.Assessment, contentDescription = null) },
                        label = { Text("Due Diligence", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = ObsidianNavy, selectedTextColor = CyberCyan, indicatorColor = CyberCyan, unselectedIconColor = TextSecondary, unselectedTextColor = TextSecondary)
                    )
                    NavigationBarItem(
                        selected = clientTab == 2,
                        onClick = { clientTab = 2 },
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = null) },
                        label = { Text("AI Copilot", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = ObsidianNavy, selectedTextColor = CyberCyan, indicatorColor = CyberCyan, unselectedIconColor = TextSecondary, unselectedTextColor = TextSecondary)
                    )
                    NavigationBarItem(
                        selected = clientTab == 3,
                        onClick = { clientTab = 3 },
                        icon = { Icon(Icons.Default.LockOpen, contentDescription = null) },
                        label = { Text("IP Vault (${products.count { it.isPurchased }})", fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(selectedIconColor = ObsidianNavy, selectedTextColor = CyberCyan, indicatorColor = CyberCyan, unselectedIconColor = TextSecondary, unselectedTextColor = TextSecondary)
                    )
                }
            }
        },
        containerColor = ObsidianNavy
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (isAdmin) {
                AdminDashboardView(
                    products = products,
                    auditLogs = auditLogs,
                    onResetMarketplace = onAdminReset,
                    onRunPenTest = onRunPenTest
                )
            } else {
                when (clientTab) {
                    0 -> MarketplaceView(
                        products = products,
                        searchQuery = searchQuery,
                        onSearchChange = onSearchChange,
                        selectedDomain = selectedDomain,
                        onDomainSelect = onDomainSelect,
                        onProductClick = { onProductSelect(it) }
                    )
                    1 -> DueDiligenceReportView()
                    2 -> AiCopilotView(
                        messages = copilotMessages,
                        isLoading = isCopilotLoading,
                        onSendPrompt = onSendCopilotPrompt
                    )
                    3 -> PurchasedIpVaultView(products = products)
                }
            }
        }
    }

    // Product Detail Dialog
    if (selectedProduct != null) {
        ProductDetailDialog(
            product = selectedProduct,
            onDismiss = { onProductSelect(null) },
            onPurchase = { wireRef ->
                onPurchaseProduct(selectedProduct, wireRef)
            }
        )
    }
}
