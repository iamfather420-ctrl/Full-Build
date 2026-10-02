package com.example.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.*

@Composable
fun LoginScreen(
    onLogin: (username: String, role: String, institution: String) -> Unit
) {
    var customUser by remember { mutableStateOf("Analyst_J_Miller") }
    var customInstitution by remember { mutableStateOf("Royal Canadian Bank (RBC/TD Tier-1)") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(ObsidianNavy, RoyalSlate, ObsidianNavy)
                )
            )
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.Center)
                .clip(RoundedCornerShape(20.dp))
                .background(CardBackground)
                .border(1.dp, Brush.horizontalGradient(listOf(RichGold, CyberCyan)), RoundedCornerShape(20.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Emblem Header
            Icon(
                imageVector = Icons.Default.Security,
                contentDescription = "Solvex Emblem",
                tint = RichGold,
                modifier = Modifier.size(56.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "SOLVEX ENTERPRISE",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = TextPrimary
                )
            )

            Text(
                text = "B2B Software Marketplace & Paradox Solutions",
                style = MaterialTheme.typography.bodyMedium.copy(color = CyberCyan),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Surface(
                color = ObsidianNavy,
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldGreen)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = EmeraldGreen, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("SOC2 Type 2 • OSFI B-13 • Canadian Data Residency", style = MaterialTheme.typography.labelSmall.copy(color = EmeraldGreen))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = customUser,
                onValueChange = { customUser = it },
                label = { Text("Signatory Principal / Username") },
                modifier = Modifier.fillMaxWidth().testTag("username_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = BorderSlate,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = customInstitution,
                onValueChange = { customInstitution = it },
                label = { Text("Institutional Entity / Bank") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = BorderSlate,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(28.dp))

            Text("SELECT ENTERPRISE ACCESS TIER", style = MaterialTheme.typography.labelMedium.copy(color = TextSecondary, letterSpacing = 1.sp))
            Spacer(modifier = Modifier.height(12.dp))

            // Button 1: Client Flow
            Button(
                onClick = { onLogin(customUser.ifBlank { "Bank_Analyst" }, "CLIENT_BUYER", customInstitution.ifBlank { "Tier-1 Bank" }) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .testTag("client_login_button"),
                colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = ObsidianNavy),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.AccountBalance, contentDescription = null)
                Spacer(modifier = Modifier.width(10.dp))
                Column(horizontalAlignment = Alignment.Start) {
                    Text("CLIENT PORTAL (BUYER FLOW)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Browse 29 Engines & Execute Escrow", fontSize = 10.sp, fontWeight = FontWeight.Normal)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Button 2: Admin ME Flow
            Button(
                onClick = { onLogin("Solvex_Master_Admin", "ME_ADMIN", "Solvex Clearinghouse Corp") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .testTag("admin_login_button"),
                colors = ButtonDefaults.buttonColors(containerColor = RichGold, contentColor = ObsidianNavy),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.AdminPanelSettings, contentDescription = null)
                Spacer(modifier = Modifier.width(10.dp))
                Column(horizontalAlignment = Alignment.Start) {
                    Text("ADMIN DASHBOARD (\"ME\")", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Vendor Governance & SOC2 Audit Logs", fontSize = 10.sp, fontWeight = FontWeight.Normal)
                }
            }
        }
    }
}
