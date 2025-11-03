# === DESE JARVIS SYSTEM VALIDATION ===
# Context: EA Plan Master Control v6.7.0 – sprint/2.6-predictive-correlation
# Focus: Realtime Metrics Dashboard (Redis Streams + WS + Prometheus)
# Mode: Stepwise validation & auto-report
# Purpose: Sistem kararlılık analizi, DESE JARVIS yönlendirme için veri toplama

Write-Host "=== DESE JARVIS SYSTEM VALIDATION ===" -ForegroundColor Cyan
Write-Host "EA Plan Master Control v6.7.0 - sprint/2.6-predictive-correlation" -ForegroundColor Gray
Write-Host "Focus: Realtime Metrics Dashboard (Redis Streams + WS + Prometheus)" -ForegroundColor Gray
Write-Host ""

$validationResults = @{
    PrometheusMetrics = $false
    RedisStreams = $false
    WebSocketGateway = $false
    Errors = @()
    Warnings = @()
}

# STEP 1 — Prometheus metric export check
Write-Host "▶️ STEP 1 — Prometheus metric export check" -ForegroundColor Yellow

try {
    $metricsUrl = "http://localhost:3001/metrics"
    $response = Invoke-WebRequest -Uri $metricsUrl -TimeoutSec 5 -ErrorAction Stop
    $metricsContent = $response.Content
    
    $requiredMetrics = @("ws_connections", "ws_broadcast_total", "ws_latency_seconds", "stream_consumer_lag")
    $foundMetrics = @()
    $missingMetrics = @()
    
    foreach ($metric in $requiredMetrics) {
        if ($metricsContent -match $metric) {
            $foundMetrics += $metric
            Write-Host "  ✅ $metric found" -ForegroundColor Green
        } else {
            $missingMetrics += $metric
            Write-Host "  ❌ $metric missing" -ForegroundColor Red
            $validationResults.Warnings += "Missing metric: $metric"
        }
    }
    
    if ($missingMetrics.Count -eq 0) {
        $validationResults.PrometheusMetrics = $true
        Write-Host "  ✅ All Prometheus metrics exported successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Missing metrics: $($missingMetrics -join ', ')" -ForegroundColor Yellow
    }
    
    # Show sample metrics
    Write-Host "`n  Sample metrics:" -ForegroundColor Cyan
    $sampleMetrics = $metricsContent -split "`n" | Select-String -Pattern "^(ws_|stream_consumer)" | Select-Object -First 5
    foreach ($metric in $sampleMetrics) {
        Write-Host "    $($metric.ToString().Trim())" -ForegroundColor Gray
    }
    
} catch {
    $errorMsg = "Failed to fetch Prometheus metrics: $($_.Exception.Message)"
    Write-Host "  ❌ $errorMsg" -ForegroundColor Red
    $validationResults.Errors += $errorMsg
    
    if ($_.Exception.Message -match "connection") {
        Write-Host "     Make sure backend is running on http://localhost:3001" -ForegroundColor Yellow
    }
}

Write-Host ""

# STEP 2 — Redis Streams health
Write-Host "▶️ STEP 2 — Redis Streams health" -ForegroundColor Yellow

$redisCli = Get-Command redis-cli -ErrorAction SilentlyContinue

if ($redisCli) {
    try {
        $streams = @("finbot.events", "mubot.events", "dese.events")
        $activeStreams = 0
        $inactiveStreams = @()
        
        foreach ($stream in $streams) {
            try {
                $streamInfo = redis-cli XINFO STREAM $stream 2>&1
                if ($LASTEXITCODE -eq 0 -and $streamInfo -match "length") {
                    $length = ($streamInfo | Select-String -Pattern "length:\s*(\d+)").Matches[0].Groups[1].Value
                    Write-Host "  ✅ $stream active (length: $length)" -ForegroundColor Green
                    $activeStreams++
                } else {
                    Write-Host "  ⚠️  $stream empty or not found" -ForegroundColor Yellow
                    $inactiveStreams += $stream
                    $validationResults.Warnings += "Stream inactive: $stream"
                }
            } catch {
                Write-Host "  ⚠️  $stream check failed" -ForegroundColor Yellow
                $inactiveStreams += $stream
                $validationResults.Warnings += "Stream check failed: $stream"
            }
        }
        
        if ($activeStreams -gt 0) {
            $validationResults.RedisStreams = $true
            Write-Host "  ✅ Redis Streams active ($activeStreams/$($streams.Count) streams)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Streams inactive (no active streams found)" -ForegroundColor Yellow
        }
        
        # Check for pending messages (consumer lag)
        foreach ($stream in $streams) {
            try {
                $groups = redis-cli XINFO GROUPS $stream 2>&1
                if ($LASTEXITCODE -eq 0 -and $groups -match "pending") {
                    Write-Host "  ℹ️  $stream has consumer groups with pending messages" -ForegroundColor Cyan
                }
            } catch {
                # Ignore errors for groups check
            }
        }
        
    } catch {
        $errorMsg = "Redis Streams check failed: $($_.Exception.Message)"
        Write-Host "  ⚠️  $errorMsg" -ForegroundColor Yellow
        $validationResults.Warnings += $errorMsg
    }
} else {
    $warningMsg = "redis-cli not found, skipping Redis Streams check"
    Write-Host "  ⚠️  $warningMsg" -ForegroundColor Yellow
    $validationResults.Warnings += $warningMsg
    Write-Host "     Install Redis tools or use Docker container" -ForegroundColor Gray
}

