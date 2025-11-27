# Workspace Temizlik Scripti
# Bu script gereksiz dosyaları temizler (node_modules, coverage, test-results, vb.)

Write-Host "🧹 Workspace Temizleme Başlatılıyor..." -ForegroundColor Cyan

# Temizlenecek klasörler (güvenli - Git'te zaten ignore edilmiş)
$cleanupDirs = @(
    "node_modules",
    "coverage",
    "test-results",
    "playwright-report",
    "logs",
    "frontend/node_modules",
    "frontend/.next",
    "frontend/coverage",
    "dese-web/node_modules",
    "dese-web/.next",
    ".next"
)

# Temizlenecek dosya pattern'leri
$cleanupFiles = @(
    "*.log",
    "*.tsbuildinfo",
    "frontend/tsconfig.tsbuildinfo"
)

$totalFreed = 0

# Klasörleri temizle
foreach ($dir in $cleanupDirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem -Path $dir -Recurse -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $sizeMB = [math]::Round($size / 1MB, 2)
        
        Write-Host "  🗑️  Temizleniyor: $dir ($sizeMB MB)" -ForegroundColor Yellow
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        $totalFreed += $sizeMB
    }
}

# Dosyaları temizle
foreach ($pattern in $cleanupFiles) {
    Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue | 
        ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  🗑️  Temizleniyor: $($_.FullName) ($sizeMB MB)" -ForegroundColor Yellow
            Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
            $totalFreed += $sizeMB
        }
}

Write-Host ""
Write-Host "✅ Temizlik Tamamlandı!" -ForegroundColor Green
Write-Host "   Toplam Temizlenen: ~$totalFreed MB" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Not: node_modules'ü yeniden oluşturmak için 'pnpm install' çalıştırın" -ForegroundColor Cyan

