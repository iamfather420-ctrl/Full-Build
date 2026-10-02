package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.Product
import com.example.ui.theme.*

@Composable
fun PurchasedIpVaultView(products: List<Product>) {
    val purchasedList = remember(products) { products.filter { it.isPurchased } }

    Column(modifier = Modifier.fillMaxSize().background(ObsidianNavy).padding(16.dp)) {
        Card(
            modifier = Modifier.fillMaxWidth().border(1.dp, EmeraldGreen, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = CardBackground)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LockOpen, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(26.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("INSTITUTIONAL IP KEY ESCROW VAULT", style = MaterialTheme.typography.titleMedium.copy(color = EmeraldGreen, fontWeight = FontWeight.Bold))
                        Text("100% Secure Proprietary Algorithmic Payloads", style = MaterialTheme.typography.bodySmall.copy(color = TextPrimary))
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Engines unlocked post Delivery-vs-Payment clearing. Cryptographic decryption keys are verified against Iron Mountain master escrow contracts.",
                    style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary, fontSize = 12.sp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (purchasedList.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Key, contentDescription = null, tint = BorderSlate, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("No paradox solutions purchased yet.", style = MaterialTheme.typography.titleMedium.copy(color = TextSecondary))
                    Text("Browse the Marketplace tab to initiate escrow clearing.", style = MaterialTheme.typography.bodySmall.copy(color = CyberCyan))
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(bottom = 80.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(purchasedList, key = { it.id }) { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth().border(1.dp, CyberCyan, RoundedCornerShape(14.dp)),
                        colors = CardDefaults.cardColors(containerColor = CardBackground)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(item.title, style = MaterialTheme.typography.titleMedium.copy(color = TextPrimary, fontWeight = FontWeight.Bold))
                                Surface(color = Color(0xFF0C2A1A), shape = RoundedCornerShape(6.dp)) {
                                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Verified, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(12.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("ESCROW RELEASED", style = MaterialTheme.typography.labelSmall.copy(color = EmeraldGreen, fontWeight = FontWeight.Bold))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("License Fee Cleared: ${item.priceCad}", style = MaterialTheme.typography.labelSmall.copy(color = RichGold))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("PROPRIETARY EXECUTABLE CODE Snippet:", style = MaterialTheme.typography.labelSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                            Spacer(modifier = Modifier.height(6.dp))
                            Surface(color = Color(0xFF040D1A), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    item.executablePayload,
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodySmall.copy(color = CyberCyan, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