Write-Host ""

# STEP 3 — WebSocket gateway ping/pong
Write-Host "▶️ STEP 3 — WebSocket gateway ping/pong" -ForegroundColor Yellow

$wsTestScript = @"
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws?token=test-token');

let connected = false;
let pongReceived = false;
const timeout = setTimeout(() => {
    if (!connected) {
        console.log('  ❌ WS connection timeout');
        process.exit(1);
    }
    if (!pongReceived) {
        console.log('  ⚠️  WS connected but ping/pong test incomplete');
        process.exit(0);
    }
}, 5000);

ws.on('open', () => {
    connected = true;
    console.log('  ✅ WS connected');
    ws.ping();
});

ws.on('pong', () => {
    pongReceived = true;
    console.log('  ✅ WS latency OK');
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.log('  ❌ WS error:', error.message);
    clearTimeout(timeout);
    process.exit(1);
});

ws.on('close', () => {
    if (!pongReceived && connected) {
        console.log('  ⚠️  WS closed before ping/pong test');
    }
    clearTimeout(timeout);
    process.exit(0);
});
"@

try {
    $testFile = "test-ws-validation.js"
    Set-Content -Path $testFile -Value $wsTestScript
    
    $nodeResult = node $testFile 2>&1
    Write-Host $nodeResult
    
    if ($LASTEXITCODE -eq 0 -and $nodeResult -match "latency OK") {
        $validationResults.WebSocketGateway = $true
    } elseif ($nodeResult -match "error|timeout") {
        $errorMsg = "WebSocket gateway test failed"
        Write-Host "  ❌ $errorMsg" -ForegroundColor Red
        $validationResults.Errors += $errorMsg
    } else {
        $warningMsg = "WebSocket gateway test incomplete"
        Write-Host "  ⚠️  $warningMsg" -ForegroundColor Yellow
        $validationResults.Warnings += $warningMsg
    }
    
    Remove-Item $testFile -ErrorAction SilentlyContinue
    
} catch {
    $errorMsg = "WebSocket test skipped: Node.js or ws package not available"
    Write-Host "  ⚠️  $errorMsg" -ForegroundColor Yellow
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
    $validationResults.Warnings += $errorMsg
    
    # Cleanup
    if (Test-Path "test-ws-validation.js") {
        Remove-Item "test-ws-validation.js" -ErrorAction SilentlyContinue
    }
}

Write-Host ""

# STEP 4 — Report summary
Write-Host "▶️ STEP 4 — Report summary" -ForegroundColor Yellow
Write-Host ""

$totalChecks = 3
$passedChecks = @(
    $validationResults.PrometheusMetrics,
    $validationResults.RedisStreams,
    $validationResults.WebSocketGateway
).Where({ $_ -eq $true }).Count

Write-Host "Validation Results:" -ForegroundColor Cyan
Write-Host "  • Prometheus Metrics: $(if ($validationResults.PrometheusMetrics) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($validationResults.PrometheusMetrics) { 'Green' } else { 'Red' })
Write-Host "  • Redis Streams: $(if ($validationResults.RedisStreams) { '✅ PASS' } else { '⚠️  PARTIAL/WARN' })" -ForegroundColor $(if ($validationResults.RedisStreams) { 'Green' } else { 'Yellow' })
Write-Host "  • WebSocket Gateway: $(if ($validationResults.WebSocketGateway) { '✅ PASS' } else { '❌ FAIL/WARN' })" -ForegroundColor $(if ($validationResults.WebSocketGateway) { 'Green' } else { 'Yellow' })
Write-Host ""

Write-Host "Summary: $passedChecks/$totalChecks checks passed" -ForegroundColor $(if ($passedChecks -eq $totalChecks) { 'Green' } else { 'Yellow' })
Write-Host ""

if ($validationResults.Errors.Count -gt 0) {
    Write-Host "Errors:" -ForegroundColor Red
    foreach ($error in $validationResults.Errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
    Write-Host ""
}

if ($validationResults.Warnings.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $validationResults.Warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "=== END VALIDATION REPORT ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Return this console output directly to DESE JARVIS for next-task analysis." -ForegroundColor Gray
Write-Host ""

# Exit with appropriate code
if ($validationResults.Errors.Count -gt 0) {
    exit 1
} elseif ($passedChecks -lt $totalChecks) {
    exit 2
} else {
    exit 0
}

