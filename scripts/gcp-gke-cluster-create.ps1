# Google Kubernetes Engine (GKE) Cluster Oluşturma Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 2
# Tarih: 2025-01-27
# Kullanım: .\scripts\gcp-gke-cluster-create.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Google Kubernetes Engine (GKE) Cluster Oluşturma" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Proje kontrolü
$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject) {
    Write-Host "❌ Hata: Google Cloud proje ID'si bulunamadı!" -ForegroundColor Red
    Write-Host "   Lütfen 'gcloud config set project ea-plan-seo-project' komutunu çalıştırın." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Proje ID: $currentProject" -ForegroundColor Green
Write-Host ""

# GKE API aktifleştirme
Write-Host "📦 GKE API aktifleştiriliyor..." -ForegroundColor Yellow
gcloud services enable container.googleapis.com

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hata: GKE API aktifleştirilemedi!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ GKE API aktif edildi" -ForegroundColor Green
Write-Host ""

# Cluster oluşturma
Write-Host "📦 Cluster oluşturuluyor..." -ForegroundColor Yellow
Write-Host "   Bu işlem 5-15 dakika sürebilir..." -ForegroundColor Gray
Write-Host ""

# Not: Quota kontrolü yapılmalı
# Eğer quota yetersizse, e2-medium yerine e2-small veya node sayısı azaltılabilir
try {
    gcloud container clusters create dese-ea-plan-cluster `
      --region=europe-west3 `
      --num-nodes=2 `
      --machine-type=e2-medium `
      --release-channel=regular `
      --disk-size=100

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Cluster başarıyla oluşturuldu!" -ForegroundColor Green
        Write-Host ""
        
        # Cluster bilgilerini göster
        Write-Host "📋 Cluster Bilgileri:" -ForegroundColor Yellow
        gcloud container clusters describe dese-ea-plan-cluster `
          --region=europe-west3 `
          --format="table(name,location,machineType,currentNodeCount,status,currentMasterVersion)"
        
        Write-Host ""
        Write-Host "📝 Sonraki Adımlar:" -ForegroundColor Yellow
        Write-Host "1. kubectl context'i ayarlayın:" -ForegroundColor White
        Write-Host "   gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Cluster durumunu kontrol edin:" -ForegroundColor White
        Write-Host "   kubectl get nodes" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Cluster'ı kullanmaya başlayın!" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Cluster oluşturma başarısız!" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 İpucu: Quota sorunu varsa:" -ForegroundColor Yellow
        Write-Host "   - Machine type'ı e2-small yapın" -ForegroundColor White
        Write-Host "   - Node sayısını 1'e düşürün" -ForegroundColor White
        Write-Host "   - Disk size'ı azaltın (--disk-size=50)" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 İpucu: Quota sorunu varsa:" -ForegroundColor Yellow
    Write-Host "   - Machine type'ı e2-small yapın" -ForegroundColor White
    Write-Host "   - Node sayısını 1'e düşürün" -ForegroundColor White
    Write-Host "   - Disk size'ı azaltın (--disk-size=50)" -ForegroundColor White
    Write-Host ""
    exit 1
}

