# Google Cloud Credentials Kontrol Script
# Bu script gcp-credentials.json dosyasının varlığını kontrol eder

Write-Host "🔍 Google Cloud Credentials Kontrolü" -ForegroundColor Cyan
Write-Host ""

$credentialsFile = "gcp-credentials.json"
$envFile = ".env"

# 1. gcp-credentials.json kontrolü
if (Test-Path $credentialsFile) {
    Write-Host "✅ $credentialsFile bulundu" -ForegroundColor Green
    
    # Dosya içeriğini kontrol et
    try {
        $jsonContent = Get-Content $credentialsFile | ConvertFrom-Json
        Write-Host "   - Project ID: $($jsonContent.project_id)" -ForegroundColor Gray
        Write-Host "   - Client Email: $($jsonContent.client_email)" -ForegroundColor Gray
        Write-Host "   - Type: $($jsonContent.type)" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  JSON dosyası geçersiz format" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ $credentialsFile bulunamadı!" -ForegroundColor Red
    Write-Host "   📝 Lütfen Google Cloud Console'dan Service Account JSON key indirin" -ForegroundColor Yellow
    Write-Host "   📚 Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md" -ForegroundColor Yellow
}

Write-Host ""

# 2. .env dosyası kontrolü
if (Test-Path $envFile) {
    Write-Host "✅ $envFile bulundu" -ForegroundColor Green
    
    # Google Cloud environment variable'larını kontrol et
    $envContent = Get-Content $envFile
    $requiredVars = @(
        "GSC_PROJECT_ID",
        "GSC_CLIENT_EMAIL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        $found = $false
        foreach ($line in $envContent) {
            if ($line -match "^$var=") {
                $found = $true
                $value = $line -replace "^$var=", ""
                if ($value -match "your-|YOUR_|^$") {
                    Write-Host "   ⚠️  $var ayarlanmamış (placeholder değer)" -ForegroundColor Yellow
                } else {
                    Write-Host "   ✅ $var ayarlanmış" -ForegroundColor Green
                }
                break
            }
        }
        if (-not $found) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "   ❌ Eksik environment variable'lar:" -ForegroundColor Red
        foreach ($var in $missingVars) {
            Write-Host "      - $var" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ $envFile bulunamadı!" -ForegroundColor Red
    Write-Host "   📝 Lütfen env.example'dan .env dosyası oluşturun:" -ForegroundColor Yellow
    Write-Host "      cp env.example .env" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📚 Daha fazla bilgi: docs/DOCKER_GOOGLE_CLOUD_SETUP.md" -ForegroundColor Cyan

