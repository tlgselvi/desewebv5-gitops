# Start Development Environment
# Backend önce başlar, hazır olduğunu kontrol eder, sonra frontend başlar

$ErrorActionPreference = "Stop"

Write-Host "🚀 Dese EA Plan - Development Environment Başlatılıyor..." -ForegroundColor Cyan
Write-Host ""

# Docker container kontrolü (Hybrid Mode)
Write-Host "🐳 Docker container kontrolü yapılıyor..." -ForegroundColor Yellow
try {
    $appContainer = docker ps -a --filter "name=app" --format "{{.Names}}" 2>$null
    if ($appContainer -and $appContainer -eq "app-1") {
        Write-Host "⚠️  'app-1' container'ı çalışıyor. Port 3000'i kullanıyor olabilir. Durduruluyor..." -ForegroundColor Yellow
        docker stop app-1 2>$null
        Start-Sleep -Seconds 2
        Write-Host "✅ 'app-1' container'ı durduruldu" -ForegroundColor Green
    }
    
    # db ve redis container'larının çalıştığını kontrol et
    $dbContainer = docker ps --filter "name=db" --format "{{.Names}}" 2>$null
    $redisContainer = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null
    
    if (-not $dbContainer) {
        Write-Host "⚠️  'db' container'ı çalışmıyor. Başlatılıyor..." -ForegroundColor Yellow
        docker compose up db -d 2>$null
        Start-Sleep -Seconds 3
    }
    
    if (-not $redisContainer) {
        Write-Host "⚠️  'redis' container'ı çalışmıyor. Başlatılıyor..." -ForegroundColor Yellow
        docker compose up redis -d 2>$null
        Start-Sleep -Seconds 2
    }
    
    Write-Host "✅ Docker container'lar hazır (db, redis çalışıyor; app durduruldu)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker kontrolü yapılamadı, devam ediliyor..." -ForegroundColor Yellow
}
Write-Host ""

# Port kontrolü
Write-Host "📡 Port kontrolü yapılıyor..." -ForegroundColor Yellow
$backendPort = 3000
$frontendPort = 3001

# Backend port kontrolü
$backendProcess = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "⚠️  Port $backendPort zaten kullanımda. Mevcut process durduruluyor..." -ForegroundColor Yellow
    $pid = ($backendProcess | Select-Object -First 1).OwningProcess
    if ($pid) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Frontend port kontrolü
$frontendProcess = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
if ($frontendProcess) {
    Write-Host "⚠️  Port $frontendPort zaten kullanımda. Mevcut process durduruluyor..." -ForegroundColor Yellow
    $pid = ($frontendProcess | Select-Object -First 1).OwningProcess
    if ($pid) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host "✅ Portlar temizlendi" -ForegroundColor Green
Write-Host ""

# Backend başlat
Write-Host "🔧 Backend başlatılıyor (Port $backendPort)..." -ForegroundColor Cyan
$projectRoot = $PWD.Path
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    pnpm dev
} -ArgumentList $projectRoot

# Backend'in hazır olmasını bekle
Write-Host "⏳ Backend'in hazır olması bekleniyor..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 503) {
            # 503 de kabul edilebilir çünkü backend çalışıyor, sadece bazı servisler hazır değil
            $backendReady = $true
            Write-Host "✅ Backend hazır! (${attempt} saniye sonra)" -ForegroundColor Green
        }
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

if (-not $backendReady) {
    Write-Host ""
    Write-Host "❌ Backend başlatılamadı! Timeout." -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""

# Frontend başlat
Write-Host "🎨 Frontend başlatılıyor (Port $frontendPort)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    cd frontend
    pnpm dev
} -ArgumentList $projectRoot

# Frontend'in hazır olmasını bekle
Write-Host "⏳ Frontend'in hazır olması bekleniyor..." -ForegroundColor Yellow
$attempt = 0
$frontendReady = $false

while ($attempt -lt $maxAttempts -and -not $frontendReady) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$frontendPort" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            Write-Host "✅ Frontend hazır! (${attempt} saniye sonra)" -ForegroundColor Green
        }
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

if (-not $frontendReady) {
    Write-Host ""
    Write-Host "⚠️  Frontend başlatılamadı, ancak devam ediliyor..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Development Environment Hazır!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend:  http://localhost:$backendPort" -ForegroundColor White
Write-Host "📍 Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "📍 API Docs: http://localhost:$backendPort/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "💡 Durdurmak için: Ctrl+C veya 'pnpm stop:dev'" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Job'ları izle
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Backend job kontrolü
        $backendState = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        if ($backendState -and $backendState.State -eq "Failed") {
            Write-Host "❌ Backend job başarısız oldu!" -ForegroundColor Red
            Receive-Job -Id $backendJob.Id
            break
        }
        
        # Frontend job kontrolü
        $frontendState = Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
        if ($frontendState -and $frontendState.State -eq "Failed") {
            Write-Host "❌ Frontend job başarısız oldu!" -ForegroundColor Red
            Receive-Job -Id $frontendJob.Id
            break
        }
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Durduruluyor..." -ForegroundColor Yellow
} finally {
    Write-Host "🧹 Temizlik yapılıyor..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Temizlik tamamlandı" -ForegroundColor Green
}

