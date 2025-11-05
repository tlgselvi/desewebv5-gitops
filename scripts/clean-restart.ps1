#!/usr/bin/env pwsh
# =========================================================
# DESE EA Plan v6.7.0 - Clean Restart Script
# =========================================================
# Amaç: Temiz bir sistem yeniden başlatması yapmak
# Kullanım: pwsh scripts/clean-restart.ps1

Write-Host "`n🔄 DESE EA Plan v6.7.0 - Clean Restart" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# =========================================================
# ADIM 1: Docker Container'ları Başlat
# =========================================================
Write-Host "[1/4] Docker container'larını başlatıyorum..." -ForegroundColor Yellow

$dockerComposePath = "docker-compose.yml"
if (Test-Path $dockerComposePath) {
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker container'ları başlatıldı" -ForegroundColor Green
    } else {
        Write-Host "⚠️  docker-compose başlatılamadı, manuel kontrol yapılıyor..." -ForegroundColor Yellow
        docker start desewebv5-postgres-1 desewebv5-redis-1 2>$null
    }
} else {
    Write-Host "⚠️  docker-compose.yml bulunamadı" -ForegroundColor Yellow
    docker start desewebv5-postgres-1 desewebv5-redis-1 2>$null
}

Start-Sleep -Seconds 3

# =========================================================
# ADIM 2: Container Durumunu Kontrol Et
# =========================================================
Write-Host "`n[2/4] Container durumunu kontrol ediyorum..." -ForegroundColor Yellow

$postgres = docker ps --filter "name=postgres" --format "{{.Status}}" 2>$null
$redis = docker ps --filter "name=redis" --format "{{.Status}}" 2>$null

if ($postgres) {
    Write-Host "✅ PostgreSQL: $postgres" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL çalışmıyor" -ForegroundColor Red
}

if ($redis) {
    Write-Host "✅ Redis: $redis" -ForegroundColor Green
} else {
    Write-Host "❌ Redis çalışmıyor" -ForegroundColor Red
}

# =========================================================
# ADIM 3: Cursor Özelliklerini Doğrula
# =========================================================
Write-Host "`n[3/4] Cursor özelliklerini doğruluyorum..." -ForegroundColor Yellow

$cursorFeatures = @{
    "Protocol v1.2" = Test-Path ".cursor/upgrade-protocol-v1.2.yaml"
    "Rules Directory" = (Test-Path ".cursor/rules") -and ((Get-ChildItem .cursor/rules/*.md -ErrorAction SilentlyContinue).Count -gt 0)
    "Memory Files" = (Test-Path ".cursor/memory") -and ((Get-ChildItem .cursor/memory/*.json -ErrorAction SilentlyContinue).Count -gt 0)
    "Activate.md" = Test-Path ".cursor/ACTIVATE.md"
    "Context.json" = Test-Path ".cursor/context.json"
}

foreach ($feature in $cursorFeatures.GetEnumerator()) {
    if ($feature.Value) {
        Write-Host "✅ $($feature.Key)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($feature.Key)" -ForegroundColor Red
    }
}

# =========================================================
# ADIM 4: Sistem Durumu Özeti
# =========================================================
Write-Host "`n[4/4] Sistem durumu özeti:" -ForegroundColor Yellow

$packageJson = Get-Content "package.json" -ErrorAction SilentlyContinue | ConvertFrom-Json
if ($packageJson) {
    Write-Host "✅ Proje: $($packageJson.name) v$($packageJson.version)" -ForegroundColor Green
}

$gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
if ($gitBranch) {
    Write-Host "✅ Git Branch: $gitBranch" -ForegroundColor Green
}

# =========================================================
# SONUÇ
# =========================================================
Write-Host "`n✅ Clean Restart tamamlandı!" -ForegroundColor Green
Write-Host "`n📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "   1. Backend'i başlat: pnpm dev (backend klasöründe)" -ForegroundColor White
Write-Host "   2. Frontend'i başlat: pnpm dev (frontend klasöründe)" -ForegroundColor White
Write-Host "   3. Sistem durumunu kontrol et: pnpm health:check" -ForegroundColor White
Write-Host "`n"
