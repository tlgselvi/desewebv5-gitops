# Alternatif Agent ID Bulma Scripti
# Build uygulamaları için

$ErrorActionPreference = "Stop"

Write-Host "🔍 Agent ID'yi Buluyoruz" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""

Write-Host "metadata.json'da Agent ID bulunamadı." -ForegroundColor Yellow
Write-Host "Build uygulamaları için Agent ID farklı yerlerde olabilir." -ForegroundColor Yellow
Write-Host ""

Write-Host "Lütfen aşağıdaki bilgilerden birini paylaşın:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tarayıcı URL'si (tam URL)" -ForegroundColor White
Write-Host "   Örnek: console.cloud.google.com/vertex-ai/studio/build/..." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Uygulama ayarlarından App ID" -ForegroundColor White
Write-Host "   - Settings butonuna tıklayın" -ForegroundColor Gray
Write-Host "   - App ID veya Application ID'yi bulun" -ForegroundColor Gray
Write-Host ""
Write-Host "3. API Key (eğer varsa)" -ForegroundColor White
Write-Host "   - Get API key butonuna tıklayın" -ForegroundColor Gray
Write-Host ""

$input = Read-Host "URL, App ID veya başka bir identifier girin (veya Enter ile atlayın)"

if ($input -and $input.Trim() -ne "") {
    $input = $input.Trim()
    
    # URL'den ID çıkarma
    $id = $null
    
    # Pattern 1: .../agents/...
    if ($input -match "agents/([^/?]+)") {
        $id = $matches[1]
        Write-Host "✅ Agent ID bulundu: $id" -ForegroundColor Green
    }
    # Pattern 2: .../apps/...
    elseif ($input -match "apps/([^/?]+)") {
        $id = $matches[1]
        Write-Host "✅ App ID bulundu: $id" -ForegroundColor Green
    }
    # Pattern 3: Direkt ID
    elseif ($input -match "^\d+$" -or $input.Length -gt 10) {
        $id = $input
        Write-Host "✅ ID olarak kabul edildi: $id" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  ID formatı tanınmadı, direkt kullanılacak: $input" -ForegroundColor Yellow
        $id = $input
    }
    
    if ($id) {
        Write-Host ""
        Write-Host "📝 .env dosyasına ekleniyor..." -ForegroundColor Yellow
        .\scripts\add-genai-agent-id.ps1 -AgentId $id
    }
} else {
    Write-Host ""
    Write-Host "⚠️  ID girilmedi." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Build uygulamaları için:" -ForegroundColor Cyan
    Write-Host "   - Bu uygulama bir 'Build' uygulaması, Agent Builder agent'ı değil" -ForegroundColor White
    Write-Host "   - Backend entegrasyonu için API key veya farklı bir yöntem gerekebilir" -ForegroundColor White
    Write-Host "   - Alternatif: Agent Builder'dan direkt agent oluşturmayı deneyin" -ForegroundColor White
    Write-Host ""
}

