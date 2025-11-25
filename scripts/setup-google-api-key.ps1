# Google Cloud API Key Kurulum Scripti
# DESE EA Plan v7.0

$ErrorActionPreference = "Stop"

Write-Host "🔑 Google Cloud API Key Kurulumu" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "API Key'i almak için:" -ForegroundColor Cyan
Write-Host "1. https://console.cloud.google.com/apis/credentials?project=ea-plan-seo-project" -ForegroundColor White
Write-Host "2. 'Create Credentials' > 'API Key' seçin" -ForegroundColor White
Write-Host "3. API Key'i kopyalayın" -ForegroundColor White
Write-Host ""

$apiKey = Read-Host "API Key'ini buraya yapıştırın"

if (-not $apiKey -or $apiKey.Trim() -eq "") {
    Write-Host "❌ API Key girilmedi!" -ForegroundColor Red
    exit 1
}

$apiKey = $apiKey.Trim()

# .env dosyasını güncelle
$envFile = ".env"
$envExample = "env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "✅ .env dosyası oluşturuldu (env.example'dan)" -ForegroundColor Green
    } else {
        New-Item -ItemType File -Path $envFile | Out-Null
        Write-Host "✅ .env dosyası oluşturuldu" -ForegroundColor Green
    }
}

# .env dosyasını oku
$envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
if (-not $envContent) {
    $envContent = ""
}

# GOOGLE_CLOUD_API_KEY ekle/güncelle
if ($envContent -match "GOOGLE_CLOUD_API_KEY=") {
    $envContent = $envContent -replace "GOOGLE_CLOUD_API_KEY=.*", "GOOGLE_CLOUD_API_KEY=$apiKey"
    Write-Host "✅ GOOGLE_CLOUD_API_KEY güncellendi" -ForegroundColor Green
} else {
    # GenAI bölümüne ekle
    if ($envContent -match "GENAI_APP_BUILDER_ENABLED") {
        $envContent = $envContent -replace "(GENAI_APP_BUILDER_ENABLED=.*)", "`$1`nGOOGLE_CLOUD_API_KEY=$apiKey"
    } else {
        $envContent += "`n# Google Cloud API Key`nGOOGLE_CLOUD_API_KEY=$apiKey`n"
    }
    Write-Host "✅ GOOGLE_CLOUD_API_KEY eklendi" -ForegroundColor Green
}

# Dosyayı kaydet
Set-Content -Path $envFile -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ API Key başarıyla eklendi!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "   Python test: python scripts/genai-test.py" -ForegroundColor White
Write-Host "   veya" -ForegroundColor Gray
Write-Host "   PowerShell: `$env:GOOGLE_CLOUD_API_KEY='$apiKey'" -ForegroundColor White
Write-Host ""

