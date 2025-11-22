# Backend Production Mod Başlatma Script
# NODE_ENV=production ile backend'i başlatır

param(
    [string]$Port = "3000",
    [switch]$SkipNext = $true
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Backend Production Mod Başlatma ===" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "SKIP_NEXT: $SkipNext`n" -ForegroundColor Yellow

# Environment variables set et
$env:NODE_ENV = "production"
$env:PORT = $Port
$env:SKIP_NEXT = if ($SkipNext) { "true" } else { "false" }

# DISABLE_RATE_LIMIT'i unset et (production'da rate limit aktif olmalı)
if ($env:DISABLE_RATE_LIMIT) {
    Remove-Item Env:\DISABLE_RATE_LIMIT
    Write-Host "✅ DISABLE_RATE_LIMIT kaldırıldı" -ForegroundColor Green
}

Write-Host "`nEnvironment Variables:" -ForegroundColor Cyan
Write-Host "  NODE_ENV=$env:NODE_ENV" -ForegroundColor White
Write-Host "  PORT=$env:PORT" -ForegroundColor White
Write-Host "  SKIP_NEXT=$env:SKIP_NEXT" -ForegroundColor White

Write-Host "`n🚀 Backend başlatılıyor (production mod)...`n" -ForegroundColor Green

# Backend'i başlat
try {
    pnpm dev
} catch {
    Write-Host "`n❌ Backend başlatma hatası: $_" -ForegroundColor Red
    exit 1
}

