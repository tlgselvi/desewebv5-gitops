# Secret Generator Script
# Güçlü random secret oluşturur

param(
    [Parameter(Mandatory=$true)]
    [string]$SecretName,
    
    [int]$Length = 64
)

Write-Host "`n=== Secret Generator ===" -ForegroundColor Cyan
Write-Host "Secret Name: $SecretName" -ForegroundColor Yellow
Write-Host "Length: $Length`n" -ForegroundColor Yellow

# Karakter seti (harfler, sayılar, özel karakterler)
$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

# Random string oluştur
$random = New-Object System.Random
$secret = -join (1..$Length | ForEach-Object { $chars[$random.Next($chars.Length)] })

Write-Host "Oluşturulan Secret:" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host $secret -ForegroundColor White
Write-Host "====================`n" -ForegroundColor Green

Write-Host "📋 GitHub'a eklemek için:" -ForegroundColor Cyan
Write-Host "1. GitHub Repository > Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "2. 'New repository secret' butonuna tıklayın" -ForegroundColor White
Write-Host "3. Name: $SecretName" -ForegroundColor White
Write-Host "4. Secret: Yukarıdaki secret değerini yapıştırın`n" -ForegroundColor White

Write-Host "💡 Secret'ı panoya kopyalamak için:" -ForegroundColor Cyan
Write-Host "   Yukarıdaki secret değerini seçin ve Ctrl+C ile kopyalayın`n" -ForegroundColor White

# Panoya kopyala (isteğe bağlı)
$copyToClipboard = Read-Host "Secret'ı panoya kopyalamak ister misiniz? (y/n)"
if ($copyToClipboard -eq 'y' -or $copyToClipboard -eq 'Y') {
    Set-Clipboard -Value $secret
    Write-Host "✅ Secret panoya kopyalandı!`n" -ForegroundColor Green
}

Write-Host "⚠️ Güvenlik Uyarısı:" -ForegroundColor Yellow
Write-Host "   Bu secret'ı güvenli bir yerde saklayın!" -ForegroundColor Yellow
Write-Host "   Secret'ı asla kod içinde veya log'larda göstermeyin!`n" -ForegroundColor Yellow

