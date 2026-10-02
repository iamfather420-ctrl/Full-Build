package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AuditLog
import com.example.data.Product
import com.example.ui.theme.*

@Composable
fun AdminDashboardView(
    products: List<Product>,
    auditLogs: List<AuditLog>,
    onResetMarketplace: () -> Unit,
    onRunPenTest: (String) -> Unit
) {
    var adminTab by remember { mutableStateOf(0) } // 0: Metrics & Products, 1: SOC2 Audit Logs, 2: Pen-Test Simulator

    Column(modifier = Modifier.fillMaxSize().background(ObsidianNavy).padding(16.dp)) {
        // Executive Banner
        Card(
            modifier = Modifier.fillMaxWidth().border(1.dp, RichGold, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = CardBackground)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = RichGold, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("ADMIN DASHBOARD (\"ME\")", style = MaterialTheme.typography.titleMedium.copy(color = RichGold, fontWeight = FontWeight.Bold))
                            Text("Vendor Governance & Dispute Arbiter Portal", style = MaterialTheme.typography.bodySmall.copy(color = CyberCyan))
                        }
                    }

                    Button(
                        onClick = onResetMarketplace,
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonAlert, contentColor = TextPrimary),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.testTag("reset_marketplace_button")
                    ) {
                        Icon(Icons.Default.RestartAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("RESET ESCROWS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Stats Row
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatBox("TOTAL ENGINE VOL", "$18.5M CAD", EmeraldGreen, Modifier.weight(1f))
                    StatBox("ACTIVE CATALOG", "${products.size} Products", CyberCyan, Modifier.weight(1f))
                    StatBox("UPTIME SLA", "99.999%", RichGold, Modifier.weight(1f))
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Tab Row
        TabRow(
            selectedTabIndex = adminTab,
            containerColor = RoyalSlate,
            contentColor = CyberCyan,
            divider = {}
        ) {
            Tab(selected = adminTab == 0, onClick = { adminTab = 0 }, text = { Text("Escrow Governance", fontSize = 11.sp, fontWeight = FontWeight.Bold) })
            Tab(selected = adminTab == 1, onClick = { adminTab = 1 }, text = { Text("SOC2 WORM Logs (${auditLogs.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold) })
            Tab(selected = adminTab == 2, onClick = { adminTab = 2 }, text = { Text("Red-Team PenTest", fontSize = 11.sp, fontWeight = FontWeight.Bold) })
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Tab Content
        when (adminTab) {
            0 -> {
                Text("MARKETPLACE ENGINE ESCROW STATUS", style = MaterialTheme.typography.labelMedium.copy(color = TextSecondary))
                Spacer(modifier = Modifier.height(8.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 80.dp), modifier = Modifier.fillMaxSize()) {
                    items(products, key = { it.id }) { p ->
                        Card(colors = CardDefaults.cardColors(containerColor = CardBackground), border = androidx.compose.foundation.BorderStroke(1.dp, BorderSlate)) {
                            Row(modifier = Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(p.title, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                                    Text(p.priceCad, color = EmeraldGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                Surface(color = if (p.isPurchased) Color(0xFF0C2A1A) else RoyalSlate, shape = RoundedCornerShape(6.dp)) {
                                    Text(
                                        if (p.isPurchased) "CLEARED & UNLOCKED" else "LOCKED ESCROW",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall.copy(color = if (p.isPurchased) EmeraldGreen else RichGold, fontWeight = FontWeight.Bold)
                                    )
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                Text("IMMUTABLE MERKLE AUDIT TRAIL (TAMPER-EVIDENT)", style = MaterialTheme.typography.labelMedium.copy(color = TextSecondary))
                Spacer(modifier = Modifier.height(8.dp))
                if (auditLogs.isEmpty()) {
                    Text("No audit events recorded yet.", color = TextSecondary)
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 80.dp), modifier = Modifier.fillMaxSize()) {
                        items(auditLogs) { log ->
                            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0D162A)), border = androidx.compose.foundation.BorderStroke(1.dp, BorderSlate)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("${log.actor} • [${log.action}]", color = CyberCyan, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        Text(log.severity, color = when(log.severity) { "CRITICAL" -> CrimsonAlert; "SUCCESS" -> EmeraldGreen; "WARN" -> RichGold; else -> TextSecondary }, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(log.details, color = TextPrimary, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                Column {
                    Text("OWASP TOP 10 API VULNERABILITY BLAST SIMULATOR", style = MaterialTheme.typography.titleSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                    Text("Tests Open Banking API Gateways for BOLA/IDOR vulnerabilities prior to OSFI sign-off.", color = TextSecondary, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(16.dp))

                    val endpoints = listOf("https://api.solvex.ca/v1/clearing/dvp", "https://api.solvex.ca/v2/mpc/custody-shard", "https://api.solvex.ca/v1/qkd/kyber-key-exchange")
                    endpoints.forEach { ep ->
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), colors = CardDefaults.cardColors(containerColor = CardBackground)) {
                            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(ep, color = TextPrimary, fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                                    Text("Status: Sandboxed • Red-Team Fuzzer Ready", color = EmeraldGreen, fontSize = 10.sp)
                                }
                                Button(
                                    onClick = { onRunPenTest(ep) },
                                    colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = ObsidianNavy),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.BugReport, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("BLAST API", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatBox(label: String, valText: String, color: Color, modifier: Modifier = Modifier) {
    Surface(color = RoyalSlate, shape = RoundedCornerShape(10.dp), border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.5f)), modifier = modifier) {
        Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary, fontSize = 8.sp))
            Spacer(modifier = Modifier.height(2.dp))
            Text(valText, style = MaterialTheme.typography.titleSmall.copy(color = color, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp))
        }
    }
}
