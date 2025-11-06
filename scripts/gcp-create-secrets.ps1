# Kubernetes Secrets Oluşturma Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 4
# Tarih: 2025-01-27
# Kullanım: .\scripts\gcp-create-secrets.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔐 Kubernetes Secrets Oluşturma" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# kubectl bağlantısını kontrol et
try {
    $null = kubectl cluster-info 2>&1
} catch {
    Write-Host "❌ Hata: kubectl cluster'a bağlanamıyor!" -ForegroundColor Red
    Write-Host "   Lütfen 'gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3' komutunu çalıştırın." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ kubectl cluster'a bağlı" -ForegroundColor Green
Write-Host ""

# 1. Database Secret Oluşturma
Write-Host "📦 Database Secret oluşturuluyor..." -ForegroundColor Yellow
$dbSecretExists = kubectl get secret dese-db-secret 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Secret 'dese-db-secret' zaten mevcut, siliniyor..." -ForegroundColor Yellow
    kubectl delete secret dese-db-secret
}

kubectl create secret generic dese-db-secret `
  --from-literal=DATABASE_URL="postgresql://postgres:GüvenliŞifre123!@34.159.32.249:5432/dese_db"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database Secret 'dese-db-secret' oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: Database Secret oluşturulamadı!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Redis Secret Oluşturma
Write-Host "📦 Redis Secret oluşturuluyor..." -ForegroundColor Yellow
$redisSecretExists = kubectl get secret dese-redis-secret 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Secret 'dese-redis-secret' zaten mevcut, siliniyor..." -ForegroundColor Yellow
    kubectl delete secret dese-redis-secret
}

kubectl create secret generic dese-redis-secret `
  --from-literal=REDIS_URL="redis://10.146.144.75:6379"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis Secret 'dese-redis-secret' oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: Redis Secret oluşturulamadı!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Secret'ları Listele
Write-Host "📋 Oluşturulan Secrets:" -ForegroundColor Yellow
kubectl get secrets | Select-String -Pattern "dese-db-secret|dese-redis-secret"

Write-Host ""
Write-Host "✅ Tüm Secrets başarıyla oluşturuldu!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Kullanım:" -ForegroundColor Yellow
Write-Host "   Secret'ları Deployment'larınızda kullanmak için:" -ForegroundColor White
Write-Host ""
Write-Host "   env:" -ForegroundColor Cyan
Write-Host "     - name: DATABASE_URL" -ForegroundColor White
Write-Host "       valueFrom:" -ForegroundColor White
Write-Host "         secretKeyRef:" -ForegroundColor White
Write-Host "           name: dese-db-secret" -ForegroundColor White
Write-Host "           key: DATABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "   env:" -ForegroundColor Cyan
Write-Host "     - name: REDIS_URL" -ForegroundColor White
Write-Host "       valueFrom:" -ForegroundColor White
Write-Host "         secretKeyRef:" -ForegroundColor White
Write-Host "           name: dese-redis-secret" -ForegroundColor White
Write-Host "           key: REDIS_URL" -ForegroundColor White
Write-Host ""

