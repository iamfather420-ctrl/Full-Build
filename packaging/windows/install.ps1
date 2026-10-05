$ErrorActionPreference = 'Stop'
$Root = if ($env:AI_OS_INSTALL_DIR) { $env:AI_OS_INSTALL_DIR } else { Join-Path $env:USERPROFILE 'Daisy-AI-OS' }
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$Source = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
robocopy $Source $Root /MIR /XD .git node_modules dist | Out-Null
Push-Location $Root
npm install --omit=dev
$Launcher = Join-Path $Root 'Start-Daisy-AI-OS.cmd'
"@echo off`r`ncd /d `"$Root`"`r`nnpm run aios:server" | Set-Content -Encoding ASCII $Launcher
Start-Process $Launcher
Pop-Location
Write-Host "Daisy AI OS installed at $Root and starting on http://127.0.0.1:8787"
