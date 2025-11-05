# Docker Hub Login Script
# Bu script'i çalıştırmadan önce şifrenizi aşağıdaki $DOCKER_PASSWORD değişkenine yazın

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "tlgselvi",
    
    [Parameter(Mandatory=$false)]
    [string]$Password = ""
)

Write-Host "`n=== Docker Hub Login ===" -ForegroundColor Cyan

if ([string]::IsNullOrEmpty($Password)) {
    Write-Host "`nŞifre boş! Şifrenizi girin:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if ([string]::IsNullOrEmpty($Password)) {
    Write-Host "❌ Şifre girilmedi!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDocker Hub'a login yapılıyor..." -ForegroundColor Yellow

try {
    $Password | docker login -u $Username --password-stdin 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Login başarılı!" -ForegroundColor Green
        Write-Host "`nArtık push işlemini yapabilirsiniz:" -ForegroundColor Cyan
        Write-Host "  docker push tlgselvi/dese-ea-plan-v5:fix" -ForegroundColor White
    } else {
        Write-Host "❌ Login başarısız! Şifrenizi kontrol edin." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
    exit 1
}

