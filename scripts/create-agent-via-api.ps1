# REST API ile Agent Oluşturma Scripti
# Alternatif yöntem - Console erişimi çalışmıyorsa

$ErrorActionPreference = "Stop"

Write-Host "🚀 REST API ile Agent Oluşturma" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"
$AGENT_NAME = "dese-finbot-agent"

# Access token al
Write-Host "📝 Access token alınıyor..." -ForegroundColor Yellow
try {
    $accessToken = gcloud auth application-default print-access-token 2>$null
    if (-not $accessToken) {
        Write-Host "❌ Access token alınamadı!" -ForegroundColor Red
        Write-Host "   Lütfen önce 'gcloud auth application-default login' komutunu çalıştırın" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Access token alındı" -ForegroundColor Green
} catch {
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Lütfen önce 'gcloud auth application-default login' komutunu çalıştırın" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Agent oluştur
Write-Host "🤖 Agent oluşturuluyor..." -ForegroundColor Yellow

$agentUrl = "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/agents"

$agentBody = @{
    displayName = $AGENT_NAME
    defaultLanguageCode = "tr"
    timeZone = "Europe/Istanbul"
    description = "DESE EA Plan FinBot Agent - Financial analysis and predictions"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $agentUrl -Method POST -Headers @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    } -Body $agentBody

    if ($response -and $response.name) {
        Write-Host "✅ Agent başarıyla oluşturuldu!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Agent Bilgileri:" -ForegroundColor Cyan
        Write-Host "   Name: $($response.name)" -ForegroundColor White
        Write-Host "   Display Name: $($response.displayName)" -ForegroundColor White
        
        # Agent ID'yi çıkar
        $agentId = $response.name -replace ".*/agents/", ""
        Write-Host "   Agent ID: $agentId" -ForegroundColor White
        Write-Host ""
        
        # .env dosyasını güncelle
        Write-Host "📝 .env dosyası güncelleniyor..." -ForegroundColor Yellow
        .\scripts\add-genai-agent-id.ps1 -AgentId $agentId
        
        Write-Host ""
        Write-Host "✅ Kurulum tamamlandı!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Agent oluşturuldu ama yanıt beklenen formatta değil" -ForegroundColor Yellow
        Write-Host "   Response: $($response | ConvertTo-Json -Depth 5)" -ForegroundColor Gray
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message
    Write-Host "❌ Agent oluşturulamadı!" -ForegroundColor Red
    Write-Host "   Hata: $errorResponse" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternatif Çözümler:" -ForegroundColor Yellow
    Write-Host "   1. Vertex AI Console'dan manuel oluşturun:" -ForegroundColor White
    Write-Host "      https://console.cloud.google.com/vertex-ai?project=$PROJECT_ID" -ForegroundColor Gray
    Write-Host "   2. Discovery Engine Console'dan deneyin:" -ForegroundColor White
    Write-Host "      https://console.cloud.google.com/gen-app-builder/data-stores?project=$PROJECT_ID" -ForegroundColor Gray
    Write-Host "   3. API endpoint'ini kontrol edin" -ForegroundColor White
    exit 1
}

