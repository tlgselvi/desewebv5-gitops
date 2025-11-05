# Google Cloud SQL PostgreSQL Instance Oluşturma Scripti (Hazır - Şifre ile)
# Dese EA Plan v6.8.0 - Cloud Migration Faz 1
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 Google Cloud SQL PostgreSQL Instance Oluşturma" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Proje kontrolü
$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject) {
    Write-Host "❌ Hata: Google Cloud proje ID'si bulunamadı!" -ForegroundColor Red
    Write-Host "   Lütfen 'gcloud config set project [PROJE_ID_BURAYA]' komutunu çalıştırın." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Proje ID: $currentProject" -ForegroundColor Green

# Şifre güvenliği
Write-Host ""
Write-Host "⚠️  ŞİFRE GÜVENLİĞİ:" -ForegroundColor Yellow
Write-Host "   Lütfen güçlü bir şifre belirleyin:" -ForegroundColor White
Write-Host "   - Minimum 12 karakter" -ForegroundColor Gray
Write-Host "   - Büyük harf, küçük harf, rakam ve özel karakter içermeli" -ForegroundColor Gray
Write-Host ""
$password = Read-Host "   Root şifresini girin" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($plainPassword) -or $plainPassword.Length -lt 12) {
    Write-Host "❌ Hata: Şifre minimum 12 karakter olmalı!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Instance oluşturuluyor..." -ForegroundColor Yellow
Write-Host "   Bu işlem 5-10 dakika sürebilir..." -ForegroundColor Gray
Write-Host ""

try {
    gcloud sql instances create dese-ea-plan-db `
      --database-version=POSTGRES_15 `
      --region=europe-west3 `
      --tier=db-g1-small `
      --root-password="$plainPassword" `
      --storage-type=SSD `
      --storage-size=20GB `
      --storage-auto-increase `
      --backup-start-time=03:00 `
      --maintenance-window-day=SUN `
      --maintenance-window-hour=4 `
      --maintenance-release-channel=production `
      --deletion-protection

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Instance başarıyla oluşturuldu!" -ForegroundColor Green
        Write-Host ""
        
        # Instance bilgilerini al
        Write-Host "📋 Instance Bilgileri:" -ForegroundColor Yellow
        $connectionName = gcloud sql instances describe dese-ea-plan-db --format='value(connectionName)' 2>$null
        $ipAddress = gcloud sql instances describe dese-ea-plan-db --format='value(ipAddresses[0].ipAddress)' 2>$null
        $state = gcloud sql instances describe dese-ea-plan-db --format='value(state)' 2>$null
        
        Write-Host "   Connection Name: $connectionName" -ForegroundColor White
        Write-Host "   IP Address: $ipAddress" -ForegroundColor White
        Write-Host "   State: $state" -ForegroundColor White
        Write-Host ""
        
        Write-Host "📝 Sonraki Adımlar:" -ForegroundColor Yellow
        Write-Host "1. Veritabanı oluşturun:" -ForegroundColor White
        Write-Host "   gcloud sql databases create dese_db --instance=dese-ea-plan-db" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Environment variable'ı güncelleyin:" -ForegroundColor White
        Write-Host "   DATABASE_URL=postgresql://postgres:[ŞIFRE]@$ipAddress:5432/dese_db" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Connection test edin:" -ForegroundColor White
        Write-Host "   psql `"postgresql://postgres:[ŞIFRE]@$ipAddress:5432/dese_db`"" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Şifrenizi güvenli bir yerde saklayın!" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Instance oluşturma başarısız!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

