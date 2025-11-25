# Agent Builder Agent Oluşturma - Tam Kurulum Scripti
# DESE EA Plan v7.0 - Production-Ready Agent
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 Agent Builder Agent Kurulumu" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"

# 1. API'leri kontrol et ve aktifleştir
Write-Host "📦 Gerekli API'leri kontrol ediyoruz..." -ForegroundColor Yellow

$requiredApis = @(
    "aiplatform.googleapis.com",
    "discoveryengine.googleapis.com",
    "documentai.googleapis.com"
)

foreach ($api in $requiredApis) {
    Write-Host "   Kontrol ediliyor: $api" -ForegroundColor Gray
    $enabled = gcloud services list --enabled --project=$PROJECT_ID --filter="name:$api" --format="value(name)" 2>$null
    
    if (-not $enabled) {
        Write-Host "   ⚠️  $api aktif değil, aktifleştiriliyor..." -ForegroundColor Yellow
        gcloud services enable $api --project=$PROJECT_ID 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $api aktifleştirildi" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $api aktifleştirilemedi" -ForegroundColor Red
        }
    } else {
        Write-Host "   ✅ $api zaten aktif" -ForegroundColor Green
    }
}

Write-Host ""

# 2. Agent Builder Console'u aç
Write-Host "🌐 Agent Builder Console açılıyor..." -ForegroundColor Yellow
$agentBuilderUrl = "https://console.cloud.google.com/vertex-ai/agent-builder?project=$PROJECT_ID"
Start-Process $agentBuilderUrl

Write-Host "   ✅ Tarayıcı açıldı: $agentBuilderUrl" -ForegroundColor Green
Write-Host ""

# 3. Talimatlar
Write-Host "📋 Adım Adım Talimatlar" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Açılan sayfada 'Create Agent' veya 'New Agent' butonuna tıklayın" -ForegroundColor White
Write-Host ""
Write-Host "2. Agent Bilgilerini Girin:" -ForegroundColor White
Write-Host "   - Agent Name: dese-finbot-agent" -ForegroundColor Gray
Write-Host "   - Display Name: DESE Finansal Asistan" -ForegroundColor Gray
Write-Host "   - Language: Turkish (tr)" -ForegroundColor Gray
Write-Host "   - Time Zone: Europe/Istanbul" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Agent oluşturulduktan sonra Agent ID'yi kopyalayın" -ForegroundColor White
Write-Host "   - URL'de görünecek: .../agents/AGENT_ID" -ForegroundColor Gray
Write-Host "   - Veya Agent Details sayfasından" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Agent ID'yi buraya yapıştırın ve Enter'a basın" -ForegroundColor White
Write-Host ""

# 4. Agent ID'yi al
$agentId = Read-Host "Agent ID'yi buraya yapıştırın"

if (-not $agentId -or $agentId.Trim() -eq "") {
    Write-Host ""
    Write-Host "❌ Agent ID girilmedi. Kurulum iptal edildi." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Agent ID'yi sonra eklemek için:" -ForegroundColor Yellow
    Write-Host "   .\scripts\add-genai-agent-id.ps1 -AgentId 'YOUR_AGENT_ID'" -ForegroundColor White
    exit 1
}

$agentId = $agentId.Trim()

# Agent ID'den sadece ID kısmını çıkar
if ($agentId -match "agents/([^/]+)") {
    $agentId = $matches[1]
    Write-Host "   ✅ Agent ID çıkarıldı: $agentId" -ForegroundColor Green
}

# 5. .env dosyasını güncelle
Write-Host ""
Write-Host "📝 .env dosyası güncelleniyor..." -ForegroundColor Yellow
.\scripts\add-genai-agent-id.ps1 -AgentId $agentId

Write-Host ""
Write-Host "✅ Kurulum Tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Knowledge Base oluşturun (opsiyonel ama önerilir):" -ForegroundColor White
Write-Host "   - Agent Builder > Data Stores > Create Data Store" -ForegroundColor Gray
Write-Host "   - docs/knowledge-base/ klasöründeki dosyaları yükleyin" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Paketleri kurun:" -ForegroundColor White
Write-Host "   pnpm install" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Uygulamayı başlatın:" -ForegroundColor White
Write-Host "   pnpm dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test edin:" -ForegroundColor White
Write-Host "   curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   curl -X POST http://localhost:3000/api/v1/genai/chat -H 'Content-Type: application/json' -d '{\"message\":\"Merhaba\"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Agent başarıyla kuruldu ve hazır!" -ForegroundColor Green
Write-Host ""

