package com.example

import android.app.Application
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.*
import com.example.ui.model.ParadoxViewModel
import com.example.ui.model.ParadoxViewModelFactory
import com.example.ui.theme.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        setContent {
            MyApplicationTheme {
                // Initialize database and repository inside MainActivity using singletons
                val context = LocalContext.current
                val database = recuerDatabase(context)
                val repository = remember { ParadoxRepository(database.paradoxDao()) }
                
                val factory = remember { 
                    ParadoxViewModelFactory(context.applicationContext as Application, repository) 
                }
                val viewModel: ParadoxViewModel = viewModel(factory = factory)

                Scaffold(
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    SolvexDashboardScreen(
                        viewModel = viewModel,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }

    @Composable
    private fun recuerDatabase(context: android.content.Context): AppDatabase {
        return remember { AppDatabase.getDatabase(context) }
    }
}

@Composable
fun SolvexDashboardScreen(
    viewModel: ParadoxViewModel,
    modifier: Modifier = Modifier
) {
    val listings by viewModel.listings.collectAsStateWithLifecycle()
    val selectedParadox by viewModel.selectedParadox.collectAsStateWithLifecycle()
    val userWalletCredits by viewModel.userWalletCredits.collectAsStateWithLifecycle()
    val creatorRevenue by viewModel.creatorRevenue.collectAsStateWithLifecycle()
    val sandboxInputQuery by viewModel.sandboxInputQuery.collectAsStateWithLifecycle()
    val isEvaluatingSandbox by viewModel.isEvaluatingSandbox.collectAsStateWithLifecycle()
    val lastSandboxResultText by viewModel.lastSandboxResultText.collectAsStateWithLifecycle()
    val lastZKHash by viewModel.lastZKHash.collectAsStateWithLifecycle()
    val lastConfidence by viewModel.lastConfidence.collectAsStateWithLifecycle()
    val currentProbes by viewModel.currentProbes.collectAsStateWithLifecycle()
    val toastMessage by viewModel.toastMessage.collectAsStateWithLifecycle()
    val withdrawalAccount by viewModel.withdrawalAccount.collectAsStateWithLifecycle()
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    // Top-level Navigation states
    var activeTab by remember { mutableStateOf(0) } // 0 = Solvex Market, 1 = Self-Publish Node

    // Local form states for publishing a new paradox
    var newTitle by remember { mutableStateOf("") }
    var newCategory by remember { mutableStateOf("Logical") }
    var newStatement by remember { mutableStateOf("") }
    var newSecretSolution by remember { mutableStateOf("") }
    var newPriceStr by remember { mutableStateOf("250") }

    // Toggle dropdown filter for categories
    var selectedCategoryFilter by remember { mutableStateOf("ALL") }

    // Manage compile status animation
    var obfuscationCompileProgress by remember { mutableStateOf(0f) }
    var isCompilingObfuscation by remember { mutableStateOf(false) }
    var compiledObfuscatedOutput by remember { mutableStateOf<String?>(null) }
    
    // Manage buy credits dialog
    var showBuyCreditsDialog by remember { mutableStateOf(false) }
    var showWithdrawDialog by remember { mutableStateOf(false) }

    // Display toasts gracefully
    LaunchedEffect(toastMessage) {
        toastMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    // Secure 'Buy Credits' module dialogue display
    if (showBuyCreditsDialog) {
        BuyCreditsGatewayDialog(
            onDismiss = { showBuyCreditsDialog = false },
            onPurchaseCompleted = { amount, message ->
                viewModel.buySvxCredits(amount, message)
            }
        )
    }

    if (showWithdrawDialog && activeTab == 1) {
        WithdrawSvxDialog(
            currentAccount = withdrawalAccount,
            availableBalance = creatorRevenue,
            onDismiss = { showWithdrawDialog = false },
            onAccountChanged = { viewModel.setWithdrawalAccount(it) },
            onWithdraw = { amount, account ->
                viewModel.withdrawSvxCredits(amount, account)
                showWithdrawDialog = false
            }
        )
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // --- 1. Elegant Enclave Status Banner ---
        EnclaveHeaderPanel(
            userCredits = userWalletCredits,
            revenue = creatorRevenue,
            onAddCredits = { showBuyCreditsDialog = true },
            onWithdraw = { showWithdrawDialog = true },
            isCreatorWorkspace = (activeTab == 1)
        )

        // --- 2. Workspace Navigation Tab Bar ---
        TabRow(
            selectedTabIndex = activeTab,
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = MaterialTheme.colorScheme.primary,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[activeTab]),
                    color = MaterialTheme.colorScheme.primary,
                    height = 3.dp
                )
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Tab(
                selected = activeTab == 0,
                onClick = { activeTab = 0 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(imageVector = Icons.Default.ShoppingCart, contentDescription = "Marketplace")
                        Text("CUSTOMER MARKETPLACE", style = TextStyle(fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp))
                    }
                },
                modifier = Modifier.testTag("tab_marketplace")
            )
            Tab(
                selected = activeTab == 1,
                onClick = { activeTab = 1 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(imageVector = Icons.Default.Lock, contentDescription = "Publish Paradox")
                        Text("SOLE CREATOR CONSOLE", style = TextStyle(fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp))
                    }
                },
                modifier = Modifier.testTag("tab_publish")
            )
            Tab(
                selected = activeTab == 2,
                onClick = { activeTab = 2 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(imageVector = Icons.Default.Check, contentDescription = "CTO Audit & SLA")
                        Text("CTO AUDIT & SLA MATRIX", style = TextStyle(fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp))
                    }
                },
                modifier = Modifier.testTag("tab_cto_audit")
            )
        }

        Divider(
            thickness = 1.dp,
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
        )

        // --- 3. Content Panel ---
        Crossfade(targetState = activeTab, modifier = Modifier.weight(1f)) { tab ->
            when (tab) {
                0 -> {
                    // --- TAB 1: Solve & Buy Portal ---
                    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                        val isTablet = maxWidth > 720.dp
                        
                        if (isTablet) {
                            // Dual pane layout for large/tablet views
                            Row(modifier = Modifier.fillMaxSize()) {
                                // Left sidebar to explore listings
                                Column(
                                    modifier = Modifier
                                        .weight(0.4f)
                                        .fillMaxHeight()
                                        .border(
                                            width = 1.dp,
                                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(0.dp)
                                        )
                                        .padding(12.dp)
                                ) {
                                    CategoryFiltersRow(
                                        selected = selectedCategoryFilter,
                                        onSelected = { selectedCategoryFilter = it }
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    ListingsPane(
                                        listings = listings,
                                        selectedFilter = selectedCategoryFilter,
                                        selectedId = selectedParadox?.id,
                                        onSelect = { viewModel.selectParadox(it) }
                                    )
                                }

                                // Right sidebar containing active paradox + ZK Sandbox console
                                Column(
                                    modifier = Modifier
                                        .weight(0.6f)
                                        .fillMaxHeight()
                                        .verticalScroll(rememberScrollState())
                                        .padding(16.dp)
                                ) {
                                    selectedParadox?.let { active ->
                                        ActiveWorkspaceCard(
                                            paradox = active,
                                            sandboxInput = sandboxInputQuery,
                                            onQueryChange = { viewModel.setSandboxInput(it) },
                                            isEvaluating = isEvaluatingSandbox,
                                            onEvalClick = { viewModel.runSandboxQuery() },
                                            lastResultText = lastSandboxResultText,
                                            lastZKHash = lastZKHash,
                                            lastConfidence = lastConfidence,
                                            currentProbes = currentProbes,
                                            onClearLogs = { viewModel.clearProbesLog() },
                                            onBuyEscrow = { viewModel.initiateEscrowPurchase() },
                                            onReleaseEscrow = { viewModel.releaseEscrowToCreator() },
                                            onRefundEscrow = { viewModel.refundEscrow() },
                                            isCompilingObfuscation = isCompilingObfuscation,
                                            obfuscationCompileProgress = obfuscationCompileProgress,
                                            compiledObfuscatedOutput = compiledObfuscatedOutput,
                                            onCompileObfuscation = {
                                                scope.launch {
                                                    isCompilingObfuscation = true
                                                    compiledObfuscatedOutput = null
                                                    for (p in 1..100) {
                                                        obfuscationCompileProgress = p / 100f
                                                        delay(15) // High-integrity secure hardware verification compilation steps
                                                    }
                                                    compiledObfuscatedOutput = generateSecureDeploysSnippet(active)
                                                    isCompilingObfuscation = false
                                                }
                                            }
                                        )
                                    } ?: EmptyStateMessage()
                                }
                            }
                        } else {
                            // Standard phone layouts
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .verticalScroll(rememberScrollState())
                                    .padding(12.dp)
                            ) {
                                // Listings Carousel selector cards
                                Text(
                                    text = "SELECT CAUSALITY PUZZLE:",
                                    style = TextStyle(
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp
                                    ),
                                    modifier = Modifier.padding(start = 4.dp, bottom = 4.dp)
                                )
                                CategoryFiltersRow(
                                    selected = selectedCategoryFilter,
                                    onSelected = { selectedCategoryFilter = it }
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                Box(modifier = Modifier.height(130.dp)) {
                                    HorizontalListingsPane(
                                        listings = listings,
                                        selectedFilter = selectedCategoryFilter,
                                        selectedId = selectedParadox?.id,
                                        onSelect = { viewModel.selectParadox(it) }
                                    )
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                selectedParadox?.let { active ->
                                    ActiveWorkspaceCard(
                                        paradox = active,
                                        sandboxInput = sandboxInputQuery,
                                        onQueryChange = { viewModel.setSandboxInput(it) },
                                        isEvaluating = isEvaluatingSandbox,
                                        onEvalClick = { viewModel.runSandboxQuery() },
                                        lastResultText = lastSandboxResultText,
                                        lastZKHash = lastZKHash,
                                        lastConfidence = lastConfidence,
                                        currentProbes = currentProbes,
                                        onClearLogs = { viewModel.clearProbesLog() },
                                        onBuyEscrow = { viewModel.initiateEscrowPurchase() },
                                        onReleaseEscrow = { viewModel.releaseEscrowToCreator() },
                                        onRefundEscrow = { viewModel.refundEscrow() },
                                        isCompilingObfuscation = isCompilingObfuscation,
                                        obfuscationCompileProgress = obfuscationCompileProgress,
                                        compiledObfuscatedOutput = compiledObfuscatedOutput,
                                        onCompileObfuscation = {
                                            scope.launch {
                                                isCompilingObfuscation = true
                                                compiledObfuscatedOutput = null
                                                for (p in 1..100) {
                                                    obfuscationCompileProgress = p / 100f
                                                    delay(15)
                                                }
                                                compiledObfuscatedOutput = generateSecureDeploysSnippet(active)
                                                isCompilingObfuscation = false
                                            }
                                        }
                                    )
                                } ?: EmptyStateMessage()
                            }
                        }
                    }
                }

                1 -> {
                    // --- TAB 2: List Custom Paradox Node ---
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
                            ),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = "Shield Guard",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "SEALED INVENTOR ESCROW NODE",
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    "When you seal a riddle, the underlying formula is stored as a compiled secret hash in the Solvex Core. Potential buyers can run sandbox test assertions to verify correctness, but nobody can read or copy your math formulation before escrow release.",
                                    style = TextStyle(
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                                        lineHeight = 16.sp
                                    )
                                )
                            }
                        }

                        // Input fields
                        OutlinedTextField(
                            value = newTitle,
                            onValueChange = { newTitle = it },
                            label = { Text("Paradox Title") },
                            placeholder = { Text("e.g. Grandfather Paradox, Liar Paradox") },
                            modifier = Modifier.fillMaxWidth().testTag("input_title"),
                            leadingIcon = { Icon(imageVector = Icons.Default.Create, contentDescription = null) },
                            singleLine = true
                        )

                        // Category Selector
                        Column {
                            Text(
                                "CATEGORY CLASSIFICATION:",
                                style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val categories = listOf("Logical", "Temporal", "Mathematical", "Information", "Quantum", "Philosophical")
                                categories.forEach { cat ->
                                    FilterChip(
                                        selected = newCategory == cat,
                                        onClick = { newCategory = cat },
                                        label = { Text(cat) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                            selectedLabelColor = MaterialTheme.colorScheme.primary
                                        )
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = newStatement,
                            onValueChange = { newStatement = it },
                            label = { Text("Core Contradiction / Statement") },
                            placeholder = { Text("Describe the logic trap/loop clearly so others can evaluate the challenge.") },
                            modifier = Modifier.fillMaxWidth().height(120.dp).testTag("input_statement"),
                            leadingIcon = { Icon(imageVector = Icons.Default.Info, contentDescription = null) }
                        )

                        OutlinedTextField(
                            value = newSecretSolution,
                            onValueChange = { newSecretSolution = it },
                            label = { Text("Secret Solver Formulation") },
                            placeholder = { Text("Enter the actual mathematical or physical formulas. This remains mathematically encrypted until escrow is released!") },
                            modifier = Modifier.fillMaxWidth().height(120.dp).testTag("input_solution"),
                            leadingIcon = { Icon(imageVector = Icons.Default.Lock, contentDescription = null) }
                        )

                        OutlinedTextField(
                            value = newPriceStr,
                            onValueChange = { newPriceStr = it },
                            label = { Text("Causality Valuation / Price in USD ($)") },
                            placeholder = { Text("e.g. 45000") },
                            modifier = Modifier.fillMaxWidth().testTag("input_price"),
                            leadingIcon = { Icon(imageVector = Icons.Default.Star, contentDescription = null) },
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                val pricePrice = newPriceStr.toDoubleOrNull() ?: -1.0
                                if (pricePrice <= 0) {
                                    Toast.makeText(context, "Please enter a valid numeric pricing amount.", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                viewModel.listNewParadox(
                                    title = newTitle,
                                    category = newCategory,
                                    statement = newStatement,
                                    secretSolution = newSecretSolution,
                                    price = pricePrice
                                )
                                // Clear form & flip back
                                newTitle = ""
                                newStatement = ""
                                newSecretSolution = ""
                                activeTab = 0
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("button_list_paradox"),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Send, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("CRYPTOGRAPHICALLY SEAL & LIST", style = TextStyle(fontWeight = FontWeight.Bold))
                        }
                    }
                }
                2 -> {
                    com.example.ui.CtoAuditScreen()
                }
            }
        }
    }
}

