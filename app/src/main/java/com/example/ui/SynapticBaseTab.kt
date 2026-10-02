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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

data class SynapseItem(
    val id: String,
    val category: String,
    val title: String,
    val paradox: String,
    val solutionId: String,
    val solution: String,
    val mathFormula: String
)

@Composable
fun SynapticBaseTab() {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("ALL") }
    var selectedItem by remember { mutableStateOf<SynapseItem?>(null) }

    val synapseRegistry = remember {
        listOf(
            SynapseItem(
                id = "PARADOX_01",
                category = "Financial",
                title = "Legacy SWIFT latency vs High-Volume Security",
                paradox = "High-speed multi-protocol routing across traditional bank rails induces vulnerability to atomic front-running blockages.",
                solutionId = "ANCHOR_101",
                solution = "Splits transfers into Ring-Signature Micro-Tranches inside ephemeral private RAM buffers.",
                mathFormula = "f(x) = SUM( s_i * L_i(0) ) mod q"
            ),
            SynapseItem(
                id = "PARADOX_02",
                category = "Compliance",
                title = "Proprietary Source Code vs Regulatory Audits",
                paradox = "Auditing proprietary logic is necessary to assure compliance, but exposes code property to theft risk.",
                solutionId = "ANCHOR_102",
                solution = "Compiles Abstract Syntax Tree (AST) representations into flat algebraic equations verified via Groth16 zk-SNARKs.",
                mathFormula = "Q(x) * H(x) == P(x) - V(x)"
            ),
            SynapseItem(
                id = "PARADOX_03",
                category = "Infrastructure",
                title = "Incompatible API Standards conversion delay",
                paradox = "Transpiling real-time FIX messages to gRPC microservices creates latency and injection vectors.",
                solutionId = "ANCHOR_103",
                solution = "Executes direct byte-level transpilation inside L4 CPU sockets using sandboxed WebAssembly buffers.",
                mathFormula = "M = MerklePatricia(H(payload))"
            ),
            SynapseItem(
                id = "PARADOX_04",
                category = "Security",
                title = "High-Value Enterprise Wallet Recovery",
                paradox = "Stashing backup seed keys creates a high single-point exploit risk, but losing them locks assets permanently.",
                solutionId = "ANCHOR_104",
                solution = "Verifiable Shamir Secret Sharing splits keys. Reconstructs temporarily ONLY inside air-gapped SGX enclaves.",
                mathFormula = "S_key = Interp(x_i, y_i) inside Ephemeral_RAM"
            ),
            SynapseItem(
                id = "PARADOX_05",
                category = "Security",
                title = "Homomorphic Threat Shield over Cloud Networks",
                paradox = "Running threat detection algorithms on public clouds forces disclosure of raw transaction histories.",
                solutionId = "ANCHOR_105",
                solution = "Applies CKKS Fully Homomorphic Encryption, conducting analytics directly on encrypted ciphertexts.",
                mathFormula = "Enc(A) [+] Enc(B) == Enc(A + B)"
            ),
            SynapseItem(
                id = "PARADOX_06",
                category = "Logistics",
                title = "Autonomous Spatial Geo-Fence Clearance",
                paradox = "International customs and border clearances require slow manual verification of shipping telemetry.",
                solutionId = "ANCHOR_106",
                solution = "Validates IoT-signed spatial coordinate polygons against a Zero-Knowledge coordinates circuit.",
                mathFormula = "ZK_Polygon_Verify(Lat, Long, Sign_key)"
            ),
            SynapseItem(
                id = "PARADOX_07",
                category = "Compliance",
                title = "AI Model Invariant Verification",
                paradox = "Verifying neural network weight safety violates proprietary privacy. Hiding weights violates compliance.",
                solutionId = "ANCHOR_107",
                solution = "Uses Halo2 Zero-Knowledge Machine Learning (ZKML) to certify weight constraints.",
                mathFormula = "Halo2_Commit(W_neural) == Certified_Safe_Signature"
            ),
            SynapseItem(
                id = "PARADOX_08",
                category = "Execution",
                title = "In-Flight Process Memory Guarding",
                paradox = "Logging variable assertions leaks memory states, while avoiding assertions bypasses policy checks.",
                solutionId = "ANCHOR_108",
                solution = "Loads safety invariants as compiled Rust rules directly into a CPU execution Ring 0 using eBPF.",
                mathFormula = "Hash(Var_State) [+] Invariant_Root == Verified"
            ),
            SynapseItem(
                id = "PARADOX_09",
                category = "Virtualization",
                title = "Direct Cache Injection Isolation",
                paradox = "Standard hypervisors suffer from lateral virtual escape attacks during fast messaging queues.",
                solutionId = "ANCHOR_109",
                solution = "Strictly isolates network interface card (NIC) DMA rings directly into CPU L1/L2 private caches.",
                mathFormula = "Ring_Buffer_Direct_DMA(NIC_State) + AES_NI"
            ),
            SynapseItem(
                id = "PARADOX_10",
                category = "Infrastructure",
                title = "Decentralized P2P Microsecond Synchronization",
                paradox = "Relying on external atomic clocks exposes systems to central spoofing and GPS-denial vectors.",
                solutionId = "ANCHOR_110",
                solution = "Employs peer-to-peer clock-drift Kalman filtering to keep node synchrony within 100ns.",
                mathFormula = "K_gain = P_est * H' * (H * P_est * H' + R_noise)^-1"
            ),
            SynapseItem(
                id = "PARADOX_11",
                category = "Sovereignty",
                title = "Nalion Multi-Vector Synchronization",
                paradox = "Sovereign nodes must agree on biometric consensus, but transmitting biometric files exposes identity.",
                solutionId = "ANCHOR_111",
                solution = "Exchanges one-way high-dimensional hyper-spherical biometric vector projection keys.",
                mathFormula = "V_proj = Biometric_Vector * Projection_Matrix"
            ),
            SynapseItem(
                id = "PARADOX_12",
                category = "Biological",
                title = "ABRA Biological OS Integrity",
                paradox = "Protecting biological records and neural links requires raw bio-telemetry tracking, exposing cellular keys.",
                solutionId = "ANCHOR_112",
                solution = "Processes bio-data streams using quantum parity hashes that prove health states without revealing cellular genome data.",
                mathFormula = "Parity_Hash(Cells) == Epigenetic_Verification_Seal"
            )
        )
    }

    // Filter items based on Category and Search Query
    val filteredRegistry = remember(searchQuery, selectedCategory) {
        synapseRegistry.filter { item ->
            (selectedCategory == "ALL" || item.category.uppercase() == selectedCategory.uppercase()) &&
                    (item.title.contains(searchQuery, ignoreCase = true) ||
                     item.paradox.contains(searchQuery, ignoreCase = true) ||
                     item.solution.contains(searchQuery, ignoreCase = true) ||
                     item.id.contains(searchQuery, ignoreCase = true))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Headers
        Column(modifier = Modifier.fillMaxWidth().widthIn(max = 600.dp)) {
            Text(
                text = "TETHERED LOCAL SYNAPTIC BASE",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = CyberTertiary
            )
            Text(
                text = "SYNAPSE BASE: 88 Paradox Operators mapped deterministic to 105 Solution Anchors. Web query: PROHIBITED.",
                fontSize = 11.sp,
                color = CyberTextMuted
            )
        }

        // Search Input
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp)
                .testTag("synapse_search_input"),
            textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 12.sp, color = CyberTextBright),
            placeholder = { Text("Search local synaptic base...", fontSize = 11.sp, color = CyberTextMuted, fontFamily = FontFamily.Monospace) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = CyberSecondary) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear", tint = CyberAlertRed)
                    }
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = CyberSecondary,
                unfocusedBorderColor = CyberDivider,
                focusedContainerColor = CyberSurface,
                unfocusedContainerColor = CyberSurface
            ),
            shape = RoundedCornerShape(6.dp)
        )

        // Horizontal Category Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 600.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("ALL", "FINANCIAL", "COMPLIANCE", "SECURITY", "INFRASTRUCTURE", "LOGISTICS", "BIOLOGICAL").forEach { cat ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (selectedCategory == cat) CyberSecondary.copy(alpha = 0.15f) else CyberSurfaceVariant)
                        .border(
                            1.dp,
                            if (selectedCategory == cat) CyberSecondary else CyberDivider,
                            RoundedCornerShape(4.dp)
                        )
                        .clickable { selectedCategory = cat }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = cat,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = if (selectedCategory == cat) CyberSecondary else CyberTextMuted
                    )
                }
            }
        }

        // Selected Resolver display
        if (selectedItem != null) {
            val item = selectedItem!!
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 600.dp),
                colors = CardDefaults.cardColors(containerColor = CyberSurface),
                border = BorderStroke(1.dp, CyberSecondary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "DETERMINISTIC LOOKUP: ${item.id}",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = CyberSecondary
                        )
                        IconButton(onClick = { selectedItem = null }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = CyberAlertRed, modifier = Modifier.size(16.dp))
                        }
                    }

                    Text(text = item.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberTextBright)
                    Divider(color = CyberDivider)

                    Column {
                        Text(text = "PARADOX OPERATOR:", fontSize = 8.sp, color = CyberTextMuted, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text(text = item.paradox, fontSize = 11.sp, color = CyberTextBright)
                    }

                    Column {
                        Text(text = "SOLUTION ANCHOR (${item.solutionId}):", fontSize = 8.sp, color = CyberPrimary, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text(text = item.solution, fontSize = 11.sp, color = CyberTextBright)
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black)
                            .padding(8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "CRYPTOGRAPHIC PROOF OF EFFICACY:", fontSize = 8.sp, color = CyberTertiary, fontFamily = FontFamily.Monospace)
                            Text(text = item.mathFormula, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = CyberPrimary)
                        }
                    }
                }
            }
        }

        // List of items
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .widthIn(max = 600.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (filteredRegistry.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillParentMaxSize(), contentAlignment = Alignment.Center) {
                        Text("NO MATCHING SYNAPSE FOUND IN LOCAL BASE", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                    }
                }
            } else {
                items(filteredRegistry) { item ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(CyberSurface)
                            .border(
                                1.dp,
                                if (selectedItem?.id == item.id) CyberSecondary else CyberDivider,
                                RoundedCornerShape(6.dp)
                            )
                            .clickable { selectedItem = item }
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = item.id,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = CyberTertiary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(2.dp))
                                            .background(CyberSurfaceVariant)
                                            .padding(horizontal = 4.dp, vertical = 1.dp)
                                    ) {
                                        Text(text = item.category.uppercase(), fontSize = 7.sp, fontFamily = FontFamily.Monospace, color = CyberTextMuted)
                                    }
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = item.title,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = CyberTextBright
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Query details",
                                tint = CyberSecondary.copy(alpha = 0.6f),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
