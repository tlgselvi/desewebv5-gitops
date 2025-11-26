# pnpm Bağımlılık Temizleme Script'i
# Kullanım: .\scripts\clean-pnpm-deps.ps1
# 
# Bu script, pnpm'in "hayalet" bağımlılık sorunlarını çözmek için:
# 1. Projedeki node_modules klasörlerini siler
# 2. pnpm'in global deposundaki kullanılmayan paketleri temizler
# 3. Lock dosyasını silerek pnpm'i tüm bağımlılıkları sıfırdan çözmeye zorlar
# 4. Her şeyi sıfırdan kurar

Write-Host "🧹 pnpm Bağımlılık Temizleme Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# 1. Projedeki node_modules klasörlerini sil
Write-Host "1️⃣  node_modules klasörleri siliniyor..." -ForegroundColor Yellow
$nodeModulesPaths = @(
    "node_modules",
    "frontend/node_modules"
)

foreach ($path in $nodeModulesPaths) {
    if (Test-Path $path) {
        Write-Host "   Siliniyor: $path" -ForegroundColor Gray
        Remove-Item -Recurse -Force -Path $path -ErrorAction SilentlyContinue
        Write-Host "   ✅ $path silindi" -ForegroundColor Green
    } else {
        Write-Host "   ⏭️  $path bulunamadı, atlanıyor" -ForegroundColor Gray
    }
}

Write-Host ""

# 2. pnpm'in global deposundaki kullanılmayan paketleri temizle
Write-Host "2️⃣  pnpm store temizleniyor..." -ForegroundColor Yellow
try {
    pnpm store prune
    Write-Host "   ✅ pnpm store temizlendi" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  pnpm store prune hatası: $_" -ForegroundColor Yellow
}

Write-Host ""

# 3. Lock dosyasını silerek pnpm'i tüm bağımlılıkları sıfırdan çözmeye zorla
Write-Host "3️⃣  pnpm-lock.yaml siliniyor..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    Remove-Item -Force -Path "pnpm-lock.yaml" -ErrorAction SilentlyContinue
    Write-Host "   ✅ pnpm-lock.yaml silindi" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  pnpm-lock.yaml bulunamadı" -ForegroundColor Gray
}

Write-Host ""

# 4. Her şeyi sıfırdan kur
Write-Host "4️⃣  Bağımlılıklar sıfırdan kuruluyor..." -ForegroundColor Yellow
Write-Host "   Bu işlem birkaç dakika sürebilir..." -ForegroundColor Gray
Write-Host ""

try {
    pnpm install
    Write-Host ""
    Write-Host "✅ Bağımlılıklar başarıyla kuruldu!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ pnpm install hatası: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Temizleme işlemi tamamlandı!" -ForegroundColor Cyan

