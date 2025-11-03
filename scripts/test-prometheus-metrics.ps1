# DESE JARVIS Prometheus Metric Validation Test
# EA Plan Master Control v6.7.0 - sprint/2.6-predictive-correlation

Write-Host "🔍 Prometheus Metrics Validation Test" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Test 1: Prometheus metrics endpoint
Write-Host "Test 1: Checking Prometheus metrics endpoint..." -ForegroundColor Yellow

try {
    $metricsUrl = "http://localhost:3001/metrics"
    $response = Invoke-WebRequest -Uri $metricsUrl -TimeoutSec 5 -ErrorAction Stop
    $metricsContent = $response.Content
    
    $metricsFound = @{
        "ws_connections" = $false
        "ws_broadcast_total" = $false
        "ws_latency_seconds" = $false
        "stream_consumer_lag" = $false
    }
    
    if ($metricsContent -match "ws_connections") {
        $metricsFound["ws_connections"] = $true
        Write-Host "  ✅ ws_connections found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ws_connections missing" -ForegroundColor Red
    }
    
    if ($metricsContent -match "ws_broadcast_total") {
        $metricsFound["ws_broadcast_total"] = $true
        Write-Host "  ✅ ws_broadcast_total found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ws_broadcast_total missing" -ForegroundColor Red
    }
    
    if ($metricsContent -match "ws_latency_seconds") {
        $metricsFound["ws_latency_seconds"] = $true
        Write-Host "  ✅ ws_latency_seconds found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ws_latency_seconds missing" -ForegroundColor Red
    }
    
    if ($metricsContent -match "stream_consumer_lag") {
        $metricsFound["stream_consumer_lag"] = $true
        Write-Host "  ✅ stream_consumer_lag found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ stream_consumer_lag missing" -ForegroundColor Red
    }
    
    $allFound = $metricsFound.Values | Where-Object { $_ -eq $true } | Measure-Object
    if ($allFound.Count -eq 4) {
        Write-Host "`n✅ All Prometheus metrics exported successfully`n" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Some metrics missing — check /src/config/prometheus.ts integration`n" -ForegroundColor Red
    }
    
    # Show sample metrics
    Write-Host "Sample metrics:" -ForegroundColor Cyan
    $sampleMetrics = $metricsContent -split "`n" | Select-String -Pattern "ws_|stream_consumer" | Select-Object -First 10
    foreach ($metric in $sampleMetrics) {
        Write-Host "  $($metric.ToString().Trim())" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "  ❌ Failed to connect to metrics endpoint: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     Make sure backend is running on http://localhost:3001`n" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline

# Test 2: Redis Streams check
Write-Host "Test 2: Checking Redis Streams..." -ForegroundColor Yellow

try {
    # Check if Redis is accessible
    $redisUrl = $env:REDIS_URL
    if (-not $redisUrl) {
        $redisUrl = "redis://localhost:6379"
    }
    
    # Try to use redis-cli if available
    $redisCli = Get-Command redis-cli -ErrorAction SilentlyContinue
    
    if ($redisCli) {
        Write-Host "  Using redis-cli..." -ForegroundColor Gray
        
        # Check for event streams
        $streams = @("finbot.events", "mubot.events", "dese.events")
        $activeStreams = 0
        
        foreach ($stream in $streams) {
            try {
                $streamInfo = redis-cli XINFO STREAM $stream 2>&1
                if ($LASTEXITCODE -eq 0 -and $streamInfo -match "length") {
                    $length = ($streamInfo | Select-String -Pattern "length:\s*(\d+)").Matches[0].Groups[1].Value
                    Write-Host "  ✅ $stream active (length: $length)" -ForegroundColor Green
                    $activeStreams++
                } else {
                    Write-Host "  ⚠️  $stream empty or not found" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ⚠️  $stream check failed" -ForegroundColor Yellow
            }
        }
        
        if ($activeStreams -gt 0) {
            Write-Host "`n✅ Redis Streams active ($activeStreams/$($streams.Count) streams)`n" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️  Redis Streams empty or misconfigured`n" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  redis-cli not found, skipping Redis Streams check" -ForegroundColor Yellow
        Write-Host "     Install Redis tools or use Docker container`n" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "  ⚠️  Redis Streams check skipped: $($_.Exception.Message)`n" -ForegroundColor Yellow
}

# Test 3: WebSocket connection test
Write-Host "Test 3: Testing WebSocket connection..." -ForegroundColor Yellow

$wsTestScript = @"
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws?token=test-token');

let connected = false;
let pongReceived = false;
const timeout = setTimeout(() => {
    if (!connected) {
        console.log('  ❌ WebSocket connection timeout');
        process.exit(1);
    }
    if (!pongReceived) {
        console.log('  ⚠️  WebSocket connected but ping/pong test incomplete');
        process.exit(0);
    }
}, 5000);

ws.on('open', () => {
    connected = true;
    console.log('  ✅ WebSocket connected');
    ws.ping();
});

ws.on('pong', () => {
    pongReceived = true;
    console.log('  ✅ WebSocket ping/pong OK');
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.log('  ❌ WebSocket error:', error.message);
    clearTimeout(timeout);
    process.exit(1);
});

ws.on('close', () => {
    if (!pongReceived) {
        console.log('  ⚠️  WebSocket closed before ping/pong test');
    }
    clearTimeout(timeout);
    process.exit(0);
});
"@

try {
    $testFile = "test-ws-connection.js"
    Set-Content -Path $testFile -Value $wsTestScript
    
    $nodeResult = node $testFile 2>&1
    Write-Host $nodeResult
    
    Remove-Item $testFile -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "  ⚠️  WebSocket test skipped: Node.js or ws package not available" -ForegroundColor Yellow
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
    
    # Cleanup
    if (Test-Path "test-ws-connection.js") {
        Remove-Item "test-ws-connection.js" -ErrorAction SilentlyContinue
    }
}

Write-Host "`n" -NoNewline

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All validation tests completed." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  • If metrics missing: Check src/config/prometheus.ts registration" -ForegroundColor White
Write-Host "  • If Redis Streams empty: Start event producers or check consumer" -ForegroundColor White
Write-Host "  • If WebSocket fails: Check backend is running on port 3001" -ForegroundColor White
Write-Host ""

