# Production-Ready GenAI Agent Kurulum Scripti
# DESE EA Plan v7.0 - Agent Builder + Knowledge Base (RAG)
# Tarih: 2025-01-27

$ErrorActionPreference = "Stop"

Write-Host "🚀 Production-Ready GenAI Agent Kurulumu" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Bu script, Agent Builder + Knowledge Base (RAG) yaklaşımıyla" -ForegroundColor Cyan
Write-Host "production-ready bir AI agent oluşturmanıza yardımcı olur." -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"

# 1. Agent Builder Console linkini aç
Write-Host "📋 Adım 1: Agent Builder Console'a gidin" -ForegroundColor Yellow
Write-Host ""
$agentBuilderUrl = "https://console.cloud.google.com/vertex-ai/agent-builder?project=$PROJECT_ID"
Write-Host "   Link: $agentBuilderUrl" -ForegroundColor Cyan
Write-Host ""

# Tarayıcıyı aç
Start-Process $agentBuilderUrl

Write-Host "   ✅ Tarayıcı açıldı. Aşağıdaki adımları takip edin:" -ForegroundColor Green
Write-Host ""
Write-Host "   1. 'Create Agent' veya 'New Agent' butonuna tıklayın" -ForegroundColor White
Write-Host "   2. Agent adı: dese-finbot-agent" -ForegroundColor White
Write-Host "   3. Language: Turkish (tr)" -ForegroundColor White
Write-Host "   4. Time Zone: Europe/Istanbul" -ForegroundColor White
Write-Host "   5. 'Create' butonuna tıklayın" -ForegroundColor White
Write-Host ""
Write-Host "   ⏸️  Agent oluşturulduktan sonra buraya dönün ve Enter'a basın..." -ForegroundColor Yellow
Read-Host

# 2. Agent ID'yi al
Write-Host ""
Write-Host "📝 Adım 2: Agent ID'yi girin" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Agent ID'yi URL'den veya Agent Details sayfasından kopyalayın" -ForegroundColor Gray
Write-Host "   Örnek format: 1234567890123456789 veya projects/.../agents/..." -ForegroundColor Gray
Write-Host ""
$agentId = Read-Host "   Agent ID'yi buraya yapıştırın"

if (-not $agentId -or $agentId.Trim() -eq "") {
    Write-Host ""
    Write-Host "❌ Agent ID girilmedi. Kurulum iptal edildi." -ForegroundColor Red
    exit 1
}

$agentId = $agentId.Trim()

# Agent ID'den sadece ID kısmını çıkar (eğer tam path verilmişse)
if ($agentId -match "agents/([^/]+)") {
    $agentId = $matches[1]
    Write-Host "   ✅ Agent ID çıkarıldı: $agentId" -ForegroundColor Green
}

# 3. Knowledge Base oluşturma rehberi
Write-Host ""
Write-Host "📚 Adım 3: Knowledge Base Oluşturma" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Knowledge Base (RAG) için Data Store oluşturmanız gerekiyor:" -ForegroundColor White
Write-Host ""
Write-Host "   1. Agent Builder sayfasında 'Data Stores' sekmesine gidin" -ForegroundColor White
Write-Host "   2. 'Create Data Store' butonuna tıklayın" -ForegroundColor White
Write-Host "   3. Data Store adı: dese-knowledge-base" -ForegroundColor White
Write-Host "   4. Veri kaynağı seçin:" -ForegroundColor White
Write-Host "      - Website (dokümantasyon için)" -ForegroundColor Gray
Write-Host "      - Cloud Storage (PDF, Word dosyaları için)" -ForegroundColor Gray
Write-Host "      - Manual Upload (CSV, JSON için)" -ForegroundColor Gray
Write-Host "   5. Data Store ID'yi kopyalayın" -ForegroundColor White
Write-Host ""
Write-Host "   ⏸️  Data Store oluşturduktan sonra Enter'a basın..." -ForegroundColor Yellow
Read-Host

$dataStoreId = Read-Host "   Data Store ID'yi girin (veya Enter ile atlayın)"

# 4. .env dosyasını güncelle
Write-Host ""
Write-Host "📝 Adım 4: .env dosyası güncelleniyor..." -ForegroundColor Yellow

$envFile = ".env"
$envExample = "env.example"

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

# GenAI ayarlarını hazırla
$genaiBlock = @"

# Google GenAI App Builder (Vertex AI Agent Builder)
# Production-Ready: Agent Builder + Knowledge Base (RAG)
# Trial Credits: ₺41,569.31 (valid until Oct 2026)
GCP_PROJECT_ID=$PROJECT_ID
GCP_LOCATION=$LOCATION
GENAI_APP_BUILDER_ENABLED=true
GENAI_AGENT_ID=$agentId
GENAI_DATA_STORE_ID=$dataStoreId
GENAI_SEARCH_ENGINE_ID=
"@

