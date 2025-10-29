# ===============================================
# GitHub Container Registry - Unused Images Delete Script
# PowerShell Version
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🗑️  KULLANILMAYAN IMAGE'LARI SİLİYOR...`n" -ForegroundColor Cyan

# Kullanılmayan image'lar
$UNUSED_IMAGES = @(
    "aiops-trainer",
    "observer"
)

# GitHub org
$ORG = "cptsystems"

Write-Host "⚠️  DİKKAT: Bu işlem GERİ ALINAMAZ!`n" -ForegroundColor Yellow
Write-Host "Silinecek image'lar:" -ForegroundColor White
foreach ($img in $UNUSED_IMAGES) {
    Write-Host "  - ghcr.io/$ORG/$img" -ForegroundColor Yellow
}

Write-Host ""
$confirm = Read-Host "Devam etmek istiyor musunuz? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "İptal edildi." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🔍 Package listesi alınıyor... Pamet: " -ForegroundColor Cyan

# GitHub CLI kontrolü
try {
    $ghVersion = gh --version 2>&1
    Write-Host "✅ GitHub CLI bulundu" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI bulunamadı. Lütfen yükleyin:" -ForegroundColor Red
    Write-Host "   winget install --id GitHub.cli" -ForegroundColor Cyan
    exit 1
}

# Her image için package bilgilerini al ve sil
foreach ($img in $UNUSED_IMAGES) {
    Write-Host "`n📦 $img paketi kontrol ediliyor..." -ForegroundColor Cyan
    
    # Package bilgilerini al
    try {
        $packages = gh api "/orgs/$ORG/packages?package_type=container" 2>&1 | ConvertFrom-Json
        $package = $packages | Where-Object { $_.name -eq $img }
        
        if (-not $package) {
            Write-Host "   ⚠️  Paket bulunamadı veya zaten silinmiş: $img" -ForegroundColor Yellow
            continue
        }
        
        Write-Host "   ✅ Paket bulundu: $($package.name) (ID: $($package.id))" -ForegroundColor Green
        
        # Versiyon listesi al
        try {
            $versions = gh api "/orgs/$ORG/packages/container/$img/versions" 2>&1 | ConvertFrom-Json
            
            if (-not $versions) {
                Write-Host "   ⚠️  Versiyon bulunamadı" -ForegroundColor Yellow
                continue
            }
            
            Write-Host "   📋 Bulunan versiyonlar:" -ForegroundColor White
            $versionCount = 0
            foreach ($version in $versions) {
                $versionCount++
                Write-Host "      - Version ID: $($version.id) ($($version.name))" -ForegroundColor Gray
            }
            
            Write-Host "`n   🗑️  Tüm versiyonlar siliniyor..." -ForegroundColor Yellow
            
            foreach ($version in $versions) {
                Write-Host "      Siliniyor: $($version.id)" -ForegroundColor Gray
                try {
                    gh api -X DELETE "/orgs/$ORG/packages/container/$img/versions/$($version.id)" 2>&1 | seiçilmeOut-Null
                    Write-Host "      ✅ Silindi: $($version.id)" -ForegroundColor Green
                } catch {
                    Write-Host "      ❌ Silinemedi: $($version.id) - $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            Write-Host "   ✅ $img paketi temizlendi!" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Versiyon listesi alınamadı: $($_.Exception.Message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Paket bilgisi alınamadı: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   💡 GitHub CLI ile login olduğunuzdan emin olun: gh auth login" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 TEMİZLEME TAMAMLANDI!`n" -ForegroundColor Green
Write-Host "📋 Kontrol için:" -ForegroundColor Cyan
Write-Host "   gh api /orgs/$ORG/packages?package_type=container" -ForegroundColor White
Write-Host ""

