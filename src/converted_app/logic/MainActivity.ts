// Converted native logic from MainActivity.kt
/*
package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.DaisyViewModel
import com.example.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue
import kotlin.math.sin
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.JavascriptInterface
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewModelScope


class MainActivity : ComponentActivity() {
    private val viewModel: DaisyViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    contentWindowInsets = WindowInsets.safeContent
                ) { innerPadding ->
                    NativeCyberWorkspace(
                        viewModel = viewModel,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}

@Composable
fun NativeCyberWorkspace(
    viewModel: DaisyViewModel,
    modifier: Modifier = Modifier
) {
    val ingressFiles by viewModel.ingressFiles.collectAsState()
    val tetherNodes by viewModel.tetherNodes.collectAsState()
    val discoveryLinks by viewModel.discoveryLinks.collectAsState()
    val consensusTasks by viewModel.consensusTasks.collectAsState()
    val logEvents by viewModel.logEvents.collectAsState()
    val isSpeaking by viewModel.isSpeaking.collectAsState()
    val currentUtterance by viewModel.currentUtterance.collectAsState()
    val waveAmplitudes by viewModel.waveAmplitudes.collectAsState()

    var currentTab by remember { mutableStateOf("TETHERS") }
    var showBindDialog by remember { mutableStateOf(false) }
    var showFileDialog by remember { mutableStateOf(false) }

    var activeWebView by remember { mutableStateOf<WebView?>(null) }

    LaunchedEffect(
        ingressFiles,
        tetherNodes,
        discoveryLinks,
        consensusTasks,
        logEvents,
        isSpeaking,
        currentUtterance,
        waveAmplitudes,
        activeWebView
    ) {
        val webView = activeWebView ?: return@LaunchedEffect
        
        val moshi = com.squareup.moshi.Moshi.Builder()
            .addLast(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
            .build()
        val mapListAdapter = moshi.adapter<List<Map<String, Any>>>(
            com.squareup.moshi.Types.newParameterizedType(List::class.java, Map::class.java)
        )

        fun encodeBase64(value: String): String {
            return android.util.Base64.encodeToString(
                value.toByteArray(Charsets.UTF_8),
                android.util.Base64.NO_WRAP
            )
        }

        // 1. Ingress Files
        val mappedFiles = ingressFiles.map { file ->
            mapOf("name" to file.name, "content" to file.content)
        }
        val filesBase64 = encodeBase64(mapListAdapter.toJson(mappedFiles))
        webView.evaluateJavascript("window.updateIngressFiles('$filesBase64')", null)

        // 2. Tether Nodes
        val mappedNodes = tetherNodes.map { node ->
            mapOf(
                "sessionId" to node.sessionId,
                "sessionName" to node.name,
                "domSelector" to node.targetElement,
                "active" to (node.status == "CONNECTED" || node.status == "SYNCING"),
                "targetBucket" to node.targetBucket,
                "mutationsCount" to node.errorCount
            )
        }
        val nodesBase64 = encodeBase64(mapListAdapter.toJson(mappedNodes))
        webView.evaluateJavascript("window.updateTetherNodes('$nodesBase64')", null)

        // 3. Discovery Links
        val mappedLinks = discoveryLinks.map { link ->
            mapOf("sourceUrl" to link.title, "requiredInformation" to link.requiredInfo)
        }
        val linksBase64 = encodeBase64(mapListAdapter.toJson(mappedLinks))
        webView.evaluateJavascript("window.updateDiscoveryLinks('$linksBase64')", null)

        // 4. Consensus Tasks
        val mappedTasks = consensusTasks.map { task ->
            mapOf(
                "operation" to task.objective,
                "payloadSize" to task.resultCode.length.coerceAtLeast(128),
                "verified" to (task.status == "COMPLETED")
            )
        }
        val tasksBase64 = encodeBase64(mapListAdapter.toJson(mappedTasks))
        webView.evaluateJavascript("window.updateConsensusTasks('$tasksBase64')", null)

        // 5. Log Events
        val mappedLogs = logEvents.map { log ->
            mapOf("type" to log.type, "timestamp" to log.timestamp, "message" to log.message)
        }
        val logsBase64 = encodeBase64(mapListAdapter.toJson(mappedLogs))
        webView.evaluateJavascript("window.updateLogEvents('$logsBase64')", null)

        // 6. Voice State
        val waveJson = "[" + waveAmplitudes.joinToString(",") + "]"
        val waveBase64 = encodeBase64(waveJson)
        val utteranceBase64 = encodeBase64(currentUtterance)
        webView.evaluateJavascript("window.updateVoiceState($isSpeaking, '$utteranceBase64', '$waveBase64')", null)
    }


    val pickZipLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        if (uri != null) {
            viewModel.importZipFile(uri)
        }
    }

    // Dialog form values
    var nodeNameVal by remember { mutableStateOf("Google AI Studio Node Alpha") }
    var nodeElementVal by remember { mutableStateOf("textarea.prompt-textarea") }
    var nodeBucketVal by remember { mutableStateOf("SOURCE") }

    var fileNameVal by remember { mutableStateOf("") }
    var fileContentVal by remember { mutableStateOf("") }

    // Real-time UTC Bridge clock simulator
    var utcTimeStr by remember { mutableStateOf("SYNCING...") }
    LaunchedEffect(Unit) {
        while (true) {
            val calendar = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"))
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss 'UTC'", java.util.Locale.US)
            sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
            utcTimeStr = "UTC Bridge: " + sdf.format(calendar.time)
            delay(1000)
        }
    }

    // Pulse animation for protocol status indicator
    val infiniteTransition = rememberInfiniteTransition(label = "pulse_trans")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(CyberDark)
    ) {
        // Main vertical content layout
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            // 1. HERO HEADER
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CyberCard)
                    .border(1.dp, NeonCyan.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
                    .padding(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Custom Cyberpunk Daisy Logo inside Canvas
                        Canvas(modifier = Modifier.size(36.dp)) {
                            drawCircle(color = NeonCyan, radius = 5.dp.toPx())
                            val petalRadius = 13.dp.toPx()
                            for (i in 0 until 8) {
                                val angle = (i * Math.PI / 4).toFloat()
                                val startX = center.x + Math.cos(angle.toDouble()).toFloat() * 7.dp.toPx()
                                val startY = center.y + Math.sin(angle.toDouble()).toFloat() * 7.dp.toPx()
                                val endX = center.x + Math.cos(angle.toDouble()).toFloat() * petalRadius
                                val endY = center.y + Math.sin(angle.toDouble()).toFloat() * petalRadius
                                drawLine(
                                    color = if (i % 2 == 0) NeonCyan else NeonGreen,
                                    start = Offset(startX, startY),
                                    end = Offset(endX, endY),
                                    strokeWidth = 2.dp.toPx(),
                                    cap = StrokeCap.Round
                                )
                            }
                        }

                        Column {
                            Text(
                                text = "DAISY CORE ENGINE",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.5.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(RoundedCornerShape(50))
                                        .background(NeonGreen)
                                        .alpha(pulseAlpha)
                                )
                                Text(
                                    text = "MMTAI PROTOCOL V3 : ACTIVE",
                                    color = NeonGreen,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }

                    Text(
                        text = utcTimeStr,
                        color = TextMuted,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 2. OMNIPRESENT PERSISTENT CONTEXT WIDGET
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CyberCard)
                    .border(1.dp, NeonCyan.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
                    .padding(12.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = "⚡", color = NeonCyan, fontSize = 12.sp)
                            Text(
                                text = "DAISY PERSISTENT ANCHOR CLUSTER",
                                color = LightCyan,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        }

                        val activeCount = tetherNodes.count { it.status == "CONNECTED" || it.status == "SYNCING" }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(NeonCyan)
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "$activeCount CONNECTED",
                                color = CyberDark,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (tetherNodes.isEmpty()) {
                        Text(
                            text = "Awaiting active anchor nodes...",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    } else {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(tetherNodes) { node ->
                                val active = node.status == "CONNECTED" || node.status == "SYNCING"
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(CyberDark)
                                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(RoundedCornerShape(50))
                                            .background(if (active) NeonGreen else NeonPink)
                                    )
                                    Text(
                                        text = node.name.uppercase().take(15) + (if (node.name.length > 15) ".." else ""),
                                        color = LightCyan,
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 3. CYBER NAVIGATION TABS
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val tabs = listOf("TETHERS", "INGRESS", "CONSENSUS", "TELEMETRY", "WEB")
                tabs.forEach { tab ->
                    val isActive = currentTab == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isActive) NeonCyan.copy(alpha = 0.08f) else CyberCard)
                            .border(
                                1.dp,
                                if (isActive) NeonCyan else Color.White.copy(alpha = 0.05f),
                                RoundedCornerShape(12.dp)
                            )
                            .clickable { currentTab = tab }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = when (tab) {
                                "TETHERS" -> "NODES"
                                "INGRESS" -> "INGRESS"
                                "CONSENSUS" -> "CONSENSUS"
                                "TELEMETRY" -> "TELEMETRY"
                                "WEB" -> "WEB"
                                else -> tab
                            },
                            color = if (isActive) NeonCyan else TextMuted,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 4. MAIN WORKSPACE VIEWPORT
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when (currentTab) {
                    "TETHERS" -> {
                        TethersTabContent(
                            tetherNodes = tetherNodes,
                            onBindClick = { showBindDialog = true },
                            onTripClick = { id -> viewModel.forceTripNode(id) },
                            onResetClick = { id -> viewModel.reconnectNode(id) },
                            onSeverClick = { id -> viewModel.severTether(id) }
                        )
                    }
                    "INGRESS" -> {
                        IngressTabContent(
                            ingressFiles = ingressFiles,
                            onDropZipClick = { pickZipLauncher.launch("application/zip") },
                            onAddFileClick = { showFileDialog = true },
                            onSimulateClick = {
                                viewModel.simulateDragDropFile(
                                    "RemoteController.kt",
                                    "class RemoteController {\n  fun initNode() {\n    // Dynamically loaded remote controller schema\n  }\n}"
                                )
                            }
                        )
                    }
                    "CONSENSUS" -> {
                        ConsensusTabContent(
                            viewModel = viewModel,
                            discoveryLinks = discoveryLinks,
                            consensusTasks = consensusTasks
                        )
                    }
                    "TELEMETRY" -> {
                        TelemetryTabContent(
                            logEvents = logEvents,
                            onClearLogs = { viewModel.clearLogs() }
                        )
                    }
                    "WEB" -> {
                        HybridWebView(
                            viewModel = viewModel,
                            onWebViewCreated = { activeWebView = it }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp)) // Padding to stay above the floating bottom panel
        }

        // 5. FLOATING BOTTOM VOICE PANEL
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(12.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(CyberCard.copy(alpha = 0.95f))
                .border(1.dp, NeonGreen.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    // Microphone active icon representation
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(50))
                            .background(if (isSpeaking) NeonGreen.copy(alpha = 0.15f) else CyberDark)
                            .border(
                                1.5.dp,
                                if (isSpeaking) NeonGreen else TextMuted,
                                RoundedCornerShape(50)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "🎤",
                            color = if (isSpeaking) NeonGreen else TextMuted,
                            fontSize = 14.sp
                        )
                    }

                    Column(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "DAISY CO-PILOT SYSTEM SPEECH",
                            color = NeonGreen,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                        Text(
                            text = currentUtterance,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Custom Animated Waveform drawing
                AudioWaveform(
                    amplitudes = waveAmplitudes,
                    isSpeaking = isSpeaking,
                    modifier = Modifier
                        .size(70.dp, 26.dp)
                        .padding(start = 8.dp)
                )
            }
        }
    }

    // MODAL DIALOGS
    if (showBindDialog) {
        Dialog(onDismissRequest = { showBindDialog = false }) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(CyberCard)
                    .border(1.dp, NeonCyan, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "BIND NEW ANCHOR TETHER",
                        color = NeonCyan,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        fontFamily = FontFamily.Monospace
                    )

                    OutlinedTextField(
                        value = nodeNameVal,
                        onValueChange = { nodeNameVal = it },
                        label = { Text("Tether Session Name", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedLabelColor = NeonCyan,
                            unfocusedLabelColor = TextMuted
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = nodeElementVal,
                        onValueChange = { nodeElementVal = it },
                        label = { Text("Target DOM Selector Element Node", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedLabelColor = NeonCyan,
                            unfocusedLabelColor = TextMuted
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = nodeBucketVal,
                        onValueChange = { nodeBucketVal = it },
                        label = { Text("Sandbox Target Bucket Association", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedLabelColor = NeonCyan,
                            unfocusedLabelColor = TextMuted
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End)
                    ) {
                        OutlinedButton(
                            onClick = { showBindDialog = false },
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                        ) {
                            Text("CANCEL", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                        }

                        Button(
                            onClick = {
                                viewModel.nodeNameInput.value = nodeNameVal
                                viewModel.targetElementInput.value = nodeElementVal
                                viewModel.targetBucketInput.value = nodeBucketVal
                                viewModel.performBindElement()
                                showBindDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = CyberDark)
                        ) {
                            Text("CREATE BINDING", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }

    if (showFileDialog) {
        Dialog(onDismissRequest = { showFileDialog = false }) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(CyberCard)
                    .border(1.dp, NeonCyan, RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "INGEST NEW CODE FILE",
                        color = NeonCyan,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        fontFamily = FontFamily.Monospace
                    )

                    OutlinedTextField(
                        value = fileNameVal,
                        onValueChange = { fileNameVal = it },
                        label = { Text("File Name (e.g. Config.json, PaymentService.kt)", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedLabelColor = NeonCyan,
                            unfocusedLabelColor = TextMuted
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = fileContentVal,
                        onValueChange = { fileContentVal = it },
                        label = { Text("File Source Content Code", color = TextMuted) },
                        minLines = 4,
                        maxLines = 8,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                            focusedLabelColor = NeonCyan,
                            unfocusedLabelColor = TextMuted
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End)
                    ) {
                        OutlinedButton(
                            onClick = { showFileDialog = false },
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                        ) {
                            Text("CANCEL", fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                        }

                        Button(
                            onClick = {
                                if (fileNameVal.isNotEmpty() && fileContentVal.isNotEmpty()) {
                                    viewModel.ingestManualFile(fileNameVal, fileContentVal)
                                    fileNameVal = ""
                                    fileContentVal = ""
                                    showFileDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = CyberDark)
                        ) {
                            Text("INGEST NOW", fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TethersTabContent(
    tetherNodes: List<com.example.data.TetherNode>,
    onBindClick: () -> Unit,
    onTripClick: (String) -> Unit,
    onResetClick: (String) -> Unit,
    onSeverClick: (String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ACTIVE MMTAI TETHERS",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )

            Button(
                onClick = onBindClick,
                colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = CyberDark),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.testTag("bind_new_element_btn")
            ) {
                Text(
                    text = "🔗 BIND NEW ELEMENT",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (tetherNodes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No active tether nodes. Create one to begin.",
                    color = TextMuted,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                items(tetherNodes, key = { it.sessionId }) { node ->
                    val active = node.status == "CONNECTED" || node.status == "SYNCING"
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(CyberCard)
                            .border(
                                1.dp,
                                if (active) NeonGreen.copy(alpha = 0.3f) else NeonPink.copy(alpha = 0.3f),
                                RoundedCornerShape(16.dp)
                            )
                            .padding(14.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(RoundedCornerShape(50))
                                            .background(if (active) NeonGreen else NeonPink)
                                    )
                                    Text(
                                        text = node.name,
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    if (active) {
                                        Button(
                                            onClick = { onTripClick(node.sessionId) },
                                            colors = ButtonDefaults.buttonColors(containerColor = NeonPink),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.testTag("trip_node_${node.sessionId}")
                                        ) {
                                            Text("TRIP BREAKER", fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                        }
                                    } else {
                                        Button(
                                            onClick = { onResetClick(node.sessionId) },
                                            colors = ButtonDefaults.buttonColors(containerColor = NeonGreen),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.testTag("reconnect_node_${node.sessionId}")
                                        ) {
                                            Text("RESET", fontSize = 8.sp, color = CyberDark, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                                        }
                                    }

                                    OutlinedButton(
                                        onClick = { onSeverClick(node.sessionId) },
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextMuted),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                                        shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.testTag("sever_node_${node.sessionId}")
                                    ) {
                                        Text("SEVER", fontSize = 8.sp, fontFamily = FontFamily.Monospace)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "SELECTOR:",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.width(100.dp)
                                )
                                Text(
                                    text = node.targetElement,
                                    color = LightCyan,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Row(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "SANDBOX BUCKET:",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    modifier = Modifier.width(100.dp)
                                )
                                Text(
                                    text = node.targetBucket,
                                    color = LightCyan,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(CyberDark)
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "MUTATIONS COUNT: ${node.errorCount}",
                                    color = TextMuted,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = "STATE: " + if (active) "MUTATION_WATCH_RUNNING" else "TRIPPED_CIRCUIT_BREAKER",
                                    color = if (active) NeonGreen else NeonPink,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun IngressTabContent(
    ingressFiles: List<com.example.data.IngressFile>,
    onDropZipClick: () -> Unit,
    onAddFileClick: () -> Unit,
    onSimulateClick: () -> Unit
) {
    var expandedFileId by remember { mutableStateOf<Long?>(null) }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "SANDBOX FILES [INGRESS]",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                OutlinedButton(
                    onClick = onDropZipClick,
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("drop_zip_btn")
                ) {
                    Text(
                        text = "📄 DROP ZIP",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Button(
                    onClick = onAddFileClick,
                    colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = CyberDark),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("add_file_btn")
                ) {
                    Text(
                        text = "</> ADD FILE",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Drag & drop interactive simulate card zone
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(NeonCyan.copy(alpha = 0.02f))
                .border(
                    BorderStroke(1.dp, NeonCyan.copy(alpha = 0.3f)),
                    RoundedCornerShape(16.dp)
                )
                .clickable { onSimulateClick() }
                .padding(20.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(text = "📂", fontSize = 24.sp)
                Text(
                    text = "DRAG & DROP ZIP OR CODE FILES HERE",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Or click to simulate instant drop of \"RemoteController.kt\"",
                    color = TextMuted,
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (ingressFiles.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No files ingested. Drop a ZIP or add one manually.",
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                items(ingressFiles, key = { it.id }) { file ->
                    val isExpanded = expandedFileId == file.id
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(CyberCard)
                            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                            .clickable { expandedFileId = if (isExpanded) null else file.id }
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Text(
                                        text = if (file.name.endsWith(".json")) "📋" else "📄",
                                        fontSize = 16.sp
                                    )
                                    Column {
                                        Text(
                                            text = file.name,
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )
                                        Text(
                                            text = "Size: ${(file.content.length / 1024f).toString().take(4)} KB | Path: src/main/java/${file.name}",
                                            color = TextMuted,
                                            fontSize = 9.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                }

                                Text(
                                    text = if (isExpanded) "CLOSE" else "INSPECT",
                                    color = NeonCyan,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            if (isExpanded) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(CyberDark)
                                        .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(8.dp))
                                        .padding(10.dp)
                                ) {
                                    Text(
                                        text = file.content,
                                        color = NeonGreen,
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace,
                                        modifier = Modifier.horizontalScroll(rememberScrollState())
                                    )
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
fun ConsensusTabContent(
    viewModel: DaisyViewModel,
    discoveryLinks: List<com.example.data.DiscoveryLink>,
    consensusTasks: List<com.example.data.ConsensusTask>
) {
    val promptInput by viewModel.userWrittenPrompt.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "KNOWLEDGE ENGINE COMMAND CENTER",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )

        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "High-Level Prompt / Requirements Objective",
                color = TextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )

            OutlinedTextField(
                value = promptInput,
                onValueChange = { viewModel.userWrittenPrompt.value = it },
                placeholder = { Text("Enter objective for the cluster...", color = TextMuted) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonCyan,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .testTag("prompt_input_field")
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = { viewModel.analyzeCodebaseGaps() },
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("scan_gaps_btn")
            ) {
                Text(
                    text = "🔍 SCAN CODE GAPS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            Button(
                onClick = { viewModel.triggerMapReduce() },
                colors = ButtonDefaults.buttonColors(containerColor = NeonGreen, contentColor = CyberDark),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .testTag("map_reduce_btn")
            ) {
                Text(
                    text = "⚡ MAP REDUCE",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Autonomous Knowledge Discovery Board
        if (discoveryLinks.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CyberCard)
                    .border(1.dp, NeonCyan.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
                    .padding(14.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "AUTONOMOUS KNOWLEDGE DISCOVERY BOARD",
                        color = NeonCyan,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        discoveryLinks.forEach { link ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CyberDark)
                                    .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(8.dp))
                                    .padding(10.dp)
                            ) {
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "🔗 " + link.url,
                                            color = Color.White,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(NeonAmber)
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = "GAP TRACE",
                                                color = CyberDark,
                                                fontSize = 7.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }
                                    }

                                    Text(
                                        text = link.requiredInfo,
                                        color = TextMuted,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Consensus & Code Arbitrator Matrix
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(CyberCard)
                .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Column {
                    Text(
                        text = "MULTI-AGENT CONSENSUS & CODE ARBITRATOR",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "Validate and match compiled schemas between data structures and visual views.",
                        color = TextMuted,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Button(
                    onClick = { viewModel.runConsensusValidation() },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = CyberDark),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("run_consensus_btn")
                ) {
                    Text(
                        text = "⚙️ RUN CONSENSUS INTEGRITY CHECK",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                if (consensusTasks.isNotEmpty()) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .padding(top = 8.dp)
                            .border(
                                BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
                                RoundedCornerShape(10.dp)
                            )
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "ACTIVE CONSENSUS MATRIX TASK QUEUE",
                            color = NeonCyan,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )

                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            consensusTasks.forEach { task ->
                                val matched = task.status == "COMPLETED"
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(CyberDark)
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = task.objective,
                                            color = Color.White,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = FontFamily.Monospace
                                        )
                                        Text(
                                            text = "Payload size: ${task.resultCode.length} chars",
                                            color = TextMuted,
                                            fontSize = 8.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }

                                    Text(
                                        text = if (matched) "MATCHED" else "PENDING",
                                        color = if (matched) NeonGreen else NeonAmber,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
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
fun TelemetryTabContent(
    logEvents: List<com.example.data.LogEvent>,
    onClearLogs: () -> Unit
) {
    val listState = rememberLazyListState()

    // Auto scroll console to bottom on new events
    LaunchedEffect(logEvents.size) {
        if (logEvents.isNotEmpty()) {
            listState.animateScrollToItem(logEvents.size - 1)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "LIVE SYSTEM ANCHOR TELEMETRY",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )

            IconButton(
                onClick = onClearLogs,
                modifier = Modifier.size(28.dp).testTag("clear_logs_btn")
            ) {
                Text(text = "🗑️", fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(16.dp))
                .background(CyberCard)
                .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                .padding(12.dp)
        ) {
            LazyColumn(
                state = listState,
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(logEvents) { event ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(CyberDark)
                            .padding(8.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                val tagColor = when (event.type) {
                                    "ERROR", "CIRCUIT_BREAKER" -> NeonPink
                                    "WARNING" -> NeonAmber
                                    "TTS" -> NeonCyan
                                    "ROUTING" -> NeonGreen
                                    else -> TextMuted
                                }

                                Text(
                                    text = "[${event.type}]",
                                    color = tagColor,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )

                                Text(
                                    text = "Bridge ${event.timestamp % 100000}",
                                    color = TextMuted,
                                    fontSize = 8.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            Spacer(modifier = Modifier.height(2.dp))

                            Text(
                                text = event.message,
                                color = Color.White,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AudioWaveform(
    amplitudes: FloatArray,
    isSpeaking: Boolean,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "wave_pulse_trans")
    val idlePulse by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2f * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wave_pulse_val"
    )

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val spacing = width / (amplitudes.size + 1)
        val centerY = height / 2f

        amplitudes.forEachIndexed { index, amp ->
            val x = (index + 1) * spacing
            val barHeight = if (isSpeaking) {
                height * amp
            } else {
                // idle wave pulse using math sine loop
                4.dp.toPx() + sin(idlePulse + index).absoluteValue * 6.dp.toPx()
            }

            drawLine(
                color = if (isSpeaking) NeonGreen else TextMuted.copy(alpha = 0.4f),
                start = Offset(x, centerY - barHeight / 2f),
                end = Offset(x, centerY + barHeight / 2f),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
        }
    }
}

@Composable
fun HybridWebView(
    viewModel: DaisyViewModel,
    modifier: Modifier = Modifier,
    onWebViewCreated: (WebView) -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                }
                webViewClient = WebViewClient()
                addJavascriptInterface(object {
                    @JavascriptInterface
                    fun performBindElement(name: String, element: String, bucket: String) {
                        coroutineScope.launch {
                            viewModel.tetherManager.bindToElement(name, element, bucket)
                        }
                    }

                    @JavascriptInterface
                    fun ingestManualFile(name: String, content: String) {
                        viewModel.ingestManualFile(name, content)
                    }

                    @JavascriptInterface
                    fun simulateDragDropFile(name: String, content: String) {
                        viewModel.simulateDragDropFile(name, content)
                    }

                    @JavascriptInterface
                    fun analyzeCodebaseGaps() {
                        viewModel.analyzeCodebaseGaps()
                    }

                    @JavascriptInterface
                    fun triggerMapReduce(prompt: String) {
                        coroutineScope.launch {
                            viewModel.userWrittenPrompt.value = prompt
                            viewModel.triggerMapReduce()
                        }
                    }

                    @JavascriptInterface
                    fun runConsensusValidation() {
                        viewModel.runConsensusValidation()
                    }

                    @JavascriptInterface
                    fun forceTripNode(sessionId: String) {
                        viewModel.forceTripNode(sessionId)
                    }

                    @JavascriptInterface
                    fun reconnectNode(sessionId: String) {
                        viewModel.reconnectNode(sessionId)
                    }

                    @JavascriptInterface
                    fun severTether(sessionId: String) {
                        viewModel.severTether(sessionId)
                    }

                    @JavascriptInterface
                    fun clearLogs() {
                        viewModel.clearLogs()
                    }
                }, "DaisyBridge")

                loadUrl("file:///android_asset/index.html")
                onWebViewCreated(this)
            }
        },
        modifier = modifier.fillMaxSize()
    )
}


*/
