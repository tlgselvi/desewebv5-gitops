# BASIT Docker Hub Login Script
# KULLANIM: Bu dosyayı açın, şifrenizi aşağıdaki satıra yazın, sonra çalıştırın

$DOCKER_USERNAME = "tlgselvi"
$DOCKER_PASSWORD = "Xm=+S`$JMK7^8.UM"  # <-- ŞİFRENİZİ BURAYA YAZIN

Write-Host "`n=== Docker Hub Login ===" -ForegroundColor Cyan

if ($DOCKER_PASSWORD -eq "BURAYA_ŞİFRENİZİ_YAZIN") {
    Write-Host "`n❌ HATA: Şifrenizi script içine yazmanız gerekiyor!" -ForegroundColor Red
    Write-Host "`nscripts/docker-login-simple.ps1 dosyasını açın" -ForegroundColor Yellow
    Write-Host "ve 5. satırdaki 'BURAYA_ŞİFRENİZİ_YAZIN' kısmını" -ForegroundColor Yellow
    Write-Host "gerçek şifrenizle değiştirin." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nDocker Hub'a login yapılıyor..." -ForegroundColor Yellow

$DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Login başarılı!" -ForegroundColor Green
    Write-Host "`nArtık push işlemini yapabilirsiniz:" -ForegroundColor Cyan
    Write-Host "  docker push tlgselvi/dese-ea-plan-v5:fix" -ForegroundColor White
} else {
    Write-Host "`n❌ Login başarısız! Şifrenizi kontrol edin." -ForegroundColor Red
}