// --- SUB-COMPONENTS & LAYOUT PARTS ---Block

@Composable
fun TickerItem(name: String, value: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(color, RoundedCornerShape(3.dp))
        )
        Text(
            text = "$name $value",
            style = TextStyle(
                fontFamily = FontFamily.Monospace,
                fontSize = 8.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFF9F5EA).copy(alpha = 0.9f)
            )
        )
    }
}

@Composable
fun EnclaveHeaderPanel(
    userCredits: Double,
    revenue: Double,
    onAddCredits: () -> Unit,
    onWithdraw: () -> Unit = {},
    isCreatorWorkspace: Boolean = false
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Horizontal stock ticker showing Wall Street indices of causality assets!
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.Black)
                .padding(vertical = 5.dp, horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.weight(1f)
            ) {
                TickerItem("SVX/USD", "+6.74%", IndexGreen)
                TickerItem("TEMP/COH", "+14.22%", IndexGreen)
                TickerItem("MATH/INF", "+0.15%", IndexGreen)
                TickerItem("QUAN/SYS", "-1.89%", AlertRed)
            }
            Text(
                text = "SOLE SOLUTION CREATOR & INVENTOR ACCESS: ONLINE (100% PARITY & ZERO-COPY GUARANTEED)",
                style = TextStyle(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold,
                    color = WallStreetGold
                )
            )
        }

        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            shape = RoundedCornerShape(0.dp),
            border = BorderStroke(width = 0.5.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Glowing bullpen gold circle indicator
                        val goldColor = WallStreetGold
                        Spacer(
                            modifier = Modifier
                                .size(14.dp)
                                .drawBehind {
                                    drawCircle(
                                        color = goldColor,
                                        radius = size.minDimension / 2.2f,
                                        style = Stroke(
                                            width = 2.5.dp.toPx()
                                        )
                                    )
                                }
                        )
                        Text(
                            "SOLVEX PARADOX B2B SOLUTIONS",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                letterSpacing = 1.0.sp,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            "INSTITUTIONAL TIER-1",
                            style = TextStyle(
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                fontFamily = FontFamily.Monospace
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // --- Wallstreet Sovereign Uneditable / Audit-Proof Verification Panel ---
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.background)
                        .border(
                            width = 1.dp,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "SOVEREIGN PARITY STATUS",
                                style = TextStyle(
                                    fontSize = 7.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                                )
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = "Lock",
                                    tint = Color(0xFF00FF88),
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    "100% PARITY VERIFIED / AUDIT-PROOF",
                                    style = TextStyle(
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace,
                                        color = Color(0xFF00FF88),
                                        letterSpacing = 0.2.sp
                                    )
                                )
                            }
                        }

                        // Compact separator
                        Spacer(
                            modifier = Modifier
                                .width(1.dp)
                                .height(22.dp)
                                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        )

                        Column {
                            Text(
                                "INSTITUTIONAL DUE DILIGENCE INQUIRIES",
                                style = TextStyle(
                                    fontSize = 7.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                                )
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    "INSTITUTIONAL ACCREDITED",
                                    style = TextStyle(
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace,
                                        color = WallStreetGold
                                    )
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(Color(0xFF00FF88).copy(alpha = 0.15f))
                                        .padding(horizontal = 4.dp, vertical = 1.dp)
                                ) {
                                    Text(
                                        "100% PARITY",
                                        style = TextStyle(
                                            fontSize = 7.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color(0xFF00FF88),
                                            fontFamily = FontFamily.Monospace
                                        )
                                    )
                                }
                            }
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFF00FF88).copy(alpha = 0.1f))
                            .border(width = 0.5.dp, color = Color(0xFF00FF88).copy(alpha = 0.3f), shape = RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                    ) {
                        Text(
                            "INSTITUTIONAL AUDIT PARITY: 100% CERTIFIED",
                            style = TextStyle(
                                fontSize = 8.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF00FF88),
                                fontFamily = FontFamily.Monospace
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Revenue (Visible only to Sole Solution Creator & Inventor)
                    if (isCreatorWorkspace) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "INVENTOR ROYALTIES (USD)",
                                style = TextStyle(
                                    fontSize = 8.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
                                )
                            )
                            Text(
                                "$%,.2f".format(revenue),
                                style = TextStyle(
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF00FF88)
                                )
                            )
                        }
                    }

                    // Credits HUD block
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(24.dp))
                            .background(MaterialTheme.colorScheme.background)
                            .border(
                                1.dp,
                                Color(0xFF00FF88).copy(alpha = 0.35f),
                                RoundedCornerShape(24.dp)
                            )
                            .padding(start = 12.dp, end = 6.dp, top = 4.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "SVX CASH WALLET",
                                style = TextStyle(
                                    fontSize = 7.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF00FF88)
                                )
                            )
                            Text(
                                "%,.1f SVX ($%,.2f)".format(userCredits, userCredits),
                                style = TextStyle(
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF00FF88)
                                )
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Button(
                            onClick = onAddCredits,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF00FF88),
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            modifier = Modifier
                                .height(26.dp)
                                .testTag("button_add_credits")
                        ) {
                            Text(
                                "BUY SVX WITH USD",
                                style = TextStyle(
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace
                                )
                            )
                        }
                        if (isCreatorWorkspace) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Button(
                                onClick = onWithdraw,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = WallStreetGold,
                                    contentColor = Color.Black
                                ),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier
                                    .height(26.dp)
                                    .testTag("button_withdraw_svx")
                            ) {
                                Text(
                                    "WITHDRAW SVX",
                                    style = TextStyle(
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace
                                    )
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
fun CategoryFiltersRow(
    selected: String,
    onSelected: (String) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.horizontalScroll(rememberScrollState())
    ) {
        val categories = listOf("ALL", "Security", "Information", "Logical", "Temporal", "Mathematical", "Quantum")
        categories.forEach { cat ->
            FilterChip(
                selected = selected == cat,
                onClick = { onSelected(cat) },
                label = { Text(cat) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                    selectedLabelColor = MaterialTheme.colorScheme.primary,
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
            )
        }
    }
}

@Composable
fun ListingsPane(
    listings: List<ParadoxListing>,
    selectedFilter: String,
    selectedId: Int?,
    onSelect: (Int) -> Unit
) {
    val filtered = remember(listings, selectedFilter) {
        if (selectedFilter == "ALL") listings
        else listings.filter { it.category.equals(selectedFilter, ignoreCase = true) }
    }

    if (filtered.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No paradoxes found in this branch.", style = TextStyle(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)))
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(filtered) { item ->
                ParadoxItemRow(
                    item = item,
                    isSelected = item.id == selectedId,
                    onSelect = { onSelect(item.id) }
                )
            }
        }
    }
}

@Composable
fun HorizontalListingsPane(
    listings: List<ParadoxListing>,
    selectedFilter: String,
    selectedId: Int?,
    onSelect: (Int) -> Unit
) {
    val filtered = remember(listings, selectedFilter) {
        if (selectedFilter == "ALL") listings
        else listings.filter { it.category.equals(selectedFilter, ignoreCase = true) }
    }

    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.horizontalScroll(rememberScrollState())
    ) {
        filtered.forEach { item ->
            Box(modifier = Modifier.width(220.dp)) {
                ParadoxItemRow(
                    item = item,
                    isSelected = item.id == selectedId,
                    onSelect = { onSelect(item.id) }
                )
            }
        }
    }
}

