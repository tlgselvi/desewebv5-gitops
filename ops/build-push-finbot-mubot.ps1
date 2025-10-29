# ===============================================
# FinBot & MuBot Build & Push Script
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🐳 FinBot & MuBot Docker Build & Push`n" -ForegroundColor Cyan

# Dizin kontrolü
$finbotDir = if (Test-Path ".\finbot") { ".\finbot" } elseif (Test-Path ".\deploy\finbot-v2") { ".\deploy\finbot-v2" } else { $null }
$mubotDir = if (Test-Path ".\mubot") { ".\mubot" } elseif (Test-Path ".\deploy\mubot-v2") { ".\deploy\mubot-v2" } else { $null }

if (-not $finbotDir) {
    Write-Host "❌ FinBot dizini bulunamadı (.finbot veya .deployfinbot-v2)" -ForegroundColor Red
    Write-Host "📁 Mevcut dizinler:" -ForegroundColor Yellow
    Get-ChildItem -Directory | Where-Object { $_.Name -like "*finbot*" } | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Gray }
    Write-Host "`n⚠️  Build işlemi atlanıyor. Dizin oluşturun veya mevcut dizini kullanın.`n" -ForegroundColor Yellow
    exit 1
}

if (-not $mubotDir) {
    Write-Host "❌ MuBot dizini bulunamadı (.mubot veya .deploymubot-v2)" -ForegroundColor Red
    Write-Host "📁 Mevcut dizinler:" -ForegroundColor Yellow
    Get-ChildChildItem -Directory | Where-Object { $_.Name -like "*mubot*" } | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor Gray }
    Write-Host "`n⚠️  Build işlemi atlanıyor. Dizin oluşturun veya mevcut dizini kullanın.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "📂 Dizinler tespit edildi:" -ForegroundColor Green
Write-Host "   FinBot: $finbotDir" -ForegroundColor White
Write-Host "   MuBot: $mubotDir`n" -ForegroundColor White

# Docker login kontrolü
Write-Host "=== 1. Docker Login Kontrolü ===" -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker çalışıyor" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker çalışmıyor veya erişilemiyor" -ForegroundColor Red
    exit 1
}

# GitHub Container Registry login (opsiyonel)
Write-Host "`n💡 GitHub Container Registry login gerekebilir:" -ForegroundColor Yellow
Write-Host "   echo $GH_TOKEN | docker login ghcr.io -u USERNAME --password-stdin" -ForegroundColor Gray
Write-Host ""

# FinBot Build
Write-Host "=== 2. FinBot Build ===" -ForegroundColor Yellow
Write-Host "Building: ghcr.io/cptsystems/finbot:latest from $finbotDir`n" -ForegroundColor Cyan
docker build -t ghcr.io/cptsystems/finbot:latest $finbotDir 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ FinBot build başarılı" -ForegroundColor Green
} else {
    Write-Host "`n❌ FinBot build başarısız" -ForegroundColor Red
    Write-Host "   Dockerfile eksik olabilir veya build hatası var`n" -ForegroundColor Yellow
}

Write-Host ""

# MuBot Build
Write-Host "=== 3. MuBot Build ===" -ForegroundColor Yellow
Write-Host "Building: ghcr.io/cptsystems/mubot:latest from $mubotDir`n" -ForegroundColor Cyan
docker build -t ghcr.io/cptsystems/mubot:latest $mubotDir 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ MuBot build başarılı" -ForegroundColor Green
} else {
    Write-Host "`n❌ MuBot build başarısız" -ForegroundColor Red
    Write-Host "   Dockerfile eksik olabilir veya build hatası var`n" -ForegroundColor Yellow
}

Write-Host ""

# Push işlemleri
Write-Host "=== 4. Image Push ===" -ForegroundColor Yellow

if (Get-Image ghcr.io/cptsystems/finbot:latest -ErrorAction SilentlyContinue) {
    Write-Host "Pushing: ghcr.io/cptsystems/finbot:latest`n" -ForegroundColor Cyan
    docker push ghcr.io/cptsystems/finbot:latest 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ FinBot push başarılı" -ForegroundColor Green
    } else {
        Write-Host "`n❌ FinBot push başarısız (login gerekebilir)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  FinBot image bulunamadı, push atlanıyor" -ForegroundColor Yellow
}

Write-Host ""

if (Get-Image ghcr.io/cptsystems/mubot:latest -ErrorAction SilentlyContinue) {
    Write-Host "Pushing: ghcr.io/cptsystems/mubot:latest`n" -ForegroundColor Cyan
    docker push ghcr.io/cptsystems/mubot:latest 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ MuBot push başarılı" -ForegroundColor Green
    } else {
        Write-Host "`n❌ MuBot push başarısız (login gerekebilir)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  MuBot image bulunamadı, push atlanıyor" -ForegroundColor Yellow
}

Write-Host ""

# Deployment update
Write-Host "=== 5. Kubernetes Deployment Update ===" -ForegroundColor Yellow

Write-Host "FinBot deployment güncelleniyor..." -ForegroundColor Cyan
kubectl set image deployment/finbot finbot=ghcr.io/cptsystems/finbot:latest -n aiops 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ FinBot deployment güncellendi" -ForegroundColor Green
} else {
    Write-Host "⚠️  FinBot deployment güncellenemedi (deployment bulunamadı)" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "MuBot deployment güncelleniyor..." -ForegroundColor Cyan
kubectl set image deployment/mubot mubot=ghcr.io/cptsystems/mubot:latest -n aiops 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MuBot deployment güncellendi" -ForegroundColor Green
} else {
    Write-Host "⚠️  MuBot deployment güncellenemedi (deployment bulunamadı)" -ForegroundColor Yellow
}

Write-Host ""

# Pod durumu
Write-Host "=== 6. Pod Durumu ===" -ForegroundColor Yellow
Start-Sleep -Seconds 5
kubectl get pods -n aiops | Select-String "finbot|mubot"

Write-Host "`n✅ Build & Push işlemi tamamlandı!`n" -ForegroundColor Green

Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "   • Pod'ların Running olduğunu kontrol: kubectl get pods -n aiops" -ForegroundColor White
Write-Host "   • Logları kontrol: kubectl logs -f <pod-name> -n aiops" -ForegroundColor White
Write-Host "   • Prometheus'da metrics: up{namespace=\"aiops\"}" -ForegroundColor White
Write-Host ""

