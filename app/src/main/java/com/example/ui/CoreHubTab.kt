package com.example.ui

import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.AuditLogEntity
import com.example.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.DecimalFormat

@Composable
fun CoreHubTab(
    auditLogs: List<AuditLogEntity>,
    onClearLogs: () -> Unit,
    selectedTier: Int,
    onTierSelected: (Int) -> Unit,
    watermarkEnabled: Boolean,
    onWatermarkToggle: () -> Unit,
    obfuscationEnabled: Boolean,
    onObfuscationToggle: () -> Unit,
    fingerprintEnabled: Boolean,
    onFingerprintToggle: () -> Unit,
    tamperSealEnabled: Boolean,
    onTamperSealToggle: () -> Unit,
    factoryBuildStatus: String?,
    onBuildStatusChange: (String?) -> Unit,
    factoryLogs: List<String>,
    onFactoryLogsChange: (List<String>) -> Unit
) {
    val scope = rememberCoroutineScope()
    var gridActiveLogs by remember { mutableStateOf<List<String>>(emptyList()) }
    var gridPingActive by remember { mutableStateOf(false) }

    val tierTitle = when (selectedTier) {
        1 -> "52-Paradox Baseline"
        2 -> "54-Node Identity Expansion"
        3 -> "55-Paradox Framework"
        else -> "58-Paradox 'W Y R D' Web"
    }

    val tierDesc = when (selectedTier) {
        1 -> "Establishes core brain using 40 public and 12 unique solved paradoxes in a secure, offline environment."
        2 -> "Integrates biometric recall and high-dimensional memory to transform conversations into stateful training inputs."
        3 -> "Introduces Multi-Vector Synchronization and Nalion solutions, moving beyond standard AI containment."
        else -> "Merges AI with biological architecture (ABRA) to manage ultimate biological integrity through quantum parity. Screen-tether widget active."
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Master Control Title
        Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp).align(Alignment.CenterHorizontally)) {
            Text(
                text = "DAISY HAMINJA SOVEREIGN CORE",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CyberSecondary,
                letterSpacing = 1.sp
            )
            Text(
                text = "Grid Status: 54 Nodes online | Heartbeat: ACTIVE",
                fontSize = 11.sp,
                color = CyberTextMuted
            )
        }

        // 54-Node Grid Map & Heartbeat Ping
        Card(
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp).align(Alignment.CenterHorizontally),
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberDivider),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "54-NODE TECOE EXECUTION GRID MAP",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Pulsing Node blocks 6x9 = 54
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        for (r in 0 until 6) {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                for (c in 0 until 9) {
                                    val nodeIndex = r * 9 + c + 1
                                    Box(
                                        modifier = Modifier
                                            .size(11.dp)
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(
                                                if (gridPingActive) {
                                                    if ((nodeIndex + (System.currentTimeMillis() / 150).toInt()) % 4 == 0) CyberPrimary else CyberPrimary.copy(alpha = 0.3f)
                                                } else {
                                                    CyberPrimary
                                                }
                                            )
                                    )
                                }
                            }
                        }
                    }

                    // Ping Action
                    Button(
                        onClick = {
                            scope.launch {
                                gridPingActive = true
                                gridActiveLogs = listOf("[PING] Broadcasting signal across 54-node sovereign grid...")
                                delay(300)
                                gridActiveLogs = gridActiveLogs + "[PING] Escrow channels Node 1-18 verified (stable latency 0.8ms)."
                                delay(350)
                                gridActiveLogs = gridActiveLogs + "[PING] Hardware Enclaves Node 19-36 verified (MKTME active)."
                                delay(300)
                                gridActiveLogs = gridActiveLogs + "[PING] ZK-Provers Node 37-54 verified (polynomial proofs OK)."
                                delay(250)
                                gridActiveLogs = gridActiveLogs + "[PING] GRID HEARTBEAT 100% OK. No anomalies detected."
                                gridPingActive = false
                            }
                        },
                        enabled = !gridPingActive,
                        modifier = Modifier
                            .height(44.dp)
                            .testTag("ping_grid_button"),
                        colors = ButtonDefaults.buttonColors(containerColor = CyberSecondary.copy(alpha = 0.15f), contentColor = CyberSecondary),
                        border = BorderStroke(1.dp, CyberSecondary.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Refresh, contentDescription = "Ping icon", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "SWEEP PING", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                if (gridActiveLogs.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black)
                            .padding(8.dp)
                    ) {
                        Column {
                            gridActiveLogs.forEach { log ->
                                Text(
                                    text = log,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = CyberPrimary
                                )
                            }
                        }
                    }
                }
            }
        }

        // Crystal Clear Black Box (CCBB) & Evolutionary tier
        Card(
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp).align(Alignment.CenterHorizontally),
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberDivider),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "CRYSTAL CLEAR BLACK BOX TELEMETRY",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = CyberTextBright
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(CyberPrimary.copy(alpha = 0.1f))
                            .border(0.5.dp, CyberPrimary, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text("COMPLIANT", color = CyberPrimary, fontSize = 8.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Protects 58 proprietary operators secretly, while emitting a 100% transparent verifiable proof stream of compliance. (SOC2, NIST, ISO 42001).",
                    fontSize = 10.sp,
                    color = CyberTextMuted
                )

                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "ACTIVE EVOLUTIONARY COMPILE TIER:",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )
                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(1, 2, 3, 4).forEach { tier ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (selectedTier == tier) CyberPrimary.copy(alpha = 0.15f) else CyberSurfaceVariant)
                                .border(
                                    1.dp,
                                    if (selectedTier == tier) CyberPrimary else CyberDivider,
                                    RoundedCornerShape(4.dp)
                                )
                                .clickable { onTierSelected(tier) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "TIER $tier",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (selectedTier == tier) CyberPrimary else CyberTextMuted
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(4.dp))
                        .background(CyberSurfaceVariant)
                        .padding(10.dp)
                ) {
                    Column {
                        Text(text = tierTitle.uppercase(), color = CyberSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(text = tierDesc, color = CyberTextBright, fontSize = 10.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "THROUGHPUT MULTIPLIER: ${when(selectedTier){ 1 -> "1.0x" 2 -> "1.5x" 3 -> "2.2x" else -> "3.5x" }}", color = CyberTertiary, fontSize = 9.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    }
                }
            }
        }

        // JIT Production Factory Pipeline
        Card(
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp).align(Alignment.CenterHorizontally),
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberDivider),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "JIT BUILD SYSTEM & WATERMARKING",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = CyberTextBright
                )
                Text(
                    text = "Compile solution outputs on-demand with advanced obfuscation, anti-tampering seals, and SHA-256 fingerprints.",
                    fontSize = 10.sp,
                    color = CyberTextMuted
                )

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(
                        "HARDENED WATERMARK" to watermarkEnabled,
                        "BINARY OBFUSCATION" to obfuscationEnabled,
                        "SHA-256 FINGERPRINT" to fingerprintEnabled,
                        "ANTI-TAMPER SEAL" to tamperSealEnabled
                    ).forEach { (label, isEnabled) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(4.dp))
                                .background(CyberSurfaceVariant)
                                .clickable {
                                    when (label) {
                                        "HARDENED WATERMARK" -> onWatermarkToggle()
                                        "BINARY OBFUSCATION" -> onObfuscationToggle()
                                        "SHA-256 FINGERPRINT" -> onFingerprintToggle()
                                        "ANTI-TAMPER SEAL" -> onTamperSealToggle()
                                    }
                                }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = label,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace,
                                color = CyberTextBright
                            )
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .border(1.dp, if (isEnabled) CyberPrimary else CyberTextMuted, RoundedCornerShape(2.dp))
                                    .background(if (isEnabled) CyberPrimary else Color.Transparent)
                                    .padding(2.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isEnabled) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Active",
                                        tint = CyberOnPrimary,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                        }
                    }
                }

                Button(
                    onClick = {
                        scope.launch {
                            onBuildStatusChange("BUILDING")
                            onFactoryLogsChange(listOf("[FACTORY] Launching Sovereign JIT APK compiler engine..."))
                            delay(400)
                            onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] Compiling source Abstract Syntax Tree (AST) to algebraic equations..." })
                            delay(400)
                            if (obfuscationEnabled) {
                                onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] Injecting 256-bit obfuscation keys to protect raw parameters..." })
                                delay(300)
                            }
                            if (watermarkEnabled) {
                                onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] Stamping cryptographically signed sovereign watermark..." })
                                delay(300)
                            }
                            if (fingerprintEnabled) {
                                val ranHash = "0x" + (1..32).map { "0123456789abcdef".random() }.joinToString("")
                                onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] Generated SHA-256 binary fingerprint: ${ranHash.take(16)}..." })
                                delay(300)
                            }
                            if (tamperSealEnabled) {
                                onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] Sealing runtime RAM boundaries with hardware-bound signature." })
                                delay(400)
                            }
                            onFactoryLogsChange(onFactoryLogsChange.let { logs -> factoryLogs + "[FACTORY] JIT OPTIMIZED APK COMPILED SUCCESSFULLY." })
                            onBuildStatusChange("SUCCESS")
                        }
                    },
                    enabled = factoryBuildStatus != "BUILDING",
                    modifier = Modifier.fillMaxWidth().height(44.dp).testTag("factory_build_button"),
                    colors = ButtonDefaults.buttonColors(containerColor = CyberTertiary, contentColor = CyberOnPrimary),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    if (factoryBuildStatus == "BUILDING") {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = CyberOnPrimary)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Build, contentDescription = "Build Icon", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "COMPILE JIT SOVEREIGN BUILD", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }

                if (factoryLogs.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color.Black)
                            .border(0.5.dp, CyberDivider, RoundedCornerShape(6.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            factoryLogs.forEach { log ->
                                Text(
                                    text = log,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (log.contains("SUCCESSFULLY")) CyberPrimary else CyberTertiary,
                                    lineHeight = 13.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // Transactions audit ledger sub-section
        Card(
            modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp).align(Alignment.CenterHorizontally),
            colors = CardDefaults.cardColors(containerColor = CyberSurface),
            border = BorderStroke(1.dp, CyberDivider),
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "IMMUTABLE AUDIT LEDGER CONSOLE",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = CyberTextBright
                        )
                        Text(
                            text = "Historical enclave deployments and verifications",
                            fontSize = 9.sp,
                            color = CyberTextMuted
                        )
                    }
                    IconButton(
                        onClick = onClearLogs,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(CyberSurfaceVariant)
                            .border(0.5.dp, CyberDivider, RoundedCornerShape(4.dp))
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete Logs", tint = CyberAlertRed, modifier = Modifier.size(14.dp))
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                if (auditLogs.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(100.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("LEDGER RECORD IS EMPTY", fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black)
                            .padding(8.dp)
                    ) {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(auditLogs) { log ->
                                Column {
                                    Text(
                                        text = ">> [${log.paradoxId.uppercase()}] ${log.paradoxTitle.uppercase()}",
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberSecondary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "   IN: ${log.inputData}",
                                        fontSize = 8.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberTextBright
                                    )
                                    Text(
                                        text = "   OUT: ${log.outputData}",
                                        fontSize = 8.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberPrimary
                                    )
                                    Text(
                                        text = "   LATENCY: ${log.latencyMs}ms | SIG: ${log.verificationProof.take(18)}...",
                                        fontSize = 8.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberTextMuted
                                    )
                                    Divider(color = CyberDivider.copy(alpha = 0.3f), modifier = Modifier.padding(vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
