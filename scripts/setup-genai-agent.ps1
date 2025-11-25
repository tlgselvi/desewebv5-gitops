# GenAI App Builder Agent Kurulum Yardımcı Scripti
# Dese EA Plan v7.0
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 GenAI App Builder Agent Kurulum Yardımcısı" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"

# 1. Console linklerini göster
Write-Host "📋 Adım 1: Agent Builder Console'a gidin" -ForegroundColor Cyan
Write-Host ""
$agentBuilderUrl = "https://console.cloud.google.com/vertex-ai/agent-builder?project=$PROJECT_ID"
Write-Host "   Link: $agentBuilderUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Tarayıcınızda bu linki açın ve aşağıdaki adımları takip edin:" -ForegroundColor White
Write-Host ""

# 2. Adım adım talimatlar
Write-Host "📝 Adım 2: Agent Oluşturma Adımları" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. 'Create Agent' veya 'New Agent' butonuna tıklayın" -ForegroundColor White
Write-Host "   2. Agent adı: dese-finbot-agent" -ForegroundColor White
Write-Host "   3. Language: Turkish (tr)" -ForegroundColor White
Write-Host "   4. Time Zone: Europe/Istanbul" -ForegroundColor White
Write-Host "   5. 'Create' butonuna tıklayın" -ForegroundColor White
Write-Host "   6. Agent oluşturulduktan sonra, Agent ID'yi kopyalayın" -ForegroundColor White
Write-Host "      (Genellikle URL'de veya Agent Details sayfasında görünür)" -ForegroundColor Gray
Write-Host ""

# 3. Agent ID'yi al
Write-Host "📝 Adım 3: Agent ID'yi girin" -ForegroundColor Cyan
Write-Host ""
$agentId = Read-Host "   Agent ID'yi buraya yapıştırın (veya Enter ile atlayın)"

if ($agentId -and $agentId.Trim() -ne "") {
    $agentId = $agentId.Trim()
    
    # .env dosyasını güncelle
    $envFile = ".env"
    $envExample = "env.example"
    
    Write-Host ""
    Write-Host "📝 Adım 4: .env dosyası güncelleniyor..." -ForegroundColor Cyan
    
    # .env dosyası var mı kontrol et
    if (-not (Test-Path $envFile)) {
        if (Test-Path $envExample) {
            Write-Host "   .env dosyası bulunamadı, env.example'dan kopyalanıyor..." -ForegroundColor Yellow
            Copy-Item $envExample $envFile
        } else {
            Write-Host "   .env dosyası oluşturuluyor..." -ForegroundColor Yellow
            New-Item -ItemType File -Path $envFile | Out-Null
        }
    }
    
    # .env dosyasını oku
    $envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
    if (-not $envContent) {
        $envContent = ""
    }
    
    # GenAI ayarlarını ekle/güncelle
    $genaiSettings = @"
# Google GenAI App Builder
GCP_PROJECT_ID=$PROJECT_ID
GCP_LOCATION=$LOCATION
GENAI_APP_BUILDER_ENABLED=true
GENAI_AGENT_ID=$agentId
GENAI_DATA_STORE_ID=
GENAI_SEARCH_ENGINE_ID=
"@
    
    # Mevcut GenAI ayarlarını kontrol et ve güncelle
    if ($envContent -match "GENAI_AGENT_ID=") {
        $envContent = $envContent -replace "GENAI_AGENT_ID=.*", "GENAI_AGENT_ID=$agentId"
        Write-Host "   ✅ GENAI_AGENT_ID güncellendi" -ForegroundColor Green
    } else {
        # GenAI bölümünü ekle
        if ($envContent -notmatch "GENAI_APP_BUILDER_ENABLED") {
            $envContent += "`n$genaiSettings"
            Write-Host "   ✅ GenAI ayarları eklendi" -ForegroundColor Green
        } else {
            # Sadece agent ID'yi ekle
            $envContent = $envContent -replace "(GENAI_APP_BUILDER_ENABLED=.*)", "`$1`nGENAI_AGENT_ID=$agentId"
            Write-Host "   ✅ GENAI_AGENT_ID eklendi" -ForegroundColor Green
        }
    }
    
    # GCP_PROJECT_ID ve LOCATION'ı da güncelle
    if ($envContent -notmatch "GCP_PROJECT_ID=") {
        $envContent = "GCP_PROJECT_ID=$PROJECT_ID`nGCP_LOCATION=$LOCATION`n" + $envContent
    } else {
        $envContent = $envContent -replace "GCP_PROJECT_ID=.*", "GCP_PROJECT_ID=$PROJECT_ID"
        if ($envContent -notmatch "GCP_LOCATION=") {
            $envContent = $envContent -replace "(GCP_PROJECT_ID=.*)", "`$1`nGCP_LOCATION=$LOCATION"
        } else {
            $envContent = $envContent -replace "GCP_LOCATION=.*", "GCP_LOCATION=$LOCATION"
        }
    }
    
    # Dosyayı kaydet
    Set-Content -Path $envFile -Value $envContent -NoNewline
    
    Write-Host ""
    Write-Host "✅ .env dosyası başarıyla güncellendi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Eklenen/Güncellenen Ayarlar:" -ForegroundColor Cyan
    Write-Host "   GCP_PROJECT_ID=$PROJECT_ID" -ForegroundColor White
    Write-Host "   GCP_LOCATION=$LOCATION" -ForegroundColor White
    Write-Host "   GENAI_APP_BUILDER_ENABLED=true" -ForegroundColor White
    Write-Host "   GENAI_AGENT_ID=$agentId" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "⚠️  Agent ID girilmedi. Manuel olarak .env dosyanıza ekleyin:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "GCP_PROJECT_ID=$PROJECT_ID" -ForegroundColor White
    Write-Host "GCP_LOCATION=$LOCATION" -ForegroundColor White
    Write-Host "GENAI_APP_BUILDER_ENABLED=true" -ForegroundColor White
    Write-Host "GENAI_AGENT_ID=your-agent-id-here" -ForegroundColor White
    Write-Host ""
}

# 4. Sonraki adımlar
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Paketleri kurun: pnpm install" -ForegroundColor White
Write-Host "   2. Uygulamayı başlatın: pnpm dev" -ForegroundColor White
Write-Host "   3. Health check: curl http://localhost:3000/health" -ForegroundColor White
Write-Host "   4. GenAI status: curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/api/v1/genai/status" -ForegroundColor White
Write-Host ""
Write-Host "✅ Kurulum tamamlandı!" -ForegroundColor Green

