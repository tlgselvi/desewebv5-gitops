# Docker Network Temizleme Script'i
# Kullanım: .\scripts\clean-docker-network.ps1
# 
# Bu script, Docker ağında kalan artıkları temizler.
# Servislerin birbiriyle haberleşememesi sorunlarını çözmek için kullanılır.

Write-Host "🧹 Docker Network Temizleme Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# Projeye ait container'ları durdur
Write-Host "1️⃣  Proje container'ları durduruluyor..." -ForegroundColor Yellow
try {
    docker compose down
    Write-Host "   ✅ Container'lar durduruldu" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  docker compose down hatası: $_" -ForegroundColor Yellow
}

Write-Host ""

# Kullanılmayan (dangling) tüm ağları temizle
Write-Host "2️⃣  Kullanılmayan Docker ağları temizleniyor..." -ForegroundColor Yellow
try {
    $result = docker network prune -f 2>&1
    Write-Host "   ✅ Docker ağları temizlendi" -ForegroundColor Green
    if ($result -match "Total") {
        Write-Host "   $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  docker network prune hatası: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Docker network temizleme işlemi tamamlandı!" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 İpucu: Servisleri yeniden başlatmak için:" -ForegroundColor Yellow
Write-Host "   docker compose up -d" -ForegroundColor Gray

