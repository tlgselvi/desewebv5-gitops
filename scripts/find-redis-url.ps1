# REDIS_URL Finder Script
# REDIS_URL'i farklı yerlerden bulmaya çalışır

Write-Host "`n=== REDIS_URL Finder ===" -ForegroundColor Cyan
Write-Host "REDIS_URL'i farklı kaynaklardan arıyor...`n" -ForegroundColor Yellow

$found = $false

# 1. .env dosyasından kontrol et
Write-Host "1. .env dosyası kontrol ediliyor..." -ForegroundColor Yellow
if (Test-Path .env) {
    $envContent = Get-Content .env | Select-String "REDIS_URL"
    if ($envContent) {
        Write-Host "   ✅ .env dosyasında REDIS_URL bulundu:" -ForegroundColor Green
        Write-Host "   $envContent" -ForegroundColor White
        Write-Host "   ⚠️ Bu development ortamı için olabilir, production bilgilerini kontrol edin!`n" -ForegroundColor Yellow
        $found = $true
    } else {
        Write-Host "   ❌ .env dosyasında REDIS_URL bulunamadı`n" -ForegroundColor Red
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
        $secretOutput = kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.REDIS_URL}' 2>$null
        if ($secretOutput) {
            $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($secretOutput))
            Write-Host "   ✅ Kubernetes secret'tan REDIS_URL bulundu:" -ForegroundColor Green
            Write-Host "   $decoded`n" -ForegroundColor White
            $found = $true
        } else {
            Write-Host "   ❌ Kubernetes secret'ta REDIS_URL bulunamadı`n" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ⚠️ Kubernetes secret'a erişilemedi: $_`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ kubectl bulunamadı, Kubernetes kontrol edilemedi`n" -ForegroundColor Yellow
}

# 3. Environment variable kontrolü
Write-Host "3. Environment variable kontrol ediliyor..." -ForegroundColor Yellow
if ($env:REDIS_URL) {
    Write-Host "   ✅ Environment variable'da REDIS_URL bulundu:" -ForegroundColor Green
    Write-Host "   $env:REDIS_URL`n" -ForegroundColor White
    $found = $true
} else {
    Write-Host "   ❌ Environment variable'da REDIS_URL bulunamadı`n" -ForegroundColor Red
}

# 4. Docker Compose kontrolü
Write-Host "4. Docker Compose kontrol ediliyor..." -ForegroundColor Yellow
if (Test-Path docker-compose.yml) {
    $dockerComposeContent = Get-Content docker-compose.yml -Raw
    if ($dockerComposeContent -match "REDIS_URL|redis:") {
        Write-Host "   ✅ Docker Compose'da Redis bulundu" -ForegroundColor Green
        $redisService = $dockerComposeContent | Select-String -Pattern "redis:" -Context 5,5
        if ($redisService) {
            Write-Host "   ⚠️ Bu development için, production bilgilerini kontrol edin!" -ForegroundColor Yellow
            Write-Host "   Örnek (development): redis://redis:6379`n" -ForegroundColor Gray
            $found = $true
        }
    } else {
        Write-Host "   ❌ Docker Compose'da Redis bulunamadı`n" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ docker-compose.yml dosyası bulunamadı`n" -ForegroundColor Red
}

# Özet
Write-Host "=== Özet ===" -ForegroundColor Cyan
if ($found) {
    Write-Host "✅ REDIS_URL bulundu (yukarıdaki kaynaklardan birinde)" -ForegroundColor Green
    Write-Host "⚠️ Production bilgilerini sistem yöneticisinden doğrulayın!`n" -ForegroundColor Yellow
} else {
    Write-Host "❌ REDIS_URL bulunamadı`n" -ForegroundColor Red
    Write-Host "📋 REDIS_URL'i bulmak için:" -ForegroundColor Cyan
    Write-Host "   1. Sistem yöneticisine sorun (production Redis bilgileri)" -ForegroundColor White
    Write-Host "   2. DevOps ekibi ile iletişime geçin" -ForegroundColor White
    Write-Host "   3. REDIS_URL oluşturmak için:" -ForegroundColor White
    Write-Host "      .\scripts\build-redis-url.ps1`n" -ForegroundColor Gray
}

Write-Host "📚 Detaylı bilgi: docs/FIND_REDIS_URL.md`n" -ForegroundColor Cyan

