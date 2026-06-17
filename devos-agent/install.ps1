# DevOS Local Agent Installation Script (Windows)
$ErrorActionPreference = "Stop"

$AgentDir = "$HOME\.devos-agent"
if (!(Test-Path $AgentDir)) {
    New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
}

$CertsDir = "$AgentDir\certs"
if (!(Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Force -Path $CertsDir | Out-Null
}

Write-Host "📥 Downloading DevOS Agent components..." -ForegroundColor Cyan

$baseUrl = "https://raw.githubusercontent.com/CoderKavyaG/wakeup/main/devos-agent"

Invoke-WebRequest -Uri "$baseUrl/index.js" -OutFile "$AgentDir\index.js" -UseBasicParsing
Invoke-WebRequest -Uri "$baseUrl/picker.ps1" -OutFile "$AgentDir\picker.ps1" -UseBasicParsing
Invoke-WebRequest -Uri "$baseUrl/certs/local.key" -OutFile "$CertsDir\local.key" -UseBasicParsing
Invoke-WebRequest -Uri "$baseUrl/certs/local.crt" -OutFile "$CertsDir\local.crt" -UseBasicParsing

# Create package.json
$packageJson = @{
    name = "devos-agent"
    version = "1.0.0"
    main = "index.js"
    dependencies = @{
        express = "^4.19.2"
        cors = "^2.8.5"
        ws = "^8.17.0"
    }
} | ConvertTo-Json

Set-Content -Path "$AgentDir\package.json" -Value $packageJson

Write-Host "📦 Installing dependencies (express, cors, ws)..." -ForegroundColor Cyan
Push-Location $AgentDir
npm install --no-audit --no-fund
Pop-Location

Write-Host "⚡ Starting DevOS secure loopback agent..." -ForegroundColor Green
node "$AgentDir\index.js"
