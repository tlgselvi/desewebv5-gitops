# Google Cloud Vertex AI API Aktifleştirme Scripti
# Dese EA Plan v7.0 - GenAI App Builder Entegrasyonu
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 Vertex AI API Aktifleştiriliyor" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Proje kontrolü
$projectId = $env:GCP_PROJECT_ID
if (-not $projectId) {
    $projectId = "ea-plan-seo-project"
    Write-Host "⚠️  GCP_PROJECT_ID environment variable bulunamadı, varsayılan kullanılıyor: $projectId" -ForegroundColor Yellow
}

$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject) {
    Write-Host "📌 Proje ayarlanıyor: $projectId" -ForegroundColor Yellow
    gcloud config set project $projectId
} elseif ($currentProject -ne $projectId) {
    Write-Host "⚠️  Aktif proje ($currentProject) farklı, doğru projeye geçiliyor..." -ForegroundColor Yellow
    gcloud config set project $projectId
}

Write-Host "✅ Proje ID: $projectId" -ForegroundColor Green
Write-Host ""

# Vertex AI API aktifleştirme
Write-Host "📦 Vertex AI API aktifleştiriliyor..." -ForegroundColor Yellow
Write-Host "   Bu işlem birkaç dakika sürebilir..." -ForegroundColor Gray
Write-Host ""

try {
    gcloud services enable aiplatform.googleapis.com --project=$projectId

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Vertex AI API başarıyla aktifleştirildi!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Hata: Vertex AI API aktifleştirilemedi!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Document AI API aktifleştirme (opsiyonel ama önerilir)
Write-Host "📦 Document AI API aktifleştiriliyor..." -ForegroundColor Yellow
try {
    gcloud services enable documentai.googleapis.com --project=$projectId
    Write-Host "✅ Document AI API aktifleştirildi!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Document AI API aktifleştirilemedi (opsiyonel)" -ForegroundColor Yellow
}

# Discovery Engine API aktifleştirme (Search için)
Write-Host "📦 Discovery Engine API aktifleştiriliyor..." -ForegroundColor Yellow
try {
    gcloud services enable discoveryengine.googleapis.com --project=$projectId
    Write-Host "✅ Discovery Engine API aktifleştirildi!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Discovery Engine API aktifleştirilemedi (opsiyonel)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "1. Vertex AI Studio'yu yenileyin: https://console.cloud.google.com/vertex-ai/studio" -ForegroundColor White
Write-Host "2. Agent Builder'a gidin: https://console.cloud.google.com/vertex-ai/agent-builder" -ForegroundColor White
Write-Host "3. Yeni bir agent oluşturun" -ForegroundColor White
Write-Host "4. Agent ID'yi .env dosyanıza ekleyin: GENAI_AGENT_ID=your-agent-id" -ForegroundColor White
Write-Host ""

