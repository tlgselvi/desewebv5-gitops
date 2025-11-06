# NGINX Ingress Controller Kurulum Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 3
# Tarih: 2025-01-27
# Kullanım: .\scripts\gcp-nginx-ingress-install.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 NGINX Ingress Controller Kurulumu" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
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

# Helm kontrolü
if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Hata: Helm yüklü değil!" -ForegroundColor Red
    Write-Host "   Lütfen Helm 3.10+ yükleyin." -ForegroundColor Yellow
    exit 1
}

$helmVersion = helm version --short 2>$null
Write-Host "✅ Helm yüklü: $helmVersion" -ForegroundColor Green
Write-Host ""

# 1. Helm repo ekleme
Write-Host "📦 Helm repo ekleniyor..." -ForegroundColor Yellow
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hata: Helm repo eklenemedi!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ingress-nginx repo eklendi" -ForegroundColor Green
Write-Host ""

# 2. Helm repo güncelleme
Write-Host "📦 Helm repo güncelleniyor..." -ForegroundColor Yellow
helm repo update

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hata: Helm repo güncellenemedi!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Helm repo güncellendi" -ForegroundColor Green
Write-Host ""

# 3. Namespace oluşturma
Write-Host "📦 Namespace oluşturuluyor..." -ForegroundColor Yellow
$namespaceExists = kubectl get namespace ingress-nginx 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Namespace 'ingress-nginx' zaten mevcut, atlanıyor..." -ForegroundColor Yellow
} else {
    kubectl create namespace ingress-nginx
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Hata: Namespace oluşturulamadı!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Namespace 'ingress-nginx' oluşturuldu" -ForegroundColor Green
}

Write-Host ""

# 4. NGINX Ingress Controller kurulumu
Write-Host "📦 NGINX Ingress Controller kuruluyor..." -ForegroundColor Yellow
Write-Host "   Bu işlem 1-2 dakika sürebilir..." -ForegroundColor Gray
Write-Host ""

try {
    helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ NGINX Ingress Controller başarıyla kuruldu!" -ForegroundColor Green
        Write-Host ""
        
        # Pod durumunu kontrol et
        Write-Host "📋 Pod Durumu:" -ForegroundColor Yellow
        kubectl get pods -n ingress-nginx
        
        Write-Host ""
        Write-Host "📋 Service Durumu:" -ForegroundColor Yellow
        kubectl get svc -n ingress-nginx
        
        Write-Host ""
        Write-Host "📋 IngressClass Durumu:" -ForegroundColor Yellow
        kubectl get ingressclass
        
        Write-Host ""
        Write-Host "📝 Sonraki Adımlar:" -ForegroundColor Yellow
        Write-Host "1. LoadBalancer External IP'yi alın (birkaç dakika sürebilir):" -ForegroundColor White
        Write-Host "   kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Ingress resource'larınızı oluşturun (örnek: docs/GCP_MIGRATION_FAZ3_INGRESS.md)" -ForegroundColor White
        Write-Host ""
        Write-Host "3. DNS kayıtlarınızı External IP'ye yönlendirin" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Not: LoadBalancer External IP atanması 2-5 dakika sürebilir." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ NGINX Ingress Controller kurulumu başarısız!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