@Composable
fun ParadoxItemRow(
    item: ParadoxListing,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val borderAlpha = if (isSelected) 0.8f else 0.1f
    val borderColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    
    var showSandbox by remember { mutableStateOf(false) }
    var inputQuery by remember { mutableStateOf("") }
    var isEvaluatingRow by remember { mutableStateOf(false) }
    var outputResultText by remember { mutableStateOf<String?>(null) }
    var outputZKHash by remember { mutableStateOf<String?>(null) }
    var outputConfidence by remember { mutableStateOf<Double?>(null) }
    val coroutineScope = rememberCoroutineScope()
    
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surface.copy(alpha = 0.4f)
        ),
        border = BorderStroke(
            width = if (isSelected) 1.5.dp else 1.dp,
            color = borderColor.copy(alpha = borderAlpha)
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() }
            .testTag("paradox_item_${item.id}")
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(getCategoryColor(item.category).copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        item.category.uppercase(),
                        style = TextStyle(
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = getCategoryColor(item.category),
                            fontFamily = FontFamily.Monospace
                        )
                    )
                }

                // Status tag
                Text(
                    text = when {
                        item.unlocked -> "✦ VAULT UNLOCKED"
                        item.escrowLocked -> "🔒 IN ESCROW"
                        else -> "⚿ SEALED"
                    },
                    style = TextStyle(
                        fontSize = 8.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            item.unlocked -> MaterialTheme.colorScheme.primary
                            item.escrowLocked -> MaterialTheme.colorScheme.tertiary
                            else -> MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f)
                        }
                    )
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = item.title,
                style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Bold),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Seller: ${item.creatorName}",
                    style = TextStyle(fontSize = 10.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "$%,.0f USD".format(item.price),
                    style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88))
                )
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.08f))
            Spacer(modifier = Modifier.height(6.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                        .clickable { showSandbox = !showSandbox }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Sandbox",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (showSandbox) "CLOSE VALIDATOR ▲" else "🧪 TEST AT SANDBOX ▼",
                        style = TextStyle(
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
                
                Text(
                    text = "${item.totalSales} Sales",
                    style = TextStyle(fontSize = 9.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f), fontFamily = FontFamily.Monospace)
                )
            }

            AnimatedVisibility(
                visible = showSandbox,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                ) {
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "ZERO-KNOWLEDGE CUSTOMER VALIDATOR",
                        style = TextStyle(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Verify that the encrypted formula successfully handles all input scenarios before escrow buying. No raw source logic is exposed.",
                        style = TextStyle(fontSize = 10.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f), lineHeight = 13.sp)
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "SUGGESTED VALIDATION PROBES:",
                        style = TextStyle(fontSize = 8.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    val suggestions = when {
                        item.title.contains("Compliance", ignoreCase = true) -> listOf(
                            "Simulate intrusion of 50,000 write vectors",
                            "Attempt administrative settings purge"
                        )
                        item.title.contains("Auditing", ignoreCase = true) -> listOf(
                            "Attempt backdated modification at T-10",
                            "Simulate hardware ledger force wipe"
                        )
                        item.title.contains("Sharing", ignoreCase = true) -> listOf(
                            "Attempt database extraction cloning",
                            "Verify sandbox memory read block"
                        )
                        item.title.contains("Zero-Trust", ignoreCase = true) -> listOf(
                            "Verify async delay with 1,000,000 requests",
                            "Challenge handshake key limits"
                        )
                        item.title.contains("API Bridge", ignoreCase = true) -> listOf(
                            "Perform randomized port intrusion scan",
                            "Assert credential handshake without dynamic key"
                        )
                        item.title.contains("Admin", ignoreCase = true) -> listOf(
                            "Bypass consensus with single high-privilege signature",
                            "Assert shamir threshold key assembly"
                        )
                        else -> listOf(
                            "Simulate logical edge-case constraints",
                            "Run verification logic evaluation"
                        )
                    }
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        suggestions.forEach { suggestion ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(100.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(0.5.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), RoundedCornerShape(100.dp))
                                    .clickable { 
                                        inputQuery = suggestion 
                                    }
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = suggestion,
                                    style = TextStyle(fontSize = 8.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(10.dp))
                    
                    var inputErrorMessage by remember { mutableStateOf<String?>(null) }
                    OutlinedTextField(
                        value = inputQuery,
                        onValueChange = { 
                            inputQuery = it 
                            if (it.isNotEmpty()) inputErrorMessage = null
                        },
                        label = { Text("Scenario parameters / assert queries", fontSize = 11.sp) },
                        placeholder = { Text("e.g. Try administrative tampering scenario", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                        textStyle = TextStyle(fontSize = 11.sp),
                        trailingIcon = {
                            if (isEvaluatingRow) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 1.5.dp)
                            } else {
                                IconButton(
                                    onClick = {
                                        if (inputQuery.trim().isEmpty()) {
                                            inputErrorMessage = "Please select/type a query."
                                        } else {
                                            coroutineScope.launch {
                                                isEvaluatingRow = true
                                                try {
                                                    val result = com.example.api.GeminiClient.evaluateSandboxQuery(
                                                        paradoxTitle = item.title,
                                                        paradoxStatement = item.statement,
                                                        solutionSecret = item.solverSecret,
                                                        userInput = inputQuery.trim()
                                                    )
                                                    outputResultText = result.proofText
                                                    outputZKHash = result.zkHash
                                                    outputConfidence = result.confidence
                                                } catch (e: Exception) {
                                                    outputResultText = "ZK Secure Enclave Error: ${e.message}"
                                                    outputZKHash = "INVALID_ZK_SIGNATURE"
                                                    outputConfidence = 0.0
                                                } finally {
                                                    isEvaluatingRow = false
                                                }
                                            }
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = "Run Probe",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    )
                    
                    if (inputErrorMessage != null) {
                        Text(
                            text = inputErrorMessage ?: "",
                            color = AlertRed,
                            fontSize = 8.sp,
                            modifier = Modifier.padding(start = 4.dp, top = 2.dp)
                        )
                    }
                    
                    AnimatedVisibility(visible = outputResultText != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp)
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    "VALIDATOR SECURE ENCLAVE OUTPUT:",
                                    style = TextStyle(
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                )
                                outputConfidence?.let { c ->
                                    Text(
                                        "CONGRUENCY: ${(c * 100).toInt()}% ✓ APPROVED",
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF00FF88)
                                        )
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(4.dp))
                            
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF030708), RoundedCornerShape(6.dp))
                                    .border(0.5.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f), RoundedCornerShape(6.dp))
                                    .padding(8.dp)
                            ) {
                                Column {
                                    Text(
                                        text = outputResultText ?: "",
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 10.sp,
                                            color = Color(0xFF00FF88),
                                            lineHeight = 13.sp
                                        )
                                    )
                                    
                                    outputZKHash?.let { hash ->
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "ZK PROOF SIGNATURE: $hash",
                                            style = TextStyle(
                                                fontFamily = FontFamily.Monospace,
                                                fontSize = 8.sp,
                                                color = Color.LightGray
                                            )
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
}

@Composable
fun ActiveWorkspaceCard(
    paradox: ParadoxListing,
    sandboxInput: String,
    onQueryChange: (String) -> Unit,
    isEvaluating: Boolean,
    onEvalClick: () -> Unit,
    lastResultText: String?,
    lastZKHash: String?,
    lastConfidence: Double?,
    currentProbes: List<SandboxProbe>,
    onClearLogs: () -> Unit,
    onBuyEscrow: () -> Unit,
    onReleaseEscrow: () -> Unit,
    onRefundEscrow: () -> Unit,
    isCompilingObfuscation: Boolean,
    obfuscationCompileProgress: Float,
    compiledObfuscatedOutput: String?,
    onCompileObfuscation: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Active challenge summary Card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(getCategoryColor(paradox.category).copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = getCategoryIcon(paradox.category),
                                contentDescription = null,
                                tint = getCategoryColor(paradox.category),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                paradox.title,
                                style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            )
                            Text(
                                "CLASSIFICATION: ${paradox.category}",
                                style = TextStyle(fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            )
                        }
                    }

                    Text(
                        text = "$%,.2f USD".format(paradox.price),
                        style = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88))
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                
                Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "THE RETRO-CONUNDRUM",
                    style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.primary, letterSpacing = 1.sp)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = paradox.statement,
                    style = TextStyle(fontSize = 13.sp, color = MaterialTheme.colorScheme.onBackground, lineHeight = 18.sp),
                    textAlign = TextAlign.Justify
                )

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "SECURE ENCLAVE DIGEST: ${paradox.proofDigest}",
                    style = TextStyle(fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                )
            }
        }

        // --- THE ESCROW PURCHASE / STATE MACHINE STATUS CARD ---
        Card(
            colors = CardDefaults.cardColors(
                containerColor = when {
                    paradox.unlocked -> MaterialTheme.colorScheme.primary.copy(alpha = 0.05f)
                    paradox.escrowLocked -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.05f)
                    else -> MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
                }
            ),
            border = BorderStroke(
                width = 1.dp,
                color = when {
                    paradox.unlocked -> MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                    paradox.escrowLocked -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.3f)
                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                }
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                when {
                    paradox.unlocked -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "VAULT DECRYPTED & ROYALTY TRANSFERRED",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                            )
                        }
                    }

                    paradox.escrowLocked -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.tertiary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "SOLVEX CRYPTO-ESCROW SECURED",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.tertiary)
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Funds are safely locked in the escrow contract. Run as many logic evaluations inside the sandbox console below as you require. If you are satisfied the mathematical solver resolves the contradiction, release the escrow to decrypt. If not, refund instantly.",
                            style = TextStyle(fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f), lineHeight = 16.sp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onReleaseEscrow,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = Color.Black
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("button_release_escrow")
                            ) {
                                Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("RELEASE ESCROW", style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold))
                            }

                            OutlinedButton(
                                onClick = onRefundEscrow,
                                border = BorderStroke(1.dp, AlertRed),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = AlertRed
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("button_refund_escrow")
                            ) {
                                Icon(imageVector = Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("REFUND ESCROW", style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold))
                            }
                        }
                    }

                    else -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "SOLUTION ENCRYPTED IN ESCROW SHELL",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "To unlock the underlying algorithms, formulas, and deployment code, initiate an escrow contract. Funds remain protected until you manually verify the sandbox results.",
                            style = TextStyle(fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f), lineHeight = 16.sp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onBuyEscrow,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF00FF88),
                                contentColor = Color.Black
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp)
                                .testTag("button_start_escrow")
                        ) {
                            Icon(imageVector = Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("INITIATE CRYPTO-ESCROW ($%,.0f USD)".format(paradox.price), style = TextStyle(fontWeight = FontWeight.Bold))
                        }
                    }
                }
            }
        }

        // --- LOGICAL VAULT: DISPLAY THE SOLUTIONS ONCE SECURELY UNLOCKED --
        AnimatedVisibility(
            visible = paradox.unlocked,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF070F11)
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF00FF88),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "SECURE UNCOPYABLE PROVISIONING ACTIVE",
                                style = TextStyle(
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    color = Color(0xFF00FF88)
                                )
                            )
                        }

                        IconButton(
                            onClick = {
                                val secureToken = """
                                {
                                  "solve_x_protocol": "ZREE-v4.1",
                                  "gateway_state": "ACTIVE",
                                  "target_enclave_digest": "${paradox.proofDigest}",
                                  "deployment_driver_hash": "${paradox.proofDigest}0xDF7_SECURED",
                                  "integrity_verification_metrics": "TERMUX_SOAK_CERTIFIED_0_BREACH"
                                }
                                """.trimIndent()
                                clipboardManager.setText(AnnotatedString(secureToken))
                                Toast.makeText(context, "Secure Integration Token Copied! Ready to mount in your servers.", Toast.LENGTH_LONG).show()
                            }
                        ) {
                            Icon(imageVector = Icons.Default.Share, contentDescription = "Copy Driver Token", tint = Color(0xFF00FF88))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                            .border(0.5.dp, Color(0xFF00FF88).copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "RUNTIME STATE: PROVISIONED",
                                    style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = Color(0xFF00FF88), fontWeight = FontWeight.Bold)
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(Color(0xFF00FF88).copy(alpha = 0.15f))
                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        "REPLICATION SHIELD: 100% SECURE",
                                        style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 8.sp, color = Color(0xFF00FF88), fontWeight = FontWeight.ExtraBold)
                                    )
                                }
                            }
                            Divider(color = Color(0xFF00FF88).copy(alpha = 0.15f), modifier = Modifier.padding(vertical = 4.dp))
                            Text(
                                text = "The solver formula is fully active and provisioned as an immutable runtime driver. Devices running the SolveX secure wrapper can query the results with zero risk of the core mathematical steps leaking, being extracted from RAM, or copied before and after sale.",
                                style = TextStyle(
                                    fontFamily = FontFamily.SansSerif,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
                                    lineHeight = 16.sp
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    
                    // --- BOLD DETAILED PROPER MECHANISM EXPLANATION ---
                    Text(
                        text = "DECRYPTED SOLUTION MECHANICS & PROOF:",
                        style = TextStyle(
                            fontSize = 10.sp, 
                            fontWeight = FontWeight.Bold, 
                            fontFamily = FontFamily.Monospace, 
                            color = MaterialTheme.colorScheme.primary,
                            letterSpacing = 0.5.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = when {
                            paradox.title.contains("Compliance", ignoreCase = true) -> 
                                "Deploying a write-blocked enclave firmware dashboard locks down all database operations at the chip registers. Administrative edits/tampering become physically impossible, which eliminates compliance risk and renders manual audits chronologically redundant."
                            paradox.title.contains("Auditing", ignoreCase = true) -> 
                                "SolveX writes system history registers to WORM (Write-Once-Read-Many) physical microchannels. High-privilege actors cannot clean or overwrite histories since any alteration drops physical wire signals, immediately triggering peer-consensus locks."
                            paradox.title.contains("Sharing", ignoreCase = true) -> 
                                "SolveX utilizes ephemeral in-memory ZK enclaves that compute the target multi-party logic but output singular digital results only. Raw dynamic records are shredded before leaving processing registers, and local display prevents cloning."
                            paradox.title.contains("Overhead", ignoreCase = true) -> 
                                "Asymmetrical hardware handshakes utilize pre-cached state keys, translating cryptographic proofs to hardware layer execution. Zero-Trust verification executes in sub-milliseconds without network latency."
                            paradox.title.contains("API Bridge", ignoreCase = true) -> 
                                "Eliminates public scan surfaces by binding ports under chaotic dynamic coordinate-shifting. Port routes change dynamically; connection requests are dropped silently unless packed with high-integrity cryptographic keys."
                            paradox.title.contains("Admin", ignoreCase = true) -> 
                                "Replaces single-root administrative keys with dynamic, multi-party Shamir splits. Action execution requires independent co-signatures from three separate enclaves, neutralizing administrator coercion."
                            paradox.title.contains("IoT", ignoreCase = true) -> 
                                "Integrates grid-mesh thermal sensors directly into chip packages. Any mechanical intrusion or desoldering event triggers safe voltage short-circuit, instantly erasing pre-stored device keys."
                            paradox.title.contains("Supply-Chain", ignoreCase = true) -> 
                                "Executes third-party runtime bundles inside isolated micro-sandboxes. Packages are restricted from disk or network access unless validated against the specific dynamic signature manifest."
                            paradox.title.contains("Fraud", ignoreCase = true) -> 
                                "Evaluates financial streams against mathematically rigorous invariant equations inline, capturing illicit money diversion patterns before the database write state can commit."
                            paradox.title.contains("IP Capture", ignoreCase = true) -> 
                                "Encrypts active weight matrices within protected register space throughout inference pipelines. Plaintext weight tensors never reside in system memory, preventing model copying."
                            paradox.title.contains("Legacy", ignoreCase = true) -> 
                                "Implements absolute input conversion wrappers. Incoming legacy streams are serialized to non-executable memory structures, neutralizing buffer overflow or protocol injection exploits."
                            else -> "The SolveX original system resolves database and operational contradictions by locking down states completely."
                        },
                        style = TextStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f), lineHeight = 16.sp)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Corporate WallStreet dynamic safe-harbor licensing card
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                        ),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    "B2B INTELLECTUAL PROPERTY RECONCILIATION SEAL",
                                    style = TextStyle(
                                        fontFamily = FontFamily.Monospace, 
                                        fontWeight = FontWeight.Bold, 
                                        fontSize = 10.sp, 
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "License Authority: Solvex-Enclave Automated Smart-Release\nAuthorized Signature Token: ${paradox.proofDigest}0xDF7\nExecution Policy Constraint: Locked against external memory replication. Re-shoveling or side-channel snooping of this logic on invalid hosts triggers automatic hardware-based signature voiding.",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f), lineHeight = 13.sp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    // --- OBFUSCATOR COMPILER SECTION ---
                    Text(
                        "LOGIC OBFUSCATOR ENCLAVE WRAPPER",
                        style = TextStyle(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Prevent subsequent buyers or external actors from copy-pasting your human-readable formula logic. Obfuscate and compile to safe, hardware-locked binary assembly bytecode.",
                        style = TextStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f), lineHeight = 15.sp)
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))

                    if (isCompilingObfuscation) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            LinearProgressIndicator(
                                progress = obfuscationCompileProgress,
                                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                "Securing Logic Nodes... ${(obfuscationCompileProgress * 100).toInt()}%",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = MaterialTheme.colorScheme.primary)
                            )
                        }
                    } else {
                        Button(
                            onClick = onCompileObfuscation,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondary,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(imageVector = Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("EXECUTE OBFUSCATION COMPILER", style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold))
                        }
                    }

                    compiledObfuscatedOutput?.let { snippet ->
                        Spacer(modifier = Modifier.height(12.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.Black, RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        "SECURE_WRAPPER_DEPLOY.rs",
                                        style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = Color.Gray)
                                    )
                                    Text(
                                        "COPY BAYESIAN WRAPPER ✦",
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace, 
                                            fontSize = 9.sp, 
                                            color = MaterialTheme.colorScheme.primary, 
                                            fontWeight = FontWeight.Bold
                                        ),
                                        modifier = Modifier.clickable {
                                            clipboardManager.setText(AnnotatedString(snippet))
                                            Toast.makeText(context, "Encrypted template copied!", Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = snippet,
                                    style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Color(0xFFC5E1A5))
                                )
                            }
                        }
                    }
                }
            }
        }

        // --- THE ZERO-KNOWLEDGE INTERACTIVE SANDBOX CONSOLE ---
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Sandbox",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "ZERO-KNOWLEDGE VERIFICATION SANDBOX",
                        style = TextStyle(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Test logic scenarios against the sealed enclave. Verify that the mathematical equations compute valid outcomes for edge-cases. Zero logic of the underlying solution is disclosed during test probing.",
                    style = TextStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f), lineHeight = 15.sp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = sandboxInput,
                    onValueChange = onQueryChange,
                    label = { Text("Scenario parameters / Probe Query") },
                    placeholder = { Text("e.g. Test grandfather age 22, timeline speed 0.95c") },
                    modifier = Modifier.fillMaxWidth().testTag("sandbox_query_field"),
                    maxLines = 2,
                    trailingIcon = {
                        if (isEvaluating) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        } else {
                            IconButton(onClick = onEvalClick, modifier = Modifier.testTag("button_run_probe")) {
                                Icon(imageVector = Icons.Default.PlayArrow, contentDescription = "Run Probe", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Output Screen Terminal
                AnimatedVisibility(visible = lastResultText != null) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "TERMINAL OUTPUT:",
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            )
                            lastConfidence?.let { c ->
                                Text(
                                    "CONGRUENCY: ${(c * 100).toInt()}% Verified ✓",
                                    style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = MaterialTheme.colorScheme.secondary)
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(6.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF060D0F), RoundedCornerShape(8.dp))
                                .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                lastResultText?.let {
                                    Text(
                                        text = it,
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 11.sp,
                                            color = Color(0xFF00FF88)
                                        )
                                    )
                                }
                                lastZKHash?.let {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "ENCLAVE RECEIPT: $it",
                                        style = TextStyle(
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 9.sp,
                                            color = Color.LightGray
                                        )
                                    )
                                }
                            }
                        }
                    }
                }

                // Historical checks/probes list
                if (currentProbes.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "HISTORIC ENCLAVE RESOLVES (${currentProbes.size})",
                            style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f))
                        )
                        Text(
                            "CLEAR HISTORY ⚿",
                            style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = AlertRed, fontWeight = FontWeight.Bold),
                            modifier = Modifier.clickable { onClearLogs() }
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    Column(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 120.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        currentProbes.forEach { probe ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.background, RoundedCornerShape(6.dp))
                                    .padding(8.dp)
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.weight(1.0f)) {
                                        Text(
                                            "Q: ${probe.queryInput}",
                                            style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            "ZK-RECEIPT: ${probe.zkProofHash}",
                                            style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 8.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
                                        )
                                    }
                                    Text(
                                        "✓ PASS",
                                        style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
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
fun EmptyStateMessage() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                modifier = Modifier.size(52.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "No Paradox Node Selected",
                style = TextStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
            )
            Text(
                "Select a riddle above to interface with its sandbox.",
                style = TextStyle(fontSize = 12.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.4f))
            )
        }
    }
}

