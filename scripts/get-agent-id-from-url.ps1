# Agent ID'yi URL'den veya kullanıcıdan alma scripti
# Kullanım: .\scripts\get-agent-id-from-url.ps1

$ErrorActionPreference = "Stop"

Write-Host "📝 Agent ID'yi Alıyoruz" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""

Write-Host "Agent ID'yi bulmak için iki yöntem var:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. URL'den: Tarayıcınızın adres çubuğundaki URL'yi kopyalayın" -ForegroundColor White
Write-Host "   Örnek: .../agents/1234567890123456789 veya .../apps/..." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Manuel: Agent ID'yi direkt girin" -ForegroundColor White
Write-Host ""

$input = Read-Host "URL'yi veya Agent ID'yi buraya yapıştırın"

if (-not $input -or $input.Trim() -eq "") {
    Write-Host "❌ Hiçbir şey girilmedi!" -ForegroundColor Red
    exit 1
}

$input = $input.Trim()

# URL'den Agent ID çıkarma
$agentId = $null

# Pattern 1: .../agents/AGENT_ID
if ($input -match "agents/([^/?]+)") {
    $agentId = $matches[1]
    Write-Host "✅ Agent ID bulundu (URL'den): $agentId" -ForegroundColor Green
}
# Pattern 2: .../apps/APP_ID
elseif ($input -match "apps/([^/?]+)") {
    $agentId = $matches[1]
    Write-Host "✅ App ID bulundu (URL'den): $agentId" -ForegroundColor Green
}
# Pattern 3: Direkt ID (sadece sayılar)
elseif ($input -match "^\d+$") {
    $agentId = $input
    Write-Host "✅ Agent ID: $agentId" -ForegroundColor Green
}
# Pattern 4: projects/.../agents/...
elseif ($input -match "projects/[^/]+/locations/[^/]+/agents/([^/?]+)") {
    $agentId = $matches[1]
    Write-Host "✅ Agent ID bulundu (full path'ten): $agentId" -ForegroundColor Green
}
else {
    # Direkt ID olarak kabul et
    $agentId = $input
    Write-Host "✅ Agent ID olarak kabul edildi: $agentId" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 .env dosyasına ekleniyor..." -ForegroundColor Yellow

# Agent ID'yi .env dosyasına ekle
.\scripts\add-genai-agent-id.ps1 -AgentId $agentId

Write-Host ""
Write-Host "✅ Tamamlandı! Agent ID projenize eklendi." -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Cyan
Write-Host "   1. Paketleri kurun: pnpm install" -ForegroundColor White
Write-Host "   2. Uygulamayı başlatın: pnpm dev" -ForegroundColor White
Write-Host "   3. Test edin: curl http://localhost:3000/health" -ForegroundColor White
Write-Host ""

