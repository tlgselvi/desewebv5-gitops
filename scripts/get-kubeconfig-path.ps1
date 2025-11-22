# Kubeconfig Path Helper Script
# Kubeconfig dosyasının yerini bulur ve gösterir

Write-Host "`n=== Kubeconfig Path Helper ===" -ForegroundColor Cyan

# Windows'ta yaygın kubeconfig konumları
$possiblePaths = @(
    "$env:USERPROFILE\.kube\config",
    "$env:KUBECONFIG",
    "$env:HOME\.kube\config",
    "C:\Users\$env:USERNAME\.kube\config"
)

Write-Host "`n🔍 Kubeconfig dosyası aranıyor...`n" -ForegroundColor Yellow

$found = $false
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "✅ Kubeconfig bulundu: $path" -ForegroundColor Green
        $found = $true
        
        # Dosya bilgileri
        $fileInfo = Get-Item $path
        Write-Host "   Dosya Boyutu: $($fileInfo.Length) bytes" -ForegroundColor Cyan
        Write-Host "   Son Değiştirilme: $($fileInfo.LastWriteTime)" -ForegroundColor Cyan
        
        # Kubeconfig içeriği kontrolü
        Write-Host "`n   İçerik kontrol ediliyor..." -ForegroundColor Yellow
        try {
            $content = Get-Content $path -Raw -ErrorAction Stop
            if ($content -match "apiVersion:\s*v1" -and $content -match "kind:\s*Config") {
                Write-Host "   ✅ Geçerli kubeconfig formatı" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ Geçersiz kubeconfig formatı" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ Dosya okunamadı: $_" -ForegroundColor Red
        }
        
        Write-Host "`n📋 GitHub'a eklemek için:" -ForegroundColor Cyan
        Write-Host "   1. Dosyayı açın: notepad `"$path`"" -ForegroundColor White
        Write-Host "   2. Tüm içeriği kopyalayın (Ctrl+A, Ctrl+C)" -ForegroundColor White
        Write-Host "   3. GitHub Repository > Settings > Secrets > Actions" -ForegroundColor White
        Write-Host "   4. Name: KUBECONFIG_PRODUCTION" -ForegroundColor White
        Write-Host "   5. Secret: Kopyaladığınız içeriği yapıştırın`n" -ForegroundColor White
        
        # KUBECONFIG env var kontrolü
        if ($env:KUBECONFIG) {
            Write-Host "⚠️ KUBECONFIG environment variable tanımlı: $env:KUBECONFIG" -ForegroundColor Yellow
            Write-Host "   Bu değer yukarıdaki dosyadan önce kontrol edilir.`n" -ForegroundColor Yellow
        }
        
        break
    }
}

if (-not $found) {
    Write-Host "❌ Kubeconfig dosyası bulunamadı!" -ForegroundColor Red
    Write-Host "`n📋 Yaygın konumlar:" -ForegroundColor Cyan
    foreach ($path in $possiblePaths) {
        Write-Host "   - $path" -ForegroundColor White
    }
    Write-Host "`n💡 Kubeconfig dosyanızın yerini biliyorsanız:" -ForegroundColor Yellow
    Write-Host "   .\scripts\validate-kubeconfig.ps1 -Path `"C:\path\to\kubeconfig`"`n" -ForegroundColor White
}

