# Backend Başlatma Scripti
# Bu script backend'i port 3001'de başlatır

Write-Host "" -ForegroundColor Cyan
Write-Host "=== BACKEND BAŞLATILIYOR ===" -ForegroundColor Cyan
Write-Host ""

# Environment variables
$env:PORT = "3001"
$env:NODE_ENV = "development"

# Working directory
Set-Location $PSScriptRoot

Write-Host "Port: 3001" -ForegroundColor Yellow
Write-Host "NODE_ENV: development" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend başlatılıyor..." -ForegroundColor Green
Write-Host ""

# Backend'i başlat
try {
    npx tsx watch src/index.ts
} catch {
    Write-Host ""
    Write-Host "❌ HATA: Backend başlatılamadı!" -ForegroundColor Red
    Write-Host "Hata: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Kontrol edin:" -ForegroundColor Yellow
    Write-Host "- Node.js kurulu mu? (node --version)" -ForegroundColor White
    Write-Host "- Bağımlılıklar yüklü mü? (pnpm install)" -ForegroundColor White
    Write-Host "- Docker container'lar çalışıyor mu? (docker ps)" -ForegroundColor White
    Write-Host ""
    exit 1
}

