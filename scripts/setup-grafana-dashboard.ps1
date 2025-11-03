# DESE JARVIS Grafana Dashboard Setup
# EA Plan Master Control v6.7.0

Write-Host "🧭 Grafana Dashboard Setup" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "  ✅ Docker is running`n" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker is not running. Please start Docker Desktop.`n" -ForegroundColor Red
    exit 1
}

# Start Grafana and Prometheus
Write-Host "Step 2: Starting monitoring containers..." -ForegroundColor Yellow
$composeFile = "deploy/monitoring/docker-compose.yml"

if (-not (Test-Path $composeFile)) {
    Write-Host "  ❌ docker-compose.yml not found at $composeFile`n" -ForegroundColor Red
    exit 1
}

try {
    docker compose -f $composeFile up -d grafana prometheus 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Containers started successfully`n" -ForegroundColor Green
        
        # Wait for services to be ready
        Write-Host "  Waiting for services to be ready..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    } else {
        Write-Host "  ⚠️  Containers may already be running`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Failed to start containers: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Validate Prometheus configuration
Write-Host "Step 3: Validating Prometheus configuration..." -ForegroundColor Yellow
$prometheusConfig = "deploy/monitoring/prometheus.yml"

if (Test-Path $prometheusConfig) {
    $configContent = Get-Content $prometheusConfig -Raw
    
    if ($configContent -match "localhost:3001" -or $configContent -match "host.docker.internal:3001") {
        Write-Host "  ✅ Prometheus scrape target configured (localhost:3001)`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Prometheus scrape target may need update`n" -ForegroundColor Yellow
        Write-Host "     Check: $prometheusConfig`n" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️  Prometheus config file not found: $prometheusConfig`n" -ForegroundColor Yellow
}

# Wait for Grafana to be ready
Write-Host "Step 4: Waiting for Grafana to be ready..." -ForegroundColor Yellow
$grafanaUrl = "http://localhost:3000/api/health"
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri $grafanaUrl -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Grafana is ready`n" -ForegroundColor Green
            break
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "  Waiting... ($retryCount/$maxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        } else {
            Write-Host "  ⚠️  Grafana may still be starting. Please check manually.`n" -ForegroundColor Yellow
        }
    }
}

# Create dashboard via API
Write-Host "Step 5: Creating Realtime Metrics Dashboard..." -ForegroundColor Yellow

$dashboardJson = @"
{
  "dashboard": {
    "id": null,
    "uid": "realtime-metrics",
    "title": "EA Plan Master Control - Realtime Metrics",
    "tags": ["realtime", "websocket", "redis-streams", "dese"],
    "timezone": "browser",
    "refresh": "5s",
    "panels": [
      {
        "id": 1,
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "type": "graph",
        "title": "WebSocket Connections",
        "targets": [{"expr": "ws_connections", "refId": "A", "legendFormat": "Active Connections"}],
        "xaxis": {"mode": "time"},
        "yaxes": [{"format": "short", "label": "Connections"}, {}],
        "lines": true,
        "linewidth": 2
      },
      {
        "id": 2,
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "type": "graph",
        "title": "WebSocket Broadcast Rate",
        "targets": [{"expr": "rate(ws_broadcast_total[5m])", "refId": "A", "legendFormat": "Broadcasts/sec"}],
        "xaxis": {"mode": "time"},
        "yaxes": [{"format": "ops", "label": "Rate"}, {}],
        "lines": true,
        "linewidth": 2
      },
      {
        "id": 3,
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "type": "graph",
        "title": "WebSocket Latency (p95 RTT)",
        "targets": [
          {"expr": "histogram_quantile(0.95, sum(rate(ws_latency_seconds_bucket[5m])) by (le))", "refId": "A", "legendFormat": "p95"},
          {"expr": "histogram_quantile(0.50, sum(rate(ws_latency_seconds_bucket[5m])) by (le))", "refId": "B", "legendFormat": "p50"}
        ],
        "xaxis": {"mode": "time"},
        "yaxes": [{"format": "s", "label": "Latency"}, {}],
        "lines": true,
        "linewidth": 2
      },
      {
        "id": 4,
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "type": "table",
        "title": "Redis Stream Consumer Lag",
        "targets": [{"expr": "stream_consumer_lag", "refId": "A", "format": "table", "instant": true}]
      }
    ],
    "time": {"from": "now-15m", "to": "now"}
  },
  "overwrite": true
}
"@

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $credPair = "admin:admin"
    $encodedCreds = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($credPair))
    $headers["Authorization"] = "Basic $encodedCreds"
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboards/db" `
        -Method Post `
        -Headers $headers `
        -Body $dashboardJson `
        -ErrorAction Stop
    
    Write-Host "  ✅ Dashboard created successfully`n" -ForegroundColor Green
    Write-Host "     Dashboard UID: $($response.uid)" -ForegroundColor Gray
    Write-Host "     Dashboard URL: http://localhost:3000/d/$($response.uid)`n" -ForegroundColor Gray
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ⚠️  Authentication failed. Using default admin/admin credentials." -ForegroundColor Yellow
        Write-Host "     Dashboard may need to be created manually via Grafana UI.`n" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "  ⚠️  Grafana API not available. Dashboard will be provisioned on next Grafana start.`n" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  Failed to create dashboard via API: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "     Dashboard file is available at: deploy/monitoring/grafana/dashboards/realtime-metrics.json`n" -ForegroundColor Gray
    }
}

# Summary
Write-Host "===========================" -ForegroundColor Cyan
Write-Host "📊 Setup Summary" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Monitoring Stack:" -ForegroundColor Green
Write-Host "   • Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "   • Grafana: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Grafana Credentials:" -ForegroundColor Yellow
Write-Host "   • Username: admin" -ForegroundColor White
Write-Host "   • Password: admin" -ForegroundColor White
Write-Host ""
Write-Host "📈 Dashboard:" -ForegroundColor Yellow
Write-Host "   • Name: EA Plan Master Control - Realtime Metrics" -ForegroundColor White
Write-Host "   • UID: realtime-metrics" -ForegroundColor White
Write-Host "   • URL: http://localhost:3000/d/realtime-metrics" -ForegroundColor White
Write-Host ""
Write-Host "📊 Metrics Tracked:" -ForegroundColor Yellow
Write-Host "   • ws_connections (WebSocket active connections)" -ForegroundColor White
Write-Host "   • ws_broadcast_total (Total broadcast events)" -ForegroundColor White
Write-Host "   • ws_latency_seconds (RTT latency distribution)" -ForegroundColor White
Write-Host "   • stream_consumer_lag (Redis Stream consumer lag)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Ensure backend is running on http://localhost:3001" -ForegroundColor White
Write-Host "   2. Verify Prometheus is scraping: http://localhost:9090/targets" -ForegroundColor White
Write-Host "   3. Open Grafana dashboard: http://localhost:3000/d/realtime-metrics" -ForegroundColor White
Write-Host ""

