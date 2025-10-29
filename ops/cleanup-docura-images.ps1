# ===============================================
# Docura Image Cleanup Script
# Projede kullanılmayan image'ları tespit eder ve temizler
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🧹 DOCURA IMAGE TEMİZLİĞİ`n" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Projede KULLANILAN image'lar (BUNLARI SİLMEYELİM!)
$USED_IMAGES = @(
    "ghcr.io/cptsystems/finbot:latest",
    "ghcr.io/cptsystems/mubot:latest",
    "ghcr.io/cptsystems/frontend:latest",
    "ghcr.io/cptsystems/dese-web:latest"
)

# Projede KULLANILMAYAN image'lar (BUNLARI SİLEBİLİRİZ)
$UNUSED_IMAGES = @(
    "ghcr.io/cptsystems/aiops-trainer:latest",  # Sadece reports'ta, aktif kullanım yok
    "ghcr.io/cptseo/observer:latest"             # ImagePullBackOff hataları, kullanılmıyor
)

Write-Host "📊 ANALİZ SONUÇLARI:`n" -ForegroundColor Yellow
Write-Host "✅ KULLANILAN IMAGE'LAR (SİLMEYİN!):" -ForegroundColor Green
foreach ($img in $USED_IMAGES) {
    Write-Host "   - $img" -ForegroundColor White
}

Write-Host "`n❌ KULLANILMAYAN IMAGE'LAR (SİLİNEBİLİR):" -ForegroundColor Red
foreach ($img in $UNUSED_IMAGES) {
    Write-Host "   - $img" -ForegroundColor Yellow
}

Write-Host "`n🔍 PROJE DOSYALARINDA KONTROL:`n" -ForegroundColor Cyan

# Tüm YAML dosyalarını kontrol et
$yamlFiles = Get-ChildItem -Path . -Recurse -Include *.yaml,*.yml -Exclude node_modules,dist,build,.next | Where-Object { $_.FullName -notmatch "node_modules|dist|build|\.next" }

Write-Host "Toplam YAML dosyası: $($yamlFiles.Count)" -ForegroundColor Gray

$foundImages = @{}
foreach ($file in $yamlFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        foreach ($image in $USED_IMAGES + $UNUSED_IMAGES) {
            $imageName = $image.Split(':')[0]
            if ($content -match [regex]::Escape($imageName)) {
                if (-not $foundImages.ContainsKey($image)) {
                    $foundImages[$image] = @()
                }
                $foundImages[$image] += $file.Name
            }
        }
    }
}

Write-Host "`n📋 BULUNAN IMAGE REFERANSLARI:`n" -ForegroundColor Cyan
foreach ($img in $foundImages.Keys) {
    Write-Host "$img" -ForegroundColor White
    Write-Host "   → $($foundImages[$img].Count) dosyada bulundu" -ForegroundColor Gray
    Write-Host "   → $($foundImages[$img] -join ', ')" -ForegroundColor DarkGray
}

Write-Host "`n⚠️  DİKKAT:`n" -ForegroundColor Yellow
Write-Host "Bu script sadece ANALİZ yapar. Image'ları otomatik silmez." -ForegroundColor White
Write-Host "`nDocura'dan manuel silme için:`n" -ForegroundColor Cyan

Write-Host "KULLANILMAYAN IMAGE'LARI SİLMEK İÇİN:" -ForegroundColor Yellow
Write-Host "`n1. GitHub Container Registry'ye gidin:" -ForegroundColor White
Write-Host "   https://github.com/orgs/cptsystems/packages" -ForegroundColor Cyan

Write-Host "`n2. Her image için:" -ForegroundColor White
foreach ($img in $UNUSED_IMAGES) {
    $repo = $img.Split('/')[-1].Split(':')[0]
    Write-Host "   - $repo paketini bulun" -ForegroundColor Gray
    Write-Host "   - 'Package settings' > 'Delete this package'" -ForegroundColor Gray
}

Write-Host "`n3. VEYA GitHub CLI ile:" -ForegroundColor White
Write-Host "   gh api delete /orgs/cptsystems/packages/container/[IMAGE_NAME]/versions/[VERSION_ID]" -ForegroundColor Cyan
Write-Host "   (Önce package listesini alın: gh api /orgs/cptsystems/packages)" -ForegroundColor DarkGray

Write-Host "`n✅ ANALİZ TAMAMLANDI!`n" -ForegroundColor Green

