// Converted native logic from ZkProverTab.kt
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ParadoxEntity
import com.example.ui.theme.*

@Composable
fun ZkProverTab(
    paradoxes: List<ParadoxEntity>,
    selectedParadox: ParadoxEntity?,
    sandboxState: SandboxState,
    sandboxInput: String,
    onSandboxInputChange: (String) -> Unit,
    onSelectParadox: (String?) -> Unit,
    onVerifySandbox: (String, String) -> Unit,
    customCode: String,
    onCustomCodeChange: (String) -> Unit,
    customRules: String,
    onCustomRulesChange: (String) -> Unit,
    onVerifyCustom: (String, String) -> Unit
) {
    var subTab by remember { mutableStateOf("CHALLENGE") } // "CHALLENGE" or "CUSTOM_AUDIT"
    var dropdownExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Headings
        Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)) {
            Text(
                text = "ZERO-KNOWLEDGE MATHEMATICAL VERIFIER",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CyberSecondary
            )
            Text(
                text = "Prove codebase logic and mathematical safety invariants securely without leaking proprietary keys.",
                fontSize = 11.sp,
                color = CyberTextMuted
            )
        }

        // Sub-Tab Switcher (Challenge vs Custom Audit)
        Row(
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (subTab == "CHALLENGE") CyberPrimary.copy(alpha = 0.15f) else CyberSurfaceVariant)
                    .border(1.dp, if (subTab == "CHALLENGE") CyberPrimary else CyberDivider, RoundedCornerShape(6.dp))
                    .clickable { subTab = "CHALLENGE" }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "CHALLENGE PROVER",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = if (subTab == "CHALLENGE") CyberPrimary else CyberTextMuted
                )
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (subTab == "CUSTOM_AUDIT") CyberTertiary.copy(alpha = 0.15f) else CyberSurfaceVariant)
                    .border(1.dp, if (subTab == "CUSTOM_AUDIT") CyberTertiary else CyberDivider, RoundedCornerShape(6.dp))
                    .clickable { subTab = "CUSTOM_AUDIT" }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "CUSTOM CODE AUDITOR",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = if (subTab == "CUSTOM_AUDIT") CyberTertiary else CyberTextMuted
                )
            }
        }

        // Sub tab contents
        if (subTab == "CHALLENGE") {
            // Dropdown Selector & Challenge input
            Column(
                modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "SELECT TARGET SOLUTION PROVER CHALLENGE:",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
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
                            text = selectedParadox?.title ?: "-- SELECT ACTIVE PROVER --",
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
                        paradoxes.forEach { paradox ->
                            DropdownMenuItem(
                                text = { Text(text = paradox.title, fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = CyberTextBright) },
                                onClick = {
                                    onSelectParadox(paradox.id)
                                    dropdownExpanded = false
                                }
                            )
                        }
                    }
                }

                if (selectedParadox != null) {
                    OutlinedTextField(
                        value = sandboxInput,
                        onValueChange = onSandboxInputChange,
                        modifier = Modifier.fillMaxWidth().testTag("sandbox_payload_input"),
                        textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = CyberTextBright),
                        placeholder = { Text(text = "Enter test vectors (e.g. SWIFT payload, matrix offset, clock drift limits)", fontSize = 11.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = CyberPrimary,
                            unfocusedBorderColor = CyberDivider,
                            focusedContainerColor = CyberSurface,
                            unfocusedContainerColor = CyberSurface
                        ),
                        shape = RoundedCornerShape(6.dp)
                    )

                    Button(
                        onClick = { onVerifySandbox(selectedParadox.id, sandboxInput) },
                        enabled = sandboxState !is SandboxState.Proving,
                        modifier = Modifier.fillMaxWidth().height(48.dp).testTag("generate_proof_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberPrimary, contentColor = CyberOnPrimary),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        if (sandboxState is SandboxState.Proving) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = CyberOnPrimary)
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.PlayArrow, contentDescription = "Run Icon")
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = "GENERATE ZERO-KNOWLEDGE PROOF", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }

                    AnimatedVisibility(visible = sandboxState !is SandboxState.Idle) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            when (sandboxState) {
                                is SandboxState.Proving -> {
                                    Box(
                                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberTertiary.copy(alpha = 0.5f), RoundedCornerShape(8.dp)).padding(20.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            CircularProgressIndicator(color = CyberPrimary)
                                            Spacer(modifier = Modifier.height(10.dp))
                                            Text(text = "CONSTRUCTING POLYNOMIAL CONSTRAINTS...", fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberTertiary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                is SandboxState.Success -> {
                                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberPrimary.copy(alpha = 0.1f)).border(1.dp, CyberPrimary, RoundedCornerShape(8.dp)).padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = "OK Circle", tint = CyberPrimary, modifier = Modifier.size(22.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column {
                                                Text(text = "ZK PROOF CHALLENGE SOLVED", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberPrimary)
                                                Text(text = "Verification: 100% SECURE. Math constraints satisfied.", fontSize = 9.sp, color = CyberTextBright)
                                            }
                                        }
                                    }

                                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                                        Column {
                                            Text(text = "PROVER POLYNOMIAL PARAMETERS", fontSize = 8.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberSecondary)
                                            sandboxState.proofs.forEach { proof ->
                                                Text(text = proof, fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                                            }
                                        }
                                    }

                                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color.Black).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                                        Text(text = sandboxState.logOutput, fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberPrimary, lineHeight = 13.sp)
                                    }
                                }
                                is SandboxState.Error -> {
                                    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberAlertRed.copy(alpha = 0.1f)).border(1.dp, CyberAlertRed, RoundedCornerShape(8.dp)).padding(14.dp)) {
                                        Text(text = "Verification failed: ${sandboxState.message}", color = CyberAlertRed, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                    }
                                }
                                else -> {}
                            }
                        }
                    }
                } else {
                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                        Text(text = "SELECT AN ACTIVE CHALLENGE PROVER FIRST", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                    }
                }
            }
        } else {
            // Custom ZK Code compliance auditor
            Column(
                modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "PASTE PROPRIETARY TARGET CODE FOR AST COMPILATION:",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )

                OutlinedTextField(
                    value = customCode,
                    onValueChange = onCustomCodeChange,
                    modifier = Modifier.fillMaxWidth().height(110.dp).testTag("custom_code_input"),
                    textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = CyberTextBright),
                    placeholder = { Text(text = "e.g.,\nfn clear_vault_funds(amt: u64) {\n  if amt < 250000 {\n    approve_wire();\n  }\n}", fontSize = 10.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyberTertiary,
                        unfocusedBorderColor = CyberDivider,
                        focusedContainerColor = CyberSurface,
                        unfocusedContainerColor = CyberSurface
                    ),
                    shape = RoundedCornerShape(6.dp)
                )

                Text(
                    text = "SPECIFY INVARIANT COMPLIANCE SAFETY RULE:",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )

                OutlinedTextField(
                    value = customRules,
                    onValueChange = onCustomRulesChange,
                    modifier = Modifier.fillMaxWidth().testTag("custom_rules_input"),
                    textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = CyberTextBright),
                    placeholder = { Text(text = "e.g., Rule: 'No transfers above 250,000 without multi-party consensus'", fontSize = 11.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyberTertiary,
                        unfocusedBorderColor = CyberDivider,
                        focusedContainerColor = CyberSurface,
                        unfocusedContainerColor = CyberSurface
                    ),
                    shape = RoundedCornerShape(6.dp)
                )

                Button(
                    onClick = { onVerifyCustom(customCode, customRules) },
                    enabled = sandboxState !is SandboxState.Proving,
                    modifier = Modifier.fillMaxWidth().height(48.dp).testTag("run_custom_audit_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = CyberTertiary, contentColor = CyberOnPrimary),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    if (sandboxState is SandboxState.Proving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = CyberOnPrimary)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Check, contentDescription = "Check")
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "COMPILE & VERIFY COMPLIANCE INVARIANT", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                AnimatedVisibility(visible = sandboxState !is SandboxState.Idle) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        when (sandboxState) {
                            is SandboxState.Proving -> {
                                Box(
                                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberSurface).border(1.dp, CyberTertiary.copy(alpha = 0.5f), RoundedCornerShape(8.dp)).padding(20.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = CyberTertiary)
                                }
                            }
                            is SandboxState.Success -> {
                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CyberPrimary.copy(alpha = 0.1f)).border(1.dp, CyberPrimary, RoundedCornerShape(8.dp)).padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = "OK Circle", tint = CyberPrimary, modifier = Modifier.size(22.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(text = "CODE COMPLIANT: ZK-SNARK GENERATED", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberPrimary)
                                            Text(text = "Algebraic circuit proves execution paths can NEVER breach invariant.", fontSize = 9.sp, color = CyberTextBright)
                                        }
                                    }
                                }

                                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Color.Black).border(1.dp, CyberDivider, RoundedCornerShape(8.dp)).padding(12.dp)) {
                                    Text(text = sandboxState.logOutput, fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberPrimary, lineHeight = 13.sp)
                                }
                            }
                            else -> {}
                        }
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

*/