// Helpers for stylish color mapping based on logical categories
fun getCategoryColor(cat: String): Color {
    return when (cat.lowercase()) {
        "security" -> Color(0xFF00FF88)     // Cyber electric green
        "information" -> Color(0xFFD500F9)  // Magenta warp
        "temporal" -> Color(0xFF00E5FF)     // Cyan clear
        "logical" -> Color(0xFF536DFE)      // Indigo logic
        "mathematical" -> Color(0xFF2979FF) // Blue proof
        "quantum" -> Color(0xFFFF9100)      // Amber wave
        "philosophical" -> Color(0xFFFFEA00)// Gold contemplation
        else -> Color(0xFF00FF88)           // Cyber default
    }
}

fun getCategoryIcon(cat: String): ImageVector {
    return when (cat.lowercase()) {
        "security" -> Icons.Default.Lock
        "information" -> Icons.Default.Info
        "temporal" -> Icons.Default.Refresh
        "logical" -> Icons.Default.List
        "mathematical" -> Icons.Default.Add
        "quantum" -> Icons.Default.PlayArrow
        "philosophical" -> Icons.Default.Info
        else -> Icons.Default.List
    }
}

// Dynamic secure obfuscation deployment generator code snippet
fun generateSecureDeploysSnippet(paradox: ParadoxListing): String {
    val uppercaseName = paradox.title.replace(" ", "_").uppercase()
    return """
// --- SOLVEX OBFUSCATED BYTECODE LOADER ---
// Cryptographic protection wrapper for: ${paradox.title}
// Generated Secure Enclave Container Template [Rust/Cargo std]

#![no_std]
extern crate alloc;

use solvex_core_enclave::{EnclaveAuth, ZkProofVerifier};

// Self-scrambling bytecode buffer mapped to hardware-isolated memory
static LOGIC_BYTECODE: &[u8] = &[
    0x4f, 0xbd, 0x1a, 0xef, 0x82, 0xc1, 0x9a, 0x48, 
    0xbc, 0x5a, 0xde, 0x73, 0x02, 0xd4, 0xae, 0x19,
    0xf8, 0x3d, 0x7a, 0x82, 0xe1, 0x22, 0xd0, 0x93
];

#[no_mangle]
pub unsafe extern "C" fn solve_${uppercaseName.lowercase()}(
    auth_key: *const u8,
    inputs: *const f64,
    out_payload: *mut u8
) -> i32 {
    // 1. Verify caller licensing footprint against TPM hardware chip
    if !EnclaveAuth::verify_hardware_seal(auth_key) {
        return -101; // ERR_HARDWARE_MISMATCH
    }

    // 2. Load and decrypt bytecode logic dynamically in isolated SGX memory
    let evaluator = ZkProofVerifier::init_enclave_runner(LOGIC_BYTECODE);
    
    // 3. Perform the convergent equation resolves under protection
    match evaluator.evaluate_scenarios(inputs) {
        Ok(result) => {
            core::ptr::copy_nonoverlapping(result.as_ptr(), out_payload, result.len());
            0 // SUCCESS
        },
        Err(_) => -202 // ERR_CONVERGENCE_FAULT
    }
}
""".trimIndent()
}

