# GenAI Agent ID Ekleme Scripti
# Kullanım: .\scripts\add-genai-agent-id.ps1 -AgentId "your-agent-id"

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentId
)

$ErrorActionPreference = "Stop"

Write-Host "📝 GenAI Agent ID ekleniyor..." -ForegroundColor Cyan
Write-Host ""

$envFile = ".env"
$PROJECT_ID = "ea-plan-seo-project"
$LOCATION = "us-central1"

# .env dosyası var mı kontrol et
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env dosyası bulunamadı, oluşturuluyor..." -ForegroundColor Yellow
    Copy-Item "env.example" $envFile -ErrorAction SilentlyContinue
    if (-not (Test-Path $envFile)) {
        New-Item -ItemType File -Path $envFile | Out-Null
    }
}

# .env dosyasını oku
$envContent = Get-Content $envFile -Raw

# GenAI ayarlarını ekle/güncelle
$genaiBlock = @"

# Google GenAI App Builder (Vertex AI Agent Builder)
# Trial Credits: ₺41,569.31 (valid until Oct 2026)
GCP_PROJECT_ID=$PROJECT_ID
GCP_LOCATION=$LOCATION
GENAI_APP_BUILDER_ENABLED=true
GENAI_AGENT_ID=$AgentId
GENAI_DATA_STORE_ID=
GENAI_SEARCH_ENGINE_ID=
"@

# Mevcut GenAI ayarlarını kontrol et
if ($envContent -match "GENAI_APP_BUILDER_ENABLED") {
    # Mevcut ayarları güncelle
    $envContent = $envContent -replace "GENAI_AGENT_ID=.*", "GENAI_AGENT_ID=$AgentId"
    $envContent = $envContent -replace "GCP_PROJECT_ID=.*", "GCP_PROJECT_ID=$PROJECT_ID"
    if ($envContent -notmatch "GCP_LOCATION=") {
        $envContent = $envContent -replace "(GCP_PROJECT_ID=.*)", "`$1`nGCP_LOCATION=$LOCATION"
    } else {
        $envContent = $envContent -replace "GCP_LOCATION=.*", "GCP_LOCATION=$LOCATION"
    }
    Write-Host "✅ Mevcut GenAI ayarları güncellendi" -ForegroundColor Green
} else {
    # Yeni GenAI bloğunu ekle
    $envContent += "`n$genaiBlock"
    Write-Host "✅ GenAI ayarları eklendi" -ForegroundColor Green
}

# Dosyayı kaydet
Set-Content -Path $envFile -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ Agent ID başarıyla eklendi: $AgentId" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Eklenen Ayarlar:" -ForegroundColor Cyan
Write-Host "   GCP_PROJECT_ID=$PROJECT_ID" -ForegroundColor White
Write-Host "   GCP_LOCATION=$LOCATION" -ForegroundColor White
Write-Host "   GENAI_APP_BUILDER_ENABLED=true" -ForegroundColor White
Write-Host "   GENAI_AGENT_ID=$AgentId" -ForegroundColor White
Write-Host ""

