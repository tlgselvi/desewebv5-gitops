# DATABASE_URL Finder Script
# DATABASE_URL'i farklı yerlerden bulmaya çalışır

Write-Host "`n=== DATABASE_URL Finder ===" -ForegroundColor Cyan
Write-Host "DATABASE_URL'i farklı kaynaklardan arıyor...`n" -ForegroundColor Yellow

$found = $false

# 1. .env dosyasından kontrol et
Write-Host "1. .env dosyası kontrol ediliyor..." -ForegroundColor Yellow
if (Test-Path .env) {
    $envContent = Get-Content .env | Select-String "DATABASE_URL"
    if ($envContent) {
        Write-Host "   ✅ .env dosyasında DATABASE_URL bulundu:" -ForegroundColor Green
        Write-Host "   $envContent" -ForegroundColor White
        Write-Host "   ⚠️ Bu development ortamı için olabilir, production bilgilerini kontrol edin!`n" -ForegroundColor Yellow
        $found = $true
    } else {
        Write-Host "   ❌ .env dosyasında DATABASE_URL bulunamadı`n" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ .env dosyası bulunamadı`n" -ForegroundColor Red
}

# 2. Kubernetes secrets kontrolü
Write-Host "2. Kubernetes secrets kontrol ediliyor..." -ForegroundColor Yellow
$kubectlExists = Get-Command kubectl -ErrorAction SilentlyContinue
if ($kubectlExists) {
    Write-Host "   ℹ️ kubectl mevcut, secrets kontrol ediliyor..." -ForegroundColor Cyan
    try {
        $secretOutput = kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.DATABASE_URL}' 2>$null
        if ($secretOutput) {
            $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($secretOutput))
            Write-Host "   ✅ Kubernetes secret'tan DATABASE_URL bulundu:" -ForegroundColor Green
            Write-Host "   $decoded`n" -ForegroundColor White
            $found = $true
        } else {
            Write-Host "   ❌ Kubernetes secret'ta DATABASE_URL bulunamadı`n" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ⚠️ Kubernetes secret'a erişilemedi: $_`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ kubectl bulunamadı, Kubernetes kontrol edilemedi`n" -ForegroundColor Yellow
}

# 3. Environment variable kontrolü
Write-Host "3. Environment variable kontrol ediliyor..." -ForegroundColor Yellow
if ($env:DATABASE_URL) {
    Write-Host "   ✅ Environment variable'da DATABASE_URL bulundu:" -ForegroundColor Green
    Write-Host "   $env:DATABASE_URL`n" -ForegroundColor White
    $found = $true
} else {
    Write-Host "   ❌ Environment variable'da DATABASE_URL bulunamadı`n" -ForegroundColor Red
}

# Özet
Write-Host "=== Özet ===" -ForegroundColor Cyan
if ($found) {
    Write-Host "✅ DATABASE_URL bulundu (yukarıdaki kaynaklardan birinde)" -ForegroundColor Green
    Write-Host "⚠️ Production bilgilerini sistem yöneticisinden doğrulayın!`n" -ForegroundColor Yellow
} else {
    Write-Host "❌ DATABASE_URL bulunamadı`n" -ForegroundColor Red
    Write-Host "📋 DATABASE_URL'i bulmak için:" -ForegroundColor Cyan
    Write-Host "   1. Sistem yöneticisine sorun (production database bilgileri)" -ForegroundColor White
    Write-Host "   2. DevOps ekibi ile iletişime geçin" -ForegroundColor White
    Write-Host "   3. DATABASE_URL oluşturmak için:" -ForegroundColor White
    Write-Host "      .\scripts\build-database-url.ps1`n" -ForegroundColor Gray
}

Write-Host "📚 Detaylı bilgi: docs/FIND_DATABASE_URL.md`n" -ForegroundColor Cyan

