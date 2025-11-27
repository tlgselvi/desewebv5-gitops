# pip Cache Temizleme Scripti
# Bu script pip'in global cache klasörünü temizler
# NOT: Proje Python kullanıyor (FinBot, MuBot, AIOps), ancak Docker'da --no-cache-dir kullanılıyor

Write-Host "🧹 pip Cache Temizleme Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# pip cache konumunu al
$pipCachePath = pip cache dir 2>&1 | Out-String
$pipCachePath = $pipCachePath.Trim()

if (-not $pipCachePath -or $pipCachePath -eq "") {
    Write-Host "⚠️  pip cache konumu bulunamadı. pip yüklü olmayabilir." -ForegroundColor Yellow
    exit 0
}

Write-Host "📁 pip Cache Konumu: $pipCachePath" -ForegroundColor Cyan
Write-Host ""

# Cache bilgilerini al
$cacheInfo = pip cache info 2>&1 | Out-String

if ($cacheInfo -match "Package index page cache size: ([\d.]+) (MB|GB)") {
    $cacheSize = $matches[1]
    $cacheUnit = $matches[2]
    Write-Host "📊 Cache Boyutu: $cacheSize $cacheUnit" -ForegroundColor Yellow
} else {
    # Alternatif: Manuel boyut hesaplama
    if (Test-Path $pipCachePath) {
        try {
            $cacheSize = (Get-ChildItem -Path $pipCachePath -Recurse -ErrorAction SilentlyContinue | 
                         Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            $cacheSizeMB = [math]::Round($cacheSize / 1MB, 2)
            $cacheSizeGB = [math]::Round($cacheSize / 1GB, 2)
            Write-Host "📊 Cache Boyutu: $cacheSizeMB MB ($cacheSizeGB GB)" -ForegroundColor Yellow
        } catch {
            Write-Host "⚠️  Cache boyutu hesaplanamadı" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Kullanıcıya onay sor
$response = Read-Host "pip cache'i temizlemek istiyor musunuz? (E/H)"

if ($response -eq "E" -or $response -eq "e" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🗑️  pip cache temizleniyor..." -ForegroundColor Yellow
    
    # pip cache purge komutu kullan (daha güvenli)
    pip cache purge 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ pip cache temizlendi!" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 Notlar:" -ForegroundColor Cyan
        Write-Host "   - Docker build'lerde --no-cache-dir kullanılıyor" -ForegroundColor Cyan
        Write-Host "   - Local development için virtualenv kullanılıyor" -ForegroundColor Cyan
        Write-Host "   - Cache gerektiğinde otomatik yeniden oluşturulur" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  pip cache temizleme komutu başarısız oldu" -ForegroundColor Yellow
        Write-Host "   Manuel temizleme için: Remove-Item -Path '$pipCachePath' -Recurse -Force" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ İşlem iptal edildi" -ForegroundColor Yellow
}

