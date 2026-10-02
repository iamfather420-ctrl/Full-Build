package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.Product
import com.example.ui.theme.*

@Composable
fun ProductDetailDialog(
    product: Product,
    onDismiss: () -> Unit,
    onPurchase: (wireReference: String) -> Unit
) {
    var showWireDialog by remember { mutableStateOf(false) }
    var wireRef by remember { mutableStateOf("CPA-LVTS-99482-DVP") }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.9f)
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, RichGold, RoundedCornerShape(16.dp)),
            colors = CardDefaults.cardColors(containerColor = ObsidianNavy)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Top header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Surface(color = RoyalSlate, shape = RoundedCornerShape(6.dp)) {
                            Text(
                                product.domain.uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(product.title, style = MaterialTheme.typography.titleLarge.copy(color = TextPrimary, fontWeight = FontWeight.Bold))
                        Text(product.subtitle, style = MaterialTheme.typography.bodySmall.copy(color = RichGold))
                    }

                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary)
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = BorderSlate)

                // Scrollable Body
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Price & Compliance Banner
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(CardBackground, RoundedCornerShape(10.dp))
                            .border(1.dp, BorderSlate, RoundedCornerShape(10.dp))
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("INSTITUTIONAL LICENSE FEE", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary))
                            Text(product.priceCad, style = MaterialTheme.typography.headlineMedium.copy(color = EmeraldGreen, fontWeight = FontWeight.ExtraBold))
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(product.slaUptime, style = MaterialTheme.typography.labelMedium.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                            Text(product.complianceStatus, style = MaterialTheme.typography.labelSmall.copy(color = RichGold))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("ARCHITECTURAL SPECIFICATION", style = MaterialTheme.typography.titleSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(product.description, style = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary, lineHeight = 20.sp))

                    Spacer(modifier = Modifier.height(16.dp))

                    Text("DUE DILIGENCE BENCHMARKS", style = MaterialTheme.typography.titleSmall.copy(color = RichGold, fontWeight = FontWeight.Bold))
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(color = RoyalSlate, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(
                            product.dueDiligenceSpecs,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall.copy(color = TextPrimary, fontFamily = FontFamily.Monospace)
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Before Sale Security Proof (ZK Teaser)
                    Text("BEFORE SALE SECURITY (ZK KEY ESCROW)", style = MaterialTheme.typography.titleSmall.copy(color = EmeraldGreen, fontWeight = FontWeight.Bold))
                    Text("100% secure from copying before clearing settlement. Algorithmic core is verified via Zero-Knowledge Groth16 cryptographic hash:", style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary))
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(
                        color = Color(0xFF0D1B2A),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldGreen),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(product.zkHashTeaser, style = MaterialTheme.typography.labelSmall.copy(color = EmeraldGreen, fontFamily = FontFamily.Monospace))
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // After Sale Executable Payload (Only if purchased)
                    if (product.isPurchased) {
                        Surface(
                            color = Color(0xFF0B192C),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(2.dp, CyberCyan),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Key, contentDescription = null, tint = CyberCyan)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("AFTER SALE UNLOCKED PAYLOAD (EXECUTABLE IP)", style = MaterialTheme.typography.titleSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Decryption Token: 0xIP_ESCROW_RELEASE_GRANTED_VALID_9921", style = MaterialTheme.typography.labelSmall.copy(color = RichGold))
                                Spacer(modifier = Modifier.height(8.dp))
                                Surface(color = Color(0xFF040D1A), shape = RoundedCornerShape(6.dp), modifier = Modifier.fillMaxWidth()) {
                                    Text(
                                        product.executablePayload,
                                        modifier = Modifier.padding(12.dp),
                                        style = MaterialTheme.typography.bodySmall.copy(color = CyberCyan, fontFamily = FontFamily.Monospace)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Footer action button
                if (!product.isPurchased) {
                    Button(
                        onClick = { showWireDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RichGold, contentColor = ObsidianNavy),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.ShoppingCartCheckout, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("INITIATE INSTITUTIONAL ESCROW PURCHASE", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = onDismiss,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen, contentColor = ObsidianNavy),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Verified, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("LICENSE ACTIVE • IP SECURELY UNLOCKED", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // Wire Transfer Settlement Dialog Simulation
    if (showWireDialog) {
        AlertDialog(
            onDismissRequest = { showWireDialog = false },
            containerColor = RoyalSlate,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AccountBalance, contentDescription = null, tint = RichGold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Multi-Party Settlement Escrow", color = TextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column {
                    Text("You are initiating atomic DVP clearing for ${product.title}. Funds (${product.priceCad}) will be held in Iron Mountain escrow until ZK key attestation clears.", color = TextPrimary, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = wireRef,
                        onValueChange = { wireRef = it },
                        label = { Text("Canadian Payments Assn Wire Ref") },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showWireDialog = false
                        onPurchase(wireRef)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = ObsidianNavy)
                ) {
                    Text("CONFIRM WIRE & UNLOCK IP KEY", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showWireDialog = false }) {
                    Text("CANCEL", color = TextSecondary)
                }
            }
        )
    }
}
