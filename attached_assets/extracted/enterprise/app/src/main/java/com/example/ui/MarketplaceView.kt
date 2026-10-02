package com.example.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.Product
import com.example.ui.theme.*

@Composable
fun MarketplaceView(
    products: List<Product>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    selectedDomain: String,
    onDomainSelect: (String) -> Unit,
    onProductClick: (Product) -> Unit
) {
    val domains = listOf("ALL", "Cryptography & ZK Privacy", "High-Frequency Financial", "Security & Compliance", "Identity & Access (IAM)", "AI Governance & SLAs")

    val filteredProducts = remember(products, searchQuery, selectedDomain) {
        products.filter { p ->
            val matchDomain = selectedDomain == "ALL" || p.domain.equals(selectedDomain, ignoreCase = true) || (selectedDomain == "AI Governance & SLAs" && p.domain.contains("Governance")) || (selectedDomain == "Identity & Access (IAM)" && p.domain.contains("Identity")) || (selectedDomain == "Security & Compliance" && p.domain.contains("Security")) || (selectedDomain == "High-Frequency Financial" && p.domain.contains("Frequency")) || (selectedDomain == "Cryptography & ZK Privacy" && p.domain.contains("Cryptography"))
            val matchQuery = searchQuery.isBlank() || p.title.contains(searchQuery, ignoreCase = true) || p.subtitle.contains(searchQuery, ignoreCase = true) || p.description.contains(searchQuery, ignoreCase = true)
            matchDomain && matchQuery
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(ObsidianNavy)) {
        // Hero Banner Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(RoyalSlate, ObsidianNavy)
                    )
                )
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(CyberCyan.copy(alpha = 0.15f), Color.Transparent),
                            radius = 400f
                        )
                    )
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.Bottom
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = RichGold, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("SOLVEX ENTERPRISE MARKETPLACE", style = MaterialTheme.typography.labelMedium.copy(color = RichGold, fontWeight = FontWeight.Bold, letterSpacing = 1.sp))
                }
                Text("29 Tier-1 Paradox Solutions", style = MaterialTheme.typography.headlineMedium.copy(color = TextPrimary, fontWeight = FontWeight.ExtraBold))
                Text("100% secure IP key escrow • Provable OSFI & SOC2 compliance", style = MaterialTheme.typography.bodySmall.copy(color = CyberCyan))
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Search Bar
        PaddingValues(horizontal = 16.dp).let { pv ->
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchChange,
                placeholder = { Text("Search paradox engines (e.g. ZK, Kyber, HotStuff, AML)...", color = TextSecondary) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = CyberCyan) },
                trailingIcon = if (searchQuery.isNotEmpty()) {
                    { IconButton(onClick = { onSearchChange("") }) { Icon(Icons.Default.Clear, contentDescription = null, tint = TextSecondary) } }
                } else null,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(pv)
                    .testTag("search_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = BorderSlate,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = CardBackground,
                    unfocusedContainerColor = CardBackground
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Domain Filter Chips
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(domains) { dom ->
                val isSelected = selectedDomain == dom
                FilterChip(
                    selected = isSelected,
                    onClick = { onDomainSelect(dom) },
                    label = { Text(dom, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal, fontSize = 11.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = CyberCyan,
                        selectedLabelColor = ObsidianNavy,
                        containerColor = RoyalSlate,
                        labelColor = TextPrimary
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected
                    ),
                    shape = RoundedCornerShape(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Product List
        if (filteredProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Architecture, contentDescription = null, tint = BorderSlate, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("No paradox solutions match query.", style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary))
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredProducts, key = { p -> p.id }) { prod ->
                    ProductCardItem(prod, onClick = { onProductClick(prod) })
                }
            }
        }
    }
}

@Composable
fun ProductCardItem(product: Product, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .border(
                width = if (product.isPurchased) 2.dp else 1.dp,
                color = if (product.isPurchased) EmeraldGreen else BorderSlate,
                shape = RoundedCornerShape(14.dp)
            )
            .testTag("product_card_${product.id}"),
        colors = CardDefaults.cardColors(containerColor = CardBackground)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = RoyalSlate, shape = RoundedCornerShape(4.dp)) {
                            Text(product.domain, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall.copy(color = CyberCyan, fontSize = 9.sp, fontWeight = FontWeight.Bold))
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        if (product.isPurchased) {
                            Surface(color = Color(0xFF0D2818), shape = RoundedCornerShape(4.dp)) {
                                Row(modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Verified, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(10.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("PURCHASED • IP UNLOCKED", style = MaterialTheme.typography.labelSmall.copy(color = EmeraldGreen, fontSize = 9.sp, fontWeight = FontWeight.Bold))
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(product.title, style = MaterialTheme.typography.titleMedium.copy(color = TextPrimary, fontWeight = FontWeight.Bold))
                    Text(product.subtitle, style = MaterialTheme.typography.bodySmall.copy(color = RichGold))
                }

                Text(
                    product.priceCad,
                    style = MaterialTheme.typography.titleMedium.copy(color = EmeraldGreen, fontWeight = FontWeight.ExtraBold)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                product.description,
                style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = BorderSlate.copy(alpha = 0.5f))
            Spacer(modifier = Modifier.height(8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = RichGold, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("ZK Hash Verified", style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary, fontSize = 11.sp))
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("View Architecture & Escrow", style = MaterialTheme.typography.labelSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                    Icon(Icons.Default.ArrowForward, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}
