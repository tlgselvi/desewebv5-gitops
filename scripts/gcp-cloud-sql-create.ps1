# Google Cloud SQL PostgreSQL Instance Oluşturma Scripti (PowerShell)
# Dese EA Plan v6.8.0 - Cloud Migration Faz 1
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 Google Cloud SQL PostgreSQL Instance Oluşturma" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Proje ID kontrolü ve ayarlama
$projectId = $env:GCP_PROJECT_ID
if (-not $projectId) {
    $currentProject = gcloud config get-value project 2>$null
    if (-not $currentProject) {
        Write-Host "⚠️  Google Cloud proje ID'si bulunamadı!" -ForegroundColor Yellow
        Write-Host "📝 Lütfen önce Google Cloud projenizi ayarlayın:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   gcloud config set project [PROJE_ID_BURAYA]" -ForegroundColor Cyan
        Write-Host ""
        $projectId = Read-Host "Proje ID'nizi girin"
        if ($projectId) {
            Write-Host "📌 Proje ayarlanıyor: $projectId" -ForegroundColor Yellow
            gcloud config set project $projectId
        } else {
            Write-Host "❌ Hata: Proje ID gerekli!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ Mevcut proje kullanılıyor: $currentProject" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Proje ID: $projectId" -ForegroundColor Green
}

# Instance oluşturma komutu
Write-Host ""
Write-Host "📦 Instance oluşturuluyor..." -ForegroundColor Yellow
Write-Host ""

$password = "<GUVENLI_BIR_SIFRE_YAZIN>"

gcloud sql instances create dese-ea-plan-db `
  --database-version=POSTGRES_15 `
  --region=europe-west3 `
  --tier=db-g1-small `
  --root-password="$password" `
  --storage-type=SSD `
  --storage-size=20GB `
  --storage-auto-increase `
  --backup-start-time=03:00 `
  --enable-bin-log `
  --maintenance-window-day=SUN `
  --maintenance-window-hour=4 `
  --maintenance-release-channel=production `
  --deletion-protection `
  --labels=project=dese-ea-plan,version=v6.8.0,environment=production

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Instance başarıyla oluşturuldu!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Yellow
    Write-Host "1. Instance durumunu kontrol edin:" -ForegroundColor White
    Write-Host "   gcloud sql instances describe dese-ea-plan-db" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Connection string'i alın:" -ForegroundColor White
    Write-Host "   gcloud sql instances describe dese-ea-plan-db --format='value(connectionName)'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. IP adresini alın:" -ForegroundColor White
    Write-Host "   gcloud sql instances describe dese-ea-plan-db --format='value(ipAddresses[0].ipAddress)'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Veritabanı oluşturun (opsiyonel):" -ForegroundColor White
    Write-Host "   gcloud sql databases create dese_db --instance=dese-ea-plan-db" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. Environment variable'ı güncelleyin:" -ForegroundColor White
    Write-Host "   DATABASE_URL=postgresql://postgres:$password@<IP_ADRESI>:5432/dese_db" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Instance oluşturma başarısız!" -ForegroundColor Red
    exit 1
}

