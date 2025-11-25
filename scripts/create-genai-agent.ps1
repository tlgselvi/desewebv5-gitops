# Google GenAI App Builder Agent Oluşturma Scripti
# Dese EA Plan v7.0
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 GenAI App Builder Agent Oluşturuluyor" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"
$AGENT_NAME = "dese-finbot-agent"
$DATA_STORE_NAME = "dese-knowledge-base"

# Access token al
Write-Host "📝 Access token alınıyor..." -ForegroundColor Yellow
$accessToken = gcloud auth application-default print-access-token 2>$null

if (-not $accessToken) {
    Write-Host "❌ Hata: Access token alınamadı!" -ForegroundColor Red
    Write-Host "   Lütfen önce 'gcloud auth application-default login' komutunu çalıştırın" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Access token alındı" -ForegroundColor Green
Write-Host ""

# 1. Data Store oluştur (Knowledge Base için)
Write-Host "📦 Data Store oluşturuluyor..." -ForegroundColor Yellow
$dataStoreUrl = "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_ID/locations/global/collections/default_collection/dataStores?dataStoreId=$DATA_STORE_NAME"

$dataStoreBody = @{
    displayName = "Dese Knowledge Base"
    solutionTypes = @("SOLUTION_TYPE_SEARCH")
    contentConfig = "CONTENT_REQUIRED"
} | ConvertTo-Json -Depth 10

try {
    $dataStoreResponse = Invoke-RestMethod -Uri $dataStoreUrl -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $dataStoreBody -ErrorAction SilentlyContinue

    if ($dataStoreResponse) {
        Write-Host "✅ Data Store oluşturuldu: $($dataStoreResponse.name)" -ForegroundColor Green
        $dataStoreId = $DATA_STORE_NAME
    } else {
        Write-Host "⚠️  Data Store zaten mevcut veya oluşturulamadı" -ForegroundColor Yellow
        $dataStoreId = $DATA_STORE_NAME
    }
} catch {
    $errorMessage = $_.Exception.Message
    if ($errorMessage -match "already exists") {
        Write-Host "✅ Data Store zaten mevcut: $DATA_STORE_NAME" -ForegroundColor Green
        $dataStoreId = $DATA_STORE_NAME
    } else {
        Write-Host "⚠️  Data Store oluşturulamadı (opsiyonel): $errorMessage" -ForegroundColor Yellow
        $dataStoreId = $null
    }
}

Write-Host ""

# 2. Agent oluştur (Vertex AI Agent Builder API)
Write-Host "🤖 Agent oluşturuluyor..." -ForegroundColor Yellow
Write-Host "   Not: Agent Builder API'si için Console üzerinden oluşturma önerilir" -ForegroundColor Gray
Write-Host ""

# Agent Builder için REST API endpoint
$agentUrl = "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/agents"

$agentBody = @{
    displayName = $AGENT_NAME
    defaultLanguageCode = "tr"
    timeZone = "Europe/Istanbul"
    description = "Dese EA Plan FinBot Agent - Financial analysis and predictions"
} | ConvertTo-Json -Depth 10

try {
    $agentResponse = Invoke-RestMethod -Uri $agentUrl -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $agentBody -ErrorAction SilentlyContinue

    if ($agentResponse -and $agentResponse.name) {
        Write-Host "✅ Agent oluşturuldu!" -ForegroundColor Green
        Write-Host "   Agent Name: $($agentResponse.name)" -ForegroundColor Cyan
        Write-Host "   Display Name: $($agentResponse.displayName)" -ForegroundColor Cyan
        
        # Agent ID'yi çıkar
        $agentId = $agentResponse.name -replace ".*/agents/", ""
        Write-Host ""
        Write-Host "📋 .env dosyanıza ekleyin:" -ForegroundColor Yellow
        Write-Host "GENAI_AGENT_ID=$agentId" -ForegroundColor White
        Write-Host "GENAI_DATA_STORE_ID=$dataStoreId" -ForegroundColor White
    } else {
        Write-Host "⚠️  Agent oluşturulamadı. Console üzerinden oluşturmanız gerekebilir." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 Manuel Oluşturma Adımları:" -ForegroundColor Cyan
        Write-Host "1. https://console.cloud.google.com/vertex-ai/agent-builder?project=$PROJECT_ID" -ForegroundColor White
        Write-Host "2. 'Create Agent' butonuna tıklayın" -ForegroundColor White
        Write-Host "3. Agent adı: $AGENT_NAME" -ForegroundColor White
        Write-Host "4. Agent ID'yi kopyalayın ve .env dosyanıza ekleyin" -ForegroundColor White
    }
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "⚠️  Agent API hatası: $errorMessage" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Agent Builder için Console kullanımı önerilir:" -ForegroundColor Cyan
    Write-Host "   https://console.cloud.google.com/vertex-ai/agent-builder?project=$PROJECT_ID" -ForegroundColor White
    Write-Host ""
    Write-Host "   Alternatif: Discovery Engine üzerinden Search Engine oluşturabilirsiniz" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ İşlem tamamlandı!" -ForegroundColor Green

