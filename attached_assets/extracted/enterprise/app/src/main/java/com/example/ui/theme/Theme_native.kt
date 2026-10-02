package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val InstitutionalColorScheme = darkColorScheme(
    primary = CyberCyan,
    onPrimary = ObsidianNavy,
    secondary = RichGold,
    onSecondary = ObsidianNavy,
    tertiary = EmeraldGreen,
    onTertiary = ObsidianNavy,
    background = ObsidianNavy,
    onBackground = TextPrimary,
    surface = RoyalSlate,
    onSurface = TextPrimary,
    surfaceVariant = CardBackground,
    onSurfaceVariant = TextSecondary,
    error = CrimsonAlert,
    onError = TextPrimary,
    outline = BorderSlate
)

@Composable
fun SolvexEnterpriseTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = InstitutionalColorScheme,
        typography = Typography,
        content = content
    )
}
