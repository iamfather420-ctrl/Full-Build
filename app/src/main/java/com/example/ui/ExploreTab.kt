package com.example.ui

import androidx.compose.foundation.*
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ParadoxEntity
import com.example.ui.theme.*
import java.text.DecimalFormat

@Composable
fun ExploreTab(
    paradoxes: List<ParadoxEntity>,
    selectedParadox: ParadoxEntity?,
    onSelect: (String?) -> Unit,
    onBuy: (String) -> Unit,
    onReset: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        if (selectedParadox == null) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                item {
                    Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)) {
                        Text(
                            text = "SOLVEX PROTOCOLS REQUISITION MARKETPLACE",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = CyberSecondary
                        )
                        Text(
                            text = "Select a sovereign cryptographic paradox to verify mathematically or deploy to an Intel SGX hardware enclave.",
                            fontSize = 11.sp,
                            color = CyberTextMuted
                        )
                    }
                }

                items(paradoxes) { item ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 600.dp)
                            .clickable { onSelect(item.id) }
                            .testTag("paradox_card_${item.id}"),
                        colors = CardDefaults.cardColors(containerColor = CyberSurface),
                        border = BorderStroke(1.dp, if (item.isLicensed) CyberPrimary.copy(alpha = 0.5f) else CyberDivider),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(CyberSurfaceVariant)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = item.category.uppercase(),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberSecondary
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(if (item.isLicensed) CyberPrimary.copy(alpha = 0.15f) else CyberTertiary.copy(alpha = 0.15f))
                                        .border(1.dp, if (item.isLicensed) CyberPrimary else CyberTertiary.copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = if (item.isLicensed) "LICENSED [ACTIVE]" else "SECURED [LOCKED]",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontFamily = FontFamily.Monospace,
                                        color = if (item.isLicensed) CyberPrimary else CyberTertiary
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            Text(text = item.title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = CyberTextBright, fontFamily = FontFamily.Monospace)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = item.summary, fontSize = 11.sp, color = CyberTextMuted)
                            Spacer(modifier = Modifier.height(10.dp))
                            Divider(color = CyberDivider)
                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "DIFFICULTY: ${item.difficulty.uppercase()}", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                Text(text = DecimalFormat("$#,##0").format(item.costUsd) + " USD", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = CyberPrimary, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onReset,
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 600.dp)
                            .height(48.dp)
                            .testTag("reset_system_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberAlertRed.copy(alpha = 0.15f), contentColor = CyberAlertRed),
                        border = BorderStroke(1.dp, CyberAlertRed.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Refresh, contentDescription = "Reset Icon")
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "RESET ESCROWS & RELOCK ALL ENCLAVES", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        } else {
            // Detailed View
            val scrollState = rememberScrollState()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { onSelect(null) },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(CyberSurface)
                                .border(1.dp, CyberDivider, RoundedCornerShape(8.dp))
                        ) {
                            Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back icon", tint = CyberPrimary, modifier = Modifier.size(18.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = "RETURN TO CATALOG", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                    }

                    Text(text = selectedParadox.title, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = CyberTextBright, fontFamily = FontFamily.Monospace)
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                            Column {
                                Text(text = "RATING", fontSize = 9.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                Text(text = selectedParadox.difficulty.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CyberTertiary, fontFamily = FontFamily.Monospace)
                            }
                        }
                        Box(modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                            Column {
                                Text(text = "LICENSE FEE", fontSize = 9.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                Text(text = DecimalFormat("$#,##0").format(selectedParadox.costUsd), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CyberPrimary, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selectedParadox.isLicensed) CyberPrimary.copy(alpha = 0.05f) else CyberTertiary.copy(alpha = 0.05f))
                            .border(1.dp, if (selectedParadox.isLicensed) CyberPrimary else CyberTertiary, RoundedCornerShape(8.dp))
                            .padding(16.dp)
                    ) {
                        if (selectedParadox.isLicensed) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Active icon", tint = CyberPrimary, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(text = "SECURE ENCLAVE ROUTINE ACTIVE", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberPrimary)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(text = "This protocol is compiled in your hardware-shielded CPU enclave. Navigate to the Enclaves tab or ZK-Prover to execute payload pipelines.", fontSize = 11.sp, color = CyberTextBright)
                            }
                        } else {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Lock, contentDescription = "Locked icon", tint = CyberTertiary, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(text = "SOLVEX ESCROW REQUISITION REQUIRED", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTertiary)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(text = "Deploy the fully resolved cryptographic solution directly to your secure server. Source files are strictly secured from cloning.", fontSize = 10.sp, color = CyberTextMuted)
                                Spacer(modifier = Modifier.height(12.dp))
                                Button(
                                    onClick = { onBuy(selectedParadox.id) },
                                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("purchase_license_button"),
                                    colors = ButtonDefaults.buttonColors(containerColor = CyberPrimary, contentColor = CyberOnPrimary),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.ShoppingCart, contentDescription = "Buy icon", modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(text = "BUY LICENSE & DEPLOY TO ENCLAVE", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    Text(text = "THE SYSTEMIC PARADOX", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(14.dp)) {
                        Text(text = selectedParadox.paradoxStatement, fontSize = 11.sp, color = CyberTextBright, lineHeight = 16.sp)
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    Text(text = "SECURE PROTOCOL RESOLUTION", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberPrimary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberPrimary.copy(alpha = 0.2f), RoundedCornerShape(8.dp)).padding(14.dp)) {
                        Column {
                            Text(text = selectedParadox.secureSolution, fontSize = 11.sp, color = CyberTextBright, lineHeight = 16.sp)
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(text = "ALGEBRAIC MATRIX: " + selectedParadox.cryptographicPrimitives, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = CyberSecondary, fontFamily = FontFamily.Monospace)
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    Text(text = "HARDWARE DEPLOYMENT TARGET", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = selectedParadox.technicalStack,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = CyberTextMuted,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(CyberSurface).border(0.5.dp, CyberDivider, RoundedCornerShape(4.dp)).padding(12.dp)
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
