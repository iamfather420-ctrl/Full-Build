package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun AiCopilotView(
    messages: List<ChatMessage>,
    isLoading: Boolean,
    onSendPrompt: (String) -> Unit
) {
    var prompt by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().background(ObsidianNavy)) {
        // Banner
        Surface(
            color = RoyalSlate,
            modifier = Modifier.fillMaxWidth(),
            border = androidx.compose.foundation.BorderStroke(1.dp, CyberCyan)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.SupportAgent, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("AI DUE DILIGENCE AUDIT COPILOT", style = MaterialTheme.typography.titleSmall.copy(color = CyberCyan, fontWeight = FontWeight.Bold))
                    Text("Calibrated to conservative Canadian bank risk standards (OSFI B-13)", style = MaterialTheme.typography.labelSmall.copy(color = TextPrimary))
                }
            }
        }

        // Messages List
        LazyColumn(
            modifier = Modifier.weight(1f).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            items(messages, key = { it.id }) { msg ->
                val isUser = msg.sender == "USER"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth(0.85f),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isUser) CyberCyan else CardBackground
                        ),
                        shape = RoundedCornerShape(
                            topStart = 14.dp,
                            topEnd = 14.dp,
                            bottomStart = if (isUser) 14.dp else 2.dp,
                            bottomEnd = if (isUser) 2.dp else 14.dp
                        ),
                        border = if (!isUser) androidx.compose.foundation.BorderStroke(1.dp, BorderSlate) else null
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = if (isUser) "BANK DUE DILIGENCE ANALYST" else "SOLVEX ENTERPRISE ARCHITECT",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = if (isUser) ObsidianNavy else RichGold,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = msg.text,
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = if (isUser) ObsidianNavy else TextPrimary,
                                    lineHeight = 20.sp
                                )
                            )
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
                        Surface(color = CardBackground, shape = RoundedCornerShape(12.dp), modifier = Modifier.padding(8.dp)) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = CyberCyan, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(10.dp))
                                Text("Auditing OSFI & SOC2 compliance specs...", style = MaterialTheme.typography.labelSmall.copy(color = CyberCyan))
                            }
                        }
                    }
                }
            }
        }

        // Prompt Input
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardBackground)
                .border(1.dp, BorderSlate)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = prompt,
                onValueChange = { prompt = it },
                placeholder = { Text("Ask about data residency, ZK escrow, RTO/RPO...", color = TextSecondary, fontSize = 12.sp) },
                modifier = Modifier.weight(1f).testTag("copilot_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = CyberCyan,
                    unfocusedBorderColor = BorderSlate,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(20.dp),
                maxLines = 3
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = {
                    if (prompt.isNotBlank()) {
                        onSendPrompt(prompt)
                        prompt = ""
                    }
                },
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(CyberCyan)
                    .testTag("send_copilot_button")
            ) {
                Icon(Icons.Default.Send, contentDescription = "Send", tint = ObsidianNavy)
            }
        }
    }
}
