# GenAI Bağlantı Test Scripti
# DESE EA Plan v7.0

$ErrorActionPreference = "Stop"

Write-Host "🧪 GenAI Bağlantı Testi" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""

# .env dosyasını kontrol et
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env dosyası bulunamadı!" -ForegroundColor Red
    exit 1
}

# Environment variables'ı yükle
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$agentId = $env:GENAI_AGENT_ID
$apiKey = $env:GOOGLE_CLOUD_API_KEY
$projectId = $env:GCP_PROJECT_ID

Write-Host "📋 Konfigürasyon Kontrolü:" -ForegroundColor Cyan
Write-Host ""

if ($agentId) {
    Write-Host "   ✅ GENAI_AGENT_ID: $agentId" -ForegroundColor Green
} else {
    Write-Host "   ❌ GENAI_AGENT_ID: Bulunamadı" -ForegroundColor Red
}

if ($apiKey) {
    Write-Host "   ✅ GOOGLE_CLOUD_API_KEY: $($apiKey.Substring(0, [Math]::Min(20, $apiKey.Length)))..." -ForegroundColor Green
} else {
    Write-Host "   ❌ GOOGLE_CLOUD_API_KEY: Bulunamadı" -ForegroundColor Red
}

if ($projectId) {
    Write-Host "   ✅ GCP_PROJECT_ID: $projectId" -ForegroundColor Green
} else {
    Write-Host "   ❌ GCP_PROJECT_ID: Bulunamadı" -ForegroundColor Red
}

Write-Host ""

# Python test
Write-Host "🐍 Python Test:" -ForegroundColor Cyan
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "   Python bulundu, test ediliyor..." -ForegroundColor Yellow
    
    $env:GOOGLE_CLOUD_API_KEY = $apiKey
    python scripts/genai-simple-test.py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Python test başarılı!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Python test başarısız" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Python bulunamadı" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Test tamamlandı!" -ForegroundColor Green

