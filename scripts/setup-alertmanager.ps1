# DESE JARVIS Alertmanager Setup Script
# EA Plan Master Control v6.7.0

Write-Host "🚨 Setting up Prometheus Alertmanager..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if docker-compose.yml exists
$composeFile = "deploy/monitoring/docker-compose.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "❌ docker-compose.yml not found at $composeFile" -ForegroundColor Red
    exit 1
}

# Check if alertmanager.yml exists
$alertmanagerConfig = "deploy/monitoring/alertmanager.yml"
if (-not (Test-Path $alertmanagerConfig)) {
    Write-Host "❌ alertmanager.yml not found at $alertmanagerConfig" -ForegroundColor Red
    exit 1
}

# Start Alertmanager
Write-Host "Starting Alertmanager container..." -ForegroundColor Yellow
try {
    docker compose -f $composeFile up -d alertmanager 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Alertmanager container started" -ForegroundColor Green
        
        # Wait for Alertmanager to be ready
        Write-Host "Waiting for Alertmanager to be ready..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
        
        # Check Alertmanager health
        $maxRetries = 10
        $retryCount = 0
        
        while ($retryCount -lt $maxRetries) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:9093" -TimeoutSec 3 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ Alertmanager is running at http://localhost:9093" -ForegroundColor Green
                    break
                }
            } catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor Gray
                    Start-Sleep -Seconds 2
                } else {
                    Write-Host "⚠️  Alertmanager may still be starting. Please check manually." -ForegroundColor Yellow
                    Write-Host "   Check logs: docker logs dese-alertmanager" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "⚠️  Alertmanager container may already be running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start Alertmanager: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check Docker logs: docker logs dese-alertmanager" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📊 Alertmanager Configuration:" -ForegroundColor Cyan
Write-Host "  • URL: http://localhost:9093" -ForegroundColor White
Write-Host "  • Config: deploy/monitoring/alertmanager.yml" -ForegroundColor White
Write-Host "  • Alert Rules: deploy/monitoring/prometheus/alert.rules.yml" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Verify Alertmanager:" -ForegroundColor Yellow
Write-Host "  • Health: http://localhost:9093/-/healthy" -ForegroundColor White
Write-Host "  • Status: http://localhost:9093/#/status" -ForegroundColor White
Write-Host "  • Alerts: http://localhost:9093/#/alerts" -ForegroundColor White
Write-Host ""

Write-Host "📝 Alert Rules Configured:" -ForegroundColor Cyan
Write-Host "  • WebSocketConnectionsDown (critical)" -ForegroundColor White
Write-Host "  • HighWebSocketLatency (warning)" -ForegroundColor White
Write-Host "  • RedisStreamLagHigh (warning)" -ForegroundColor White
Write-Host "  • PrometheusTargetDown (critical)" -ForegroundColor White
Write-Host "  • HighErrorRate (warning)" -ForegroundColor White
Write-Host "  • BackendDown (critical)" -ForegroundColor White
Write-Host "  • RedisConnectionFailure (critical)" -ForegroundColor White
Write-Host ""

Write-Host "✅ Alertmanager setup complete!" -ForegroundColor Green
Write-Host ""

