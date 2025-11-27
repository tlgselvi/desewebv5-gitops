$maxRetries = 30
$retryCount = 0
$healthy = $false

Write-Host "⏳ Waiting for Database to be ready..." -ForegroundColor Yellow

while (-not $healthy -and $retryCount -lt $maxRetries) {
    $status = docker inspect --format='{{.State.Health.Status}}' desewebv5-db-1 2>$null
    
    if ($status -eq "healthy") {
        $healthy = $true
        Write-Host "✅ Database is ready!" -ForegroundColor Green
    } else {
        Write-Host "   Waiting... ($status)"
        Start-Sleep -Seconds 5
        $retryCount++
    }
}

if ($healthy) {
    Write-Host "🌱 Starting Data Seeding..." -ForegroundColor Cyan
    try {
        pnpm db:seed:data
        Write-Host "✅ Seeding completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Seeding failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Timeout waiting for database!" -ForegroundColor Red
    exit 1
}

