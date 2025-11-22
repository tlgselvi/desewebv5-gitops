# DATABASE_URL Builder Script
# Kullanıcıdan bilgi alarak DATABASE_URL oluşturur

Write-Host "`n=== DATABASE_URL Builder ===" -ForegroundColor Cyan
Write-Host "Production database connection bilgilerini girin:`n" -ForegroundColor Yellow

# Bilgileri kullanıcıdan al
$host = Read-Host "Database Host (örn: db.poolfab.com.tr veya 10.0.0.100)"
$port = Read-Host "Database Port (varsayılan: 5432)"
if ([string]::IsNullOrEmpty($port)) {
    $port = "5432"
}

$database = Read-Host "Database Name (örn: dese_ea_plan_v5)"
$username = Read-Host "Database Username"
$password = Read-Host "Database Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# SSL mode sorusu
Write-Host "`nSSL Mode (varsayılan: require):" -ForegroundColor Yellow
Write-Host "  1. disable" -ForegroundColor White
Write-Host "  2. require (önerilen production için)" -ForegroundColor White
Write-Host "  3. verify-full" -ForegroundColor White
$sslModeChoice = Read-Host "Seçiminiz (1-3, varsayılan: 2)"
switch ($sslModeChoice) {
    "1" { $sslMode = "disable" }
    "3" { $sslMode = "verify-full" }
    default { $sslMode = "require" }
}

# Password'u URL encode et (özel karakterler için)
$passwordEncoded = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

# DATABASE_URL oluştur
if ($sslMode -eq "require" -or $sslMode -eq "verify-full") {
    $databaseUrl = "postgresql://${username}:${passwordEncoded}@${host}:${port}/${database}?sslmode=${sslMode}"
} else {
    $databaseUrl = "postgresql://${username}:${passwordEncoded}@${host}:${port}/${database}"
}

Write-Host "`n=== Oluşturulan DATABASE_URL ===" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Gray
Write-Host $databaseUrl -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Gray

# Güvenlik uyarısı
Write-Host "⚠️ Güvenlik Uyarısı:" -ForegroundColor Yellow
Write-Host "   - Bu URL'i asla kod içinde veya log'larda göstermeyin!" -ForegroundColor White
Write-Host "   - Sadece GitHub Secrets'da saklayın.`n" -ForegroundColor White

# GitHub'a ekleme talimatları
Write-Host "📋 GitHub'a eklemek için:" -ForegroundColor Cyan
Write-Host "1. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "2. 'New repository secret' butonuna tıklayın" -ForegroundColor White
Write-Host "3. Name: DATABASE_URL" -ForegroundColor White
Write-Host "4. Secret: Yukarıdaki DATABASE_URL'i kopyalayın`n" -ForegroundColor White

# Panoya kopyalama seçeneği
$copyToClipboard = Read-Host "DATABASE_URL'i panoya kopyalamak ister misiniz? (y/n)"
if ($copyToClipboard -eq 'y' -or $copyToClipboard -eq 'Y') {
    Set-Clipboard -Value $databaseUrl
    Write-Host "✅ DATABASE_URL panoya kopyalandı!`n" -ForegroundColor Green
}

# Password'u memory'den temizle
$passwordPlain = $null
$passwordEncoded = $null
[System.GC]::Collect()

Write-Host "💡 İpucu: Bu bilgileri güvenli bir yerde saklayın." -ForegroundColor Cyan
Write-Host "   DATABASE_URL'i kaybettiyseniz, bu script'i tekrar çalıştırabilirsiniz.`n" -ForegroundColor White

