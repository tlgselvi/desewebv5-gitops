# npm Cache Temizleme Scripti
# Bu script npm'in global cache klasörünü temizler
# NOT: Proje pnpm kullanıyor, npm cache'i projeyi etkilemez

Write-Host "🧹 npm Cache Temizleme Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# npm cache konumunu al
$npmCachePath = npm config get cache 2>$null | Out-String
$npmCachePath = $npmCachePath.Trim()

if (-not $npmCachePath -or $npmCachePath -eq "") {
    Write-Host "⚠️  npm cache konumu bulunamadı. npm yüklü olmayabilir." -ForegroundColor Yellow
    exit 0
}

Write-Host "📁 npm Cache Konumu: $npmCachePath" -ForegroundColor Cyan
Write-Host ""

# Cache klasörü var mı kontrol et
if (-not (Test-Path $npmCachePath)) {
    Write-Host "✅ Cache klasörü zaten temiz (bulunamadı)" -ForegroundColor Green
    exit 0
}

# Cache boyutunu hesapla
try {
    $cacheSize = (Get-ChildItem -Path $npmCachePath -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
    $cacheSizeMB = [math]::Round($cacheSize / 1MB, 2)
    $cacheSizeGB = [math]::Round($cacheSize / 1GB, 2)
    
    Write-Host "📊 Cache Boyutu: $cacheSizeMB MB ($cacheSizeGB GB)" -ForegroundColor Yellow
    Write-Host ""
    
    # Kullanıcıya onay sor
    $response = Read-Host "npm cache'i temizlemek istiyor musunuz? (E/H)"
    
    if ($response -eq "E" -or $response -eq "e" -or $response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-Host "🗑️  npm cache temizleniyor..." -ForegroundColor Yellow
        
        # npm cache clean komutu kullan (daha güvenli)
        npm cache clean --force 2>&1 | Out-Null
        
        # Alternatif: Manuel temizleme (daha agresif)
        # Remove-Item -Path $npmCachePath -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "✅ npm cache temizlendi!" -ForegroundColor Green
        Write-Host "   Temizlenen: ~$cacheSizeMB MB ($cacheSizeGB GB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 Not: Proje pnpm kullanıyor, npm cache'i projeyi etkilemez" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ İşlem iptal edildi" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cache boyutu hesaplanamadı: $_" -ForegroundColor Yellow
    Write-Host "   Ancak temizleme işlemi devam edebilir" -ForegroundColor Yellow
}

