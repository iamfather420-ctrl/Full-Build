// Converted native logic from EnclaveTab.kt
/*
package com.example.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ParadoxEntity
import com.example.ui.theme.*

@Composable
fun EnclaveTab(
    paradoxes: List<ParadoxEntity>,
    selectedParadox: ParadoxEntity?,
    enclaveState: EnclaveExecutionState,
    input: String,
    onInputChange: (String) -> Unit,
    onSelect: (String?) -> Unit,
    onStart: (String, String) -> Unit,
    onStop: () -> Unit,
    selectedTier: Int // Integrate evolutionary tier!
) {
    var dropdownExpanded by remember { mutableStateOf(false) }

    // Multiplier for telemetry based on the active evolutionary tier!
    val tierMultiplier = when (selectedTier) {
        1 -> 1.0
        2 -> 1.5
        3 -> 2.2
        else -> 3.5
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)) {
            Text(
                text = "SECURE SGX SYSTEM RUNTIME ENCLAVES",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CyberPrimary
            )
            Text(
                text = "Stream real-time transactional feeds inside hardware-isolated CPU enclaves (MKTME RAM encrypted) and inspect attestation sigs.",
                fontSize = 11.sp,
                color = CyberTextMuted
            )
        }

        Text(
            text = "SELECT ACTIVE HARDWARE SERVICE ROUTINE:",
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            color = CyberTextBright,
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(CyberSurface)
                .border(1.dp, CyberDivider, RoundedCornerShape(6.dp))
                .clickable { dropdownExpanded = true }
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = selectedParadox?.title ?: "-- EXPAND ACTIVE ENCLAVES --",
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = if (selectedParadox != null) CyberPrimary else CyberTextMuted
                )
                Icon(imageVector = Icons.Default.ArrowDropDown, contentDescription = "Dropdown indicator", tint = CyberPrimary)
            }

            DropdownMenu(
                expanded = dropdownExpanded,
                onDismissRequest = { dropdownExpanded = false },
                modifier = Modifier.fillMaxWidth(0.9f).background(CyberSurface).border(1.dp, CyberDivider)
            ) {
                val licensedList = paradoxes.filter { it.isLicensed }
                if (licensedList.isEmpty()) {
                    DropdownMenuItem(
                        text = { Text(text = "No active enclaves found. Activate license in Requisitions first.", color = CyberTextMuted, fontSize = 11.sp, fontFamily = FontFamily.Monospace) },
                        onClick = { dropdownExpanded = false }
                    )
                } else {
                    licensedList.forEach { paradox ->
                        DropdownMenuItem(
                            text = { Text(text = paradox.title, fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = CyberTextBright) },
                            onClick = {
                                onSelect(paradox.id)
                                dropdownExpanded = false
                            }
                        )
                    }
                }
            }
        }

        if (selectedParadox != null) {
            Column(
                modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = onInputChange,
                    modifier = Modifier.fillMaxWidth().testTag("enclave_stream_input"),
                    textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = CyberTextBright),
                    placeholder = { Text(text = "Enter live execution stream data payload...", fontSize = 11.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyberPrimary,
                        unfocusedBorderColor = CyberDivider,
                        focusedContainerColor = CyberSurface,
                        unfocusedContainerColor = CyberSurface
                    ),
                    shape = RoundedCornerShape(6.dp)
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { onStart(selectedParadox.id, input) },
                        enabled = enclaveState !is EnclaveExecutionState.Starting,
                        modifier = Modifier.weight(1f).height(48.dp).testTag("start_enclave_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberPrimary, contentColor = CyberOnPrimary),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PlayArrow, contentDescription = "Run Icon", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "BOOT UP", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }

                    Button(
                        onClick = onStop,
                        modifier = Modifier.weight(1f).height(48.dp).testTag("stop_enclave_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberAlertRed.copy(alpha = 0.15f), contentColor = CyberAlertRed),
                        border = BorderStroke(1.dp, CyberAlertRed.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Close, contentDescription = "Stop icon", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "TERMINATE", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                AnimatedVisibility(visible = enclaveState !is EnclaveExecutionState.Idle) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        when (enclaveState) {
                            is EnclaveExecutionState.Starting -> {
                                Box(
                                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberTertiary, RoundedCornerShape(8.dp)).padding(20.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = CyberTertiary)
                                }
                            }
                            is EnclaveExecutionState.Running -> {
                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberBlueAccent.copy(alpha = 0.1f)).border(1.dp, CyberBlueAccent, RoundedCornerShape(8.dp)).padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Lock, contentDescription = "Running tag", tint = CyberBlueAccent, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(text = "HARDWARE ISOLATION ENCRYPTED", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberBlueAccent)
                                            Text(text = "Intel SGX core-private RAM active. Memory is fully shielded.", fontSize = 9.sp, color = CyberTextBright)
                                        }
                                    }
                                }

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Box(modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(10.dp)) {
                                        Column {
                                            Text(text = "THROUGHPUT", fontSize = 8.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                            // Multiplied throughput by Evolutionary Tier!
                                            val speed = enclaveState.throughput * tierMultiplier
                                            Text(text = String.format("%.2f Tx/s", speed), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CyberPrimary, fontFamily = FontFamily.Monospace)
                                        }
                                    }
                                    Box(modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(10.dp)) {
                                        Column {
                                            Text(text = "LATENCY", fontSize = 8.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                            // Latency decreases with higher Tiers!
                                            val delayVal = enclaveState.latencyMs / tierMultiplier
                                            Text(text = String.format("%.2f ms", delayVal), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CyberSecondary, fontFamily = FontFamily.Monospace)
                                        }
                                    }
                                    Box(modifier = Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(10.dp)) {
                                        Column {
                                            Text(text = "CPU LOAD", fontSize = 8.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                            Text(text = String.format("%.1f %%", enclaveState.activeCpuLoad), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = CyberTertiary, fontFamily = FontFamily.Monospace)
                                        }
                                    }
                                }

                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberPrimary.copy(alpha = 0.3f), RoundedCornerShape(8.dp)).padding(14.dp)) {
                                    Column {
                                        Text(text = "COMPUTATIONAL ENCLAVE PIPELINE OUTPUT:", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = CyberPrimary, fontFamily = FontFamily.Monospace)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(text = enclaveState.computationalResult, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = CyberTextBright)
                                    }
                                }

                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(10.dp)) {
                                    Column {
                                        Text(text = "SGX ATTESTATION SIGNED MSR QUOTE:", fontSize = 8.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace)
                                        Text(text = enclaveState.attestationSignature, fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberTertiary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }

                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color.Black).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                                    Column {
                                        enclaveState.logLines.forEach { line ->
                                            Text(text = line, fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberPrimary, lineHeight = 13.sp)
                                        }
                                    }
                                }
                            }
                            is EnclaveExecutionState.Terminated -> {
                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberAlertRed.copy(alpha = 0.1f)).border(1.dp, CyberAlertRed, RoundedCornerShape(8.dp)).padding(14.dp)) {
                                    Text(text = "ENCLAVE TERMINATED: Ephemeral memory cache successfully cleared.", color = CyberAlertRed, fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                                }
                            }
                            else -> {}
                        }
                    }
                }
            }
        } else {
            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                Text(text = "SELECT AN ACTIVE LICENSED ENCLAVE FROM LIST", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

*/