# Mevcut GenAI ayarlarını kontrol et ve güncelle
if ($envContent -match "GENAI_APP_BUILDER_ENABLED") {
    # Mevcut ayarları güncelle
    $envContent = $envContent -replace "GENAI_AGENT_ID=.*", "GENAI_AGENT_ID=$agentId"
    if ($dataStoreId -and $dataStoreId.Trim() -ne "") {
        $envContent = $envContent -replace "GENAI_DATA_STORE_ID=.*", "GENAI_DATA_STORE_ID=$dataStoreId"
    }
    $envContent = $envContent -replace "GCP_PROJECT_ID=.*", "GCP_PROJECT_ID=$PROJECT_ID"
    if ($envContent -notmatch "GCP_LOCATION=") {
        $envContent = $envContent -replace "(GCP_PROJECT_ID=.*)", "`$1`nGCP_LOCATION=$LOCATION"
    } else {
        $envContent = $envContent -replace "GCP_LOCATION=.*", "GCP_LOCATION=$LOCATION"
    }
    Write-Host "   ✅ Mevcut GenAI ayarları güncellendi" -ForegroundColor Green
} else {
    # Yeni GenAI bloğunu ekle
    $envContent += "`n$genaiBlock"
    Write-Host "   ✅ GenAI ayarları eklendi" -ForegroundColor Green
}

# Dosyayı kaydet
Set-Content -Path $envFile -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ .env dosyası başarıyla güncellendi!" -ForegroundColor Green
Write-Host ""

# 5. Knowledge Base dokümantasyon klasörü oluştur
Write-Host "📚 Adım 5: Knowledge Base dokümantasyon klasörü oluşturuluyor..." -ForegroundColor Yellow

$kbDir = "docs/knowledge-base"
if (-not (Test-Path $kbDir)) {
    New-Item -ItemType Directory -Path $kbDir -Force | Out-Null
    Write-Host "   ✅ Klasör oluşturuldu: $kbDir" -ForegroundColor Green
}

# Örnek dokümantasyon dosyaları oluştur
$exampleFiles = @{
    "finance-terms.md" = @"
# Finansal Terimler Sözlüğü

## Gelir (Revenue)
Bir işletmenin faaliyetlerinden elde ettiği toplam gelir.

## Gider (Expense)
İşletmenin faaliyetlerini sürdürmek için yaptığı harcamalar.

## Nakit Akışı (Cash Flow)
Belirli bir dönemde işletmeye giren ve çıkan nakit miktarı.

## Bütçe (Budget)
Gelecek dönem için planlanan gelir ve gider tahmini.
"@
    "accounting-rules.md" = @"
# Muhasebe Kuralları

## İşlem Kayıtları
- Tüm finansal işlemler kaydedilmelidir
- Her işlem bir kategoriye atanmalıdır
- İşlem tarihi ve tutarı zorunludur

## Raporlama
- Aylık raporlar her ayın sonunda hazırlanmalıdır
- Yıllık raporlar mali yıl sonunda hazırlanmalıdır
- Tüm raporlar KVKK uyumlu olmalıdır
"@
    "faq.md" = @"
# Sık Sorulan Sorular (FAQ)

## Finansal Analiz
**S: Bu ay gelirim ne kadar?**
C: Bu ay toplam geliriniz [tutar] TL. Detaylı analiz için raporlar bölümüne bakabilirsiniz.

**S: Gelecek ay tahmini ne?**
C: Geçmiş verilere göre, gelecek ay tahmini geliriniz [tutar] TL. Bu tahmin %[güven] güvenilirlik oranına sahiptir.

## Muhasebe
**S: İşlem nasıl kaydedilir?**
C: Finans modülünden "Yeni İşlem" butonuna tıklayarak işlem kaydı oluşturabilirsiniz.
"@
}

foreach ($file in $exampleFiles.Keys) {
    $filePath = Join-Path $kbDir $file
    if (-not (Test-Path $filePath)) {
        Set-Content -Path $filePath -Value $exampleFiles[$file]
        Write-Host "   ✅ Örnek dosya oluşturuldu: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Knowledge Base dokümantasyon klasörü hazır!" -ForegroundColor Green
Write-Host ""

# 6. Özet
Write-Host "📋 Kurulum Özeti" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Agent Builder agent oluşturuldu" -ForegroundColor Green
Write-Host "   Agent ID: $agentId" -ForegroundColor White
if ($dataStoreId -and $dataStoreId.Trim() -ne "") {
    Write-Host "✅ Knowledge Base (Data Store) oluşturuldu" -ForegroundColor Green
    Write-Host "   Data Store ID: $dataStoreId" -ForegroundColor White
} else {
    Write-Host "⚠️  Knowledge Base henüz oluşturulmadı" -ForegroundColor Yellow
    Write-Host "   Sonraki adımda oluşturabilirsiniz" -ForegroundColor Gray
}
Write-Host "✅ .env dosyası güncellendi" -ForegroundColor Green
Write-Host "✅ Knowledge Base dokümantasyon klasörü hazır" -ForegroundColor Green
Write-Host "   Klasör: $kbDir" -ForegroundColor White
Write-Host ""

# 7. Sonraki adımlar
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Knowledge Base'e doküman yükleyin:" -ForegroundColor White
Write-Host "   - docs/knowledge-base/ klasöründeki dosyaları kullanın" -ForegroundColor Gray
Write-Host "   - Agent Builder > Data Stores > Upload Documents" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Custom Tools ekleyin (opsiyonel):" -ForegroundColor White
Write-Host "   - Backend API entegrasyonları" -ForegroundColor Gray
Write-Host "   - Veri çekme fonksiyonları" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test edin:" -ForegroundColor White
Write-Host "   pnpm install" -ForegroundColor Gray
Write-Host "   pnpm dev" -ForegroundColor Gray
Write-Host "   curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Agent'ı test edin:" -ForegroundColor White
Write-Host "   Agent Builder Console'da test edebilirsiniz" -ForegroundColor Gray
Write-Host "   veya API üzerinden: POST /api/v1/genai/chat" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Kurulum tamamlandı!" -ForegroundColor Green
Write-Host ""