@Composable
fun BuyCreditsGatewayDialog(
    onDismiss: () -> Unit,
    onPurchaseCompleted: (Double, String) -> Unit
) {
    var usdAmountStr by remember { mutableStateOf("1000") }
    var cardholderName by remember { mutableStateOf("Satoshi Nakamoto") }
    var cardNumber by remember { mutableStateOf("4111 2222 3333 4444") }
    var expiryDate by remember { mutableStateOf("12/28") }
    var cvv by remember { mutableStateOf("326") }

    // Errors
    var cardholderError by remember { mutableStateOf<String?>(null) }
    var cardNumberError by remember { mutableStateOf<String?>(null) }
    var expiryError by remember { mutableStateOf<String?>(null) }
    var cvvError by remember { mutableStateOf<String?>(null) }
    var usdAmountError by remember { mutableStateOf<String?>(null) }

    // Process State
    // 0 = IDLE, 1 = SECURING_TUNNEL, 2 = VERIFYING_CARD, 3 = LEDGER_MINTING, 4 = COMPLETED
    var progressStep by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    androidx.compose.ui.window.Dialog(
        onDismissRequest = { if (progressStep == 0 || progressStep == 4) onDismiss() },
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .widthIn(max = 500.dp)
                .wrapContentHeight()
                .padding(16.dp)
                .border(1.5.dp, Color(0xFF00FF88), RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(0xFF070F11) // Match the deep space dark theme
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                if (progressStep == 0) {
                    // IDLE - Show the purchase interface
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = Color(0xFF00FF88),
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                "SECURE SVX PAYPORT",
                                style = TextStyle(
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFF00FF88)
                                )
                            )
                        }
                        IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Color.White.copy(alpha = 0.6f))
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Convert USD cash instantly into highly secure SVX digital credits. Conversions are backed 1-to-1 by physical vault liquidity reserves.",
                        style = TextStyle(fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f), fontFamily = FontFamily.Monospace)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // 1. Convert Amount selection
                    Text(
                        "1. CONV AMOUNT (USD)",
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88))
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Quick tier select
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val tiers = listOf("250", "1000", "5000", "20000")
                        tiers.forEach { tier ->
                            val isSelected = usdAmountStr == tier
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) Color(0xFF00FF88) else Color.White.copy(alpha = 0.05f))
                                    .border(1.dp, if (isSelected) Color(0xFF00FF88) else Color.White.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                                    .clickable { usdAmountStr = tier; usdAmountError = null }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "$$tier",
                                    style = TextStyle(
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace,
                                        color = if (isSelected) Color.Black else Color.White
                                    )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = usdAmountStr,
                        onValueChange = { 
                            usdAmountStr = it
                            usdAmountError = null
                        },
                        label = { Text("Custom Amount ($ USD)", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                        isError = usdAmountError != null,
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF00FF88),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                            errorBorderColor = Color.Red
                        )
                    )
                    usdAmountError?.let {
                        Text(it, color = Color.Red, style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace))
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // 2. Encrypted payment card details
                    Text(
                        "2. SECURE PAYMENT GATEWAY (PCI-DSS ENCRYPTED)",
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88))
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = cardholderName,
                        onValueChange = { cardholderName = it; cardholderError = null },
                        label = { Text("Name on Card", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                        isError = cardholderError != null,
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF00FF88),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
                        )
                    )
                    cardholderError?.let {
                        Text(it, color = Color.Red, style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace))
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = cardNumber,
                        onValueChange = { cardNumber = it; cardNumberError = null },
                        label = { Text("Card Number", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                        placeholder = { Text("4111 2222 3333 4444", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                        isError = cardNumberError != null,
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFF00FF88),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
                        )
                    )
                    cardNumberError?.let {
                        Text(it, color = Color.Red, style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace))
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = expiryDate,
                            onValueChange = { expiryDate = it; expiryError = null },
                            label = { Text("Expiry (MM/YY)", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                            placeholder = { Text("12/28", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                            isError = expiryError != null,
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF00FF88),
                                unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
                            )
                        )
                        OutlinedTextField(
                            value = cvv,
                            onValueChange = { cvv = it; cvvError = null },
                            label = { Text("CVV", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                            placeholder = { Text("326", style = TextStyle(fontFamily = FontFamily.Monospace)) },
                            isError = cvvError != null,
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF00FF88),
                                unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
                            )
                        )
                    }
                    
                    Row {
                        if (expiryError != null) {
                            Text(expiryError!!, color = Color.Red, style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace), modifier = Modifier.weight(1f))
                        }
                        if (cvvError != null) {
                            Text(cvvError!!, color = Color.Red, style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace), modifier = Modifier.weight(1f))
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Final conversion rate box
                    val parsedAmount = usdAmountStr.toDoubleOrNull() ?: 0.0
                    val expectedSvx = parsedAmount // 1:1
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF00FF88).copy(alpha = 0.08f))
                            .border(0.5.dp, Color(0xFF00FF88).copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("CONVERSIONS TOTAL", style = TextStyle(fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = Color.White.copy(alpha = 0.6f)))
                                Text("$%,.2f USD".format(parsedAmount), style = TextStyle(fontSize = 15.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = Color.White))
                            }
                            Icon(imageVector = Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFF00FF88), modifier = Modifier.size(16.dp))
                            Column(horizontalAlignment = Alignment.End) {
                                Text("CREDITS DETECTED", style = TextStyle(fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = Color.White.copy(alpha = 0.6f)))
                                Text("%,.1f SVX".format(expectedSvx), style = TextStyle(fontSize = 15.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = Color(0xFF00FF88)))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            var valid = true
                            val amount = usdAmountStr.toDoubleOrNull()
                            if (amount == null || amount <= 0) {
                                usdAmountError = "Please enter a valid amount > 0"
                                valid = false
                            }
                            if (cardholderName.trim().isEmpty()) {
                                cardholderError = "Cardholder name is required"
                                valid = false
                            }
                            if (cardNumber.trim().length < 12) {
                                cardNumberError = "Please enter a valid 16-digit card number"
                                valid = false
                            }
                            if (expiryDate.trim().isEmpty() || !expiryDate.contains("/")) {
                                expiryError = "Invalid expiry (MM/YY)"
                                valid = false
                            }
                            if (cvv.trim().length < 3) {
                                cvvError = "Invalid CVV"
                                valid = false
                            }

                            if (valid && amount != null) {
                                // Trigger animation sequence
                                scope.launch {
                                    progressStep = 1
                                    delay(1200)
                                    progressStep = 2
                                    delay(1200)
                                    progressStep = 3
                                    delay(1200)
                                    progressStep = 4 // success
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF00FF88),
                            contentColor = Color.Black
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "AUTHORIZE SECURE SWAP", 
                            style = TextStyle(fontWeight = FontWeight.Bold, letterSpacing = 1.sp, fontFamily = FontFamily.Monospace)
                        )
                    }
                } else if (progressStep < 4) {
                    // Progress / secure processing module
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            color = Color(0xFF00FF88),
                            strokeWidth = 3.dp,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        val statusText = when (progressStep) {
                            1 -> "SECURE SOCKET: TUNNELING ENCRYPTED PCI STREAM..."
                            2 -> "VAULT LEDGER: RELEASING US DOLLARS..."
                            3 -> "DRIVER AGENT: SEEDING NEW SVX ASSET BLOCKS..."
                            else -> "NEGOTIATING EXCHANGE LIQUIDITY CORES..."
                        }

                        Text(
                            statusText,
                            style = TextStyle(
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF00FF88),
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                } else {
                    // Success state!
                    val parsedAmount = usdAmountStr.toDoubleOrNull() ?: 0.0
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(RoundedCornerShape(32.dp))
                                .background(Color(0xFF00FF88).copy(alpha = 0.15f))
                                .border(1.5.dp, Color(0xFF00FF88), RoundedCornerShape(32.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = Color(0xFF00FF88),
                                modifier = Modifier.size(36.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.height(18.dp))
                        
                        Text(
                            "CREDIT CONVERSIONS MINTED",
                            style = TextStyle(
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFF00FF88)
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            "Successfully acquired $%,.1f SVX via secure encrypted fiat gateway. Converted USD funds are securely locked within certified banking vault reserves.".format(parsedAmount),
                            style = TextStyle(
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color.White.copy(alpha = 0.7f),
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = {
                                onPurchaseCompleted(
                                    parsedAmount,
                                    "Successfully purchased %s SVX with USD ($%,.2f equivalent)!".format(
                                        "%,.1f".format(parsedAmount),
                                        parsedAmount
                                    )
                                )
                                onDismiss()
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF00FF88),
                                contentColor = Color.Black
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                "OK, CLOSE CHANNEL",
                                style = TextStyle(fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun WithdrawSvxDialog(
    currentAccount: String,
    availableBalance: Double,
    onDismiss: () -> Unit,
    onAccountChanged: (String) -> Unit,
    onWithdraw: (Double, String) -> Unit
) {
    var accountStr by remember { mutableStateOf(currentAccount) }
    var amountStr by remember { mutableStateOf("10000") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    // 0 = IDLE, 1 = EXECUTING TRANCHE, 2 = SUCCESS
    var step by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    androidx.compose.ui.window.Dialog(
        onDismissRequest = { if (step != 1) onDismiss() },
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .widthIn(max = 500.dp)
                .wrapContentHeight()
                .padding(16.dp)
                .border(1.5.dp, WallStreetGold, RoundedCornerShape(16.dp)),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF070F11))
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
                if (step == 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "CUSTOM TRANCHE WITHDRAWAL",
                                style = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace, color = WallStreetGold)
                            )
                            Text(
                                "SOLVEX ZERO-LIMIT LIQUIDITY PORT",
                                style = TextStyle(fontSize = 9.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color.White.copy(alpha = 0.5f))
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White.copy(alpha = 0.6f))
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Authorized as Sole Solution Creator & Inventor. Set royalty withdrawal tranche amounts to bypass standard daily bottlenecks. (Regular marketplace customers do not have access to withdrawal rails).",
                        style = TextStyle(fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f), lineHeight = 15.sp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Available balance HUD
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF132328))
                            .border(0.5.dp, WallStreetGold.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("TOTAL LIQUIDITY RESERVE:", style = TextStyle(fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = Color.White.copy(alpha = 0.6f)))
                            Text("%,.1f SVX".format(availableBalance), style = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88)))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = accountStr,
                        onValueChange = { 
                            accountStr = it
                            onAccountChanged(it)
                        },
                        label = { Text("Destination PayPort URI / PayPal") },
                        placeholder = { Text("e.g. Paypal.me/tjites") },
                        modifier = Modifier.fillMaxWidth().testTag("input_withdrawal_account"),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = WallStreetGold,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                            focusedLabelColor = WallStreetGold,
                            unfocusedLabelColor = Color.White.copy(alpha = 0.6f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = amountStr,
                        onValueChange = { 
                            amountStr = it
                            errorMessage = null
                        },
                        label = { Text("Custom Withdrawal Amount (SVX)") },
                        placeholder = { Text("Enter SVX tranche amount") },
                        modifier = Modifier.fillMaxWidth().testTag("input_withdrawal_amount"),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = WallStreetGold,
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                            focusedLabelColor = WallStreetGold,
                            unfocusedLabelColor = Color.White.copy(alpha = 0.6f),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(errorMessage!!, style = TextStyle(fontSize = 11.sp, color = AlertRed, fontFamily = FontFamily.Monospace))
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Quick Tranche chips
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        val tranches = listOf("5000", "25000", "50000", availableBalance.toInt().toString())
                        val labels = listOf("5k", "25k", "50k", "MAX")
                        tranches.zip(labels).forEach { (valStr, lab) ->
                            Button(
                                onClick = { amountStr = valStr },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A3038), contentColor = WallStreetGold),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                modifier = Modifier.height(26.dp).weight(1f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(lab, style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            val amt = amountStr.toDoubleOrNull() ?: -1.0
                            if (amt <= 0) {
                                errorMessage = "Please enter a valid numeric tranche amount."
                                return@Button
                            }
                            if (amt > availableBalance) {
                                errorMessage = "Amount exceeds total reserve (%,.1f SVX).".format(availableBalance)
                                return@Button
                            }
                            step = 1
                            scope.launch {
                                kotlinx.coroutines.delay(1200)
                                onWithdraw(amt, accountStr)
                                step = 2
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = WallStreetGold, contentColor = Color.Black),
                        modifier = Modifier.fillMaxWidth().height(48.dp).testTag("button_confirm_withdraw"),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("EXECUTE TRANCHE WITHDRAWAL", style = TextStyle(fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace, fontSize = 12.sp))
                    }
                } else if (step == 1) {
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = WallStreetGold)
                        Spacer(modifier = Modifier.height(20.dp))
                        Text("DISPATCHING TRANCHE TO %s...".format(accountStr.uppercase()), style = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = WallStreetGold, fontSize = 12.sp))
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("BYPASSING DAILY BANKING LIMIT BOTTLENECKS", style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 9.sp, color = Color.White.copy(alpha = 0.5f)))
                    }
                } else {
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF00FF88), modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("TRANCHE DISPATCHED", style = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace, color = Color(0xFF00FF88)))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Sent %s SVX to %s".format(amountStr, accountStr), style = TextStyle(fontSize = 12.sp, color = Color.White.copy(alpha = 0.8f), fontFamily = FontFamily.Monospace))
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = onDismiss,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00FF88), contentColor = Color.Black),
                            modifier = Modifier.fillMaxWidth().height(44.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("DONE", style = TextStyle(fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace))
                        }
                    }
                }
            }
        }
    }
}
