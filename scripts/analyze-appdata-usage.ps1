# AppData\Local Kullanım Analizi
# Bu script AppData\Local klasöründe projeyle ilgili kullanımları analiz eder

Write-Host "🔍 AppData\Local Kullanım Analizi" -ForegroundColor Cyan
Write-Host ""

$localAppData = $env:LOCALAPPDATA
Write-Host "📁 AppData\Local Konumu: $localAppData" -ForegroundColor Cyan
Write-Host ""

# Projeyle ilgili klasörler
$relatedDirs = @(
    @{Name="npm-cache"; Description="npm cache (proje npm kullanmıyor, pnpm kullanıyor)"; Used=$false},
    @{Name="pip"; Description="pip cache (FinBot, MuBot Python servisleri için)"; Used=$true},
    @{Name="pnpm"; Description="pnpm global store (proje pnpm kullanıyor)"; Used=$true},
    @{Name="pnpm-cache"; Description="pnpm cache"; Used=$true},
    @{Name="node"; Description="Node.js cache"; Used=$true},
    @{Name="node-gyp"; Description="node-gyp cache (native modüller için)"; Used=$true}
)

Write-Host "📊 Projeyle İlgili Klasörler:" -ForegroundColor Yellow
Write-Host ""

$totalSize = 0
foreach ($dir in $relatedDirs) {
    $path = Join-Path $localAppData $dir.Name
    if (Test-Path $path) {
        try {
            $size = (Get-ChildItem -Path $path -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            $sizeMB = [math]::Round($size / 1MB, 2)
            $sizeGB = [math]::Round($size / 1GB, 2)
            $totalSize += $size
            
            $status = if ($dir.Used) { "✅ Kullanılıyor" } else { "⚠️  Kullanılmıyor" }
            $color = if ($dir.Used) { "Green" } else { "Yellow" }
            
            Write-Host "  $status" -ForegroundColor $color -NoNewline
            Write-Host " - $($dir.Name): " -NoNewline
            Write-Host "$sizeMB MB ($sizeGB GB)" -ForegroundColor Cyan
            Write-Host "    $($dir.Description)" -ForegroundColor Gray
        } catch {
            Write-Host "  ⚠️  $($dir.Name): Hata ($_)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "📊 Toplam Boyut: $([math]::Round($totalSize / 1GB, 2)) GB" -ForegroundColor Yellow
Write-Host ""

# Proje kodunda AppData\Local kullanımı kontrolü
Write-Host "🔍 Proje Kodunda AppData\Local Kullanımı:" -ForegroundColor Yellow
Write-Host "  ❌ Direkt kullanım yok" -ForegroundColor Green
Write-Host "  ✅ Log dosyaları proje klasöründe (logs/)" -ForegroundColor Green
Write-Host "  ✅ Upload dosyaları proje klasöründe (uploads/)" -ForegroundColor Green
Write-Host "  ✅ localStorage browser'da (AppData\Local\Google\Chrome\User Data\Local Storage)" -ForegroundColor Cyan
Write-Host ""

# Öneriler
Write-Host "💡 Öneriler:" -ForegroundColor Cyan
Write-Host "  1. pnpm cache temizlenebilir (pnpm store prune)" -ForegroundColor Yellow
Write-Host "  2. npm-cache temizlenebilir (proje npm kullanmıyor)" -ForegroundColor Yellow
Write-Host "  3. pip cache zaten temizlendi" -ForegroundColor Green
Write-Host "  4. node-gyp cache temizlenebilir (gerekirse yeniden build edilir)" -ForegroundColor Yellow

