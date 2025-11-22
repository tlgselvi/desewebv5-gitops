# REDIS_URL Builder Script
# Kullanıcıdan bilgi alarak REDIS_URL oluşturur

Write-Host "`n=== REDIS_URL Builder ===" -ForegroundColor Cyan
Write-Host "Production Redis connection bilgilerini girin:`n" -ForegroundColor Yellow

# Bilgileri kullanıcıdan al
$redisHost = Read-Host "Redis Host (örn: redis.poolfab.com.tr veya 10.0.0.100)"
$port = Read-Host "Redis Port (varsayılan: 6379)"
if ([string]::IsNullOrEmpty($port)) {
    $port = "6379"
}

# Password sorusu
$hasPassword = Read-Host "Password var mı? (y/n)"
$password = $null
$username = $null

if ($hasPassword -eq 'y' -or $hasPassword -eq 'Y') {
    # Username sorusu
    $hasUsername = Read-Host "Username var mı? (y/n)"
    
    if ($hasUsername -eq 'y' -or $hasUsername -eq 'Y') {
        $username = Read-Host "Username"
        $password = Read-Host "Password" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
        )
    } else {
        $password = Read-Host "Password" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
        )
    }
}

# Database number sorusu
$database = Read-Host "Database number (varsayılan: 0, boş bırakabilirsiniz)"
if ([string]::IsNullOrEmpty($database)) {
    $database = $null
}

# TLS/SSL sorusu
$useTLS = Read-Host "TLS/SSL kullanılıyor mu? (y/n, varsayılan: n)"

# Password'u URL encode et (özel karakterler için)
if ($passwordPlain) {
    $passwordEncoded = [System.Web.HttpUtility]::UrlEncode($passwordPlain)
} else {
    $passwordEncoded = $null
}

# REDIS_URL oluştur
if ($useTLS -eq 'y' -or $useTLS -eq 'Y') {
    $protocol = "rediss"
} else {
    $protocol = "redis"
}

if ($username -and $passwordEncoded) {
    # Username ve password var
    $redisUrl = "${protocol}://${username}:${passwordEncoded}@${redisHost}:${port}"
} elseif ($passwordEncoded) {
    # Sadece password var (username yok)
    $redisUrl = "${protocol}://:${passwordEncoded}@${redisHost}:${port}"
} else {
    # Password yok
    $redisUrl = "${protocol}://${redisHost}:${port}"
}

# Database number ekle (varsa)
if ($database -and [int]$database -ge 0) {
    $redisUrl = "${redisUrl}/${database}"
}

Write-Host "`n=== Oluşturulan REDIS_URL ===" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Gray
Write-Host $redisUrl -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Gray

# Güvenlik uyarısı
Write-Host "⚠️ Güvenlik Uyarısı:" -ForegroundColor Yellow
Write-Host "   - Bu URL'i asla kod içinde veya log'larda göstermeyin!" -ForegroundColor White
Write-Host "   - Sadece GitHub Secrets'da saklayın.`n" -ForegroundColor White

# GitHub'a ekleme talimatları
Write-Host "📋 GitHub'a eklemek için:" -ForegroundColor Cyan
Write-Host "1. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "2. 'New repository secret' butonuna tıklayın" -ForegroundColor White
Write-Host "3. Name: REDIS_URL" -ForegroundColor White
Write-Host "4. Secret: Yukarıdaki REDIS_URL'i kopyalayın`n" -ForegroundColor White

# Panoya kopyalama seçeneği
$copyToClipboard = Read-Host "REDIS_URL'i panoya kopyalamak ister misiniz? (y/n)"
if ($copyToClipboard -eq 'y' -or $copyToClipboard -eq 'Y') {
    Set-Clipboard -Value $redisUrl
    Write-Host "✅ REDIS_URL panoya kopyalandı!`n" -ForegroundColor Green
}

# Password'u memory'den temizle
if ($passwordPlain) {
    $passwordPlain = $null
    $passwordEncoded = $null
    [System.GC]::Collect()
}

Write-Host "💡 İpucu: Bu bilgileri güvenli bir yerde saklayın." -ForegroundColor Cyan
Write-Host "   REDIS_URL'i kaybettiyseniz, bu script'i tekrar çalıştırabilirsiniz.`n" -ForegroundColor White

