# MCP Server E2E Validation Script (PowerShell)
# Phase-5 Sprint 1: Task 1.2
# Tests MCP server health, service discovery, and load testing

param(
    [switch]$Verbose,
    [int]$LoadTestRequests = 100,
    [int]$ConcurrentRequests = 10
)

$ErrorActionPreference = "Stop"

# MCP Server Configuration
$MCP_SERVERS = @(
    @{ Name = "FinBot"; Url = "http://localhost:5555"; Endpoint = "/finbot/health" },
    @{ Name = "MuBot"; Url = "http://localhost:5556"; Endpoint = "/mubot/health" },
    @{ Name = "DESE"; Url = "http://localhost:5557"; Endpoint = "/dese/health" },
    @{ Name = "Observability"; Url = "http://localhost:5558"; Endpoint = "/observability/health" }
)

$results = @{
    HealthChecks = @()
    ServiceDiscovery = @()
    LoadTest = @()
    Overall = "PASSED"
}

Write-Host "=== MCP Server E2E Validation ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Health Checks
Write-Host "[1/3] Health Checks..." -ForegroundColor Yellow
foreach ($server in $MCP_SERVERS) {
    try {
        $response = Invoke-WebRequest -Uri "$($server.Url)$($server.Endpoint)" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        
        if ($data.status -eq "healthy") {
            Write-Host "  ✅ $($server.Name): Healthy (v$($data.version))" -ForegroundColor Green
            $results.HealthChecks += @{
                Server = $server.Name
                Status = "PASSED"
                Version = $data.version
                ResponseTime = $response.Headers.'X-Response-Time'
            }
        } else {
            Write-Host "  ❌ $($server.Name): Unhealthy" -ForegroundColor Red
            $results.HealthChecks += @{ Server = $server.Name; Status = "FAILED" }
            $results.Overall = "FAILED"
        }
    } catch {
        Write-Host "  ❌ $($server.Name): Not reachable" -ForegroundColor Red
        $results.HealthChecks += @{ Server = $server.Name; Status = "FAILED"; Error = $_.Exception.Message }
        $results.Overall = "FAILED"
    }
}

Write-Host ""

# Step 2: Service Discovery
Write-Host "[2/3] Service Discovery..." -ForegroundColor Yellow
$discoveredCount = 0

foreach ($server in $MCP_SERVERS) {
    try {
        # Test query endpoint
        $queryUrl = "$($server.Url)$($server.Endpoint -replace '/health', '/query')"
        $queryBody = @{ query = "test discovery" } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri $queryUrl -Method POST -Body $queryBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        
        Write-Host "  ✅ $($server.Name): Query endpoint responding" -ForegroundColor Green
        $results.ServiceDiscovery += @{
            Server = $server.Name
            Status = "PASSED"
            Endpoint = $queryUrl
        }
        $discoveredCount++
    } catch {
        Write-Host "  ⚠️  $($server.Name): Query endpoint not available" -ForegroundColor Yellow
        $results.ServiceDiscovery += @{
            Server = $server.Name
            Status = "WARNING"
            Error = $_.Exception.Message
        }
    }
}

Write-Host "  Discovered: $discoveredCount/$($MCP_SERVERS.Count) servers" -ForegroundColor $(if ($discoveredCount -eq $MCP_SERVERS.Count) { "Green" } else { "Yellow" })
Write-Host ""

# Step 3: Load Testing
Write-Host "[3/3] Load Testing ($LoadTestRequests requests, $ConcurrentRequests concurrent)..." -ForegroundColor Yellow

$loadTestResults = @()
$testServer = $MCP_SERVERS[0] # Test first server

if ($testServer) {
    $successCount = 0
    $failureCount = 0
    $totalResponseTime = 0
    $startTime = Get-Date
    
    $jobs = @()
    for ($i = 0; $i -lt $LoadTestRequests; $i++) {
        $job = Start-Job -ScriptBlock {
            param($url, $endpoint)
            try {
                $start = Get-Date
                $response = Invoke-WebRequest -Uri "$url$endpoint" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                $end = Get-Date
                $duration = ($end - $start).TotalMilliseconds
                return @{ Success = $true; Duration = $duration; StatusCode = $response.StatusCode }
            } catch {
                return @{ Success = $false; Error = $_.Exception.Message }
            }
        } -ArgumentList $testServer.Url, $testServer.Endpoint
        
        $jobs += $job
        
        # Limit concurrent jobs
        if ($jobs.Count -ge $ConcurrentRequests) {
            $completed = $jobs | Wait-Job -Any
            $result = Receive-Job $completed
            Remove-Job $completed
            $jobs = $jobs | Where-Object { $_.Id -ne $completed.Id }
            
            if ($result.Success) {
                $successCount++
                $totalResponseTime += $result.Duration
            } else {
                $failureCount++
            }
        }
    }
    
    # Wait for remaining jobs
    $jobs | Wait-Job | ForEach-Object {
        $result = Receive-Job $_
        Remove-Job $_
        
        if ($result.Success) {
            $successCount++
            $totalResponseTime += $result.Duration
        } else {
            $failureCount++
        }
    }
    
    $endTime = Get-Date
    $totalDuration = ($endTime - $startTime).TotalSeconds
    $avgResponseTime = if ($successCount -gt 0) { $totalResponseTime / $successCount } else { 0 }
    $successRate = ($successCount / $LoadTestRequests) * 100
    
    Write-Host "  Results:" -ForegroundColor Cyan
    Write-Host "    Success Rate: $([math]::Round($successRate, 2))% ($successCount/$LoadTestRequests)" -ForegroundColor $(if ($successRate -ge 95) { "Green" } else { "Yellow" })
    Write-Host "    Avg Response Time: $([math]::Round($avgResponseTime, 2))ms" -ForegroundColor Cyan
    Write-Host "    Total Duration: $([math]::Round($totalDuration, 2))s" -ForegroundColor Cyan
    
    $results.LoadTest = @{
        Server = $testServer.Name
        TotalRequests = $LoadTestRequests
        SuccessCount = $successCount
        FailureCount = $failureCount
        SuccessRate = $successRate
        AvgResponseTime = $avgResponseTime
        TotalDuration = $totalDuration
    }
    
    if ($successRate -lt 95) {
        $results.Overall = "FAILED"
    }
}

Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Overall Status: $($results.Overall)" -ForegroundColor $(if ($results.Overall -eq "PASSED") { "Green" } else { "Red" })
Write-Host "Health Checks: $($results.HealthChecks.Count) servers checked"
Write-Host "Service Discovery: $discoveredCount/$($MCP_SERVERS.Count) servers discovered"
Write-Host "Load Test: $($results.LoadTest.SuccessRate)% success rate"

# Save results
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "reports/mcp-e2e-validation.json" -Encoding UTF8
Write-Host ""
Write-Host "Results saved to: reports/mcp-e2e-validation.json" -ForegroundColor Green

exit $(if ($results.Overall -eq "PASSED") { 0 } else { 1 })

