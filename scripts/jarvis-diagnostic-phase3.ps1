# JARVIS Diagnostic Phase 3 - Performance Metrics
# Version: 1.0.0
# Description: Phase 3 diagnostic - Performance metrics, API response times, and throughput

param(
    [switch]$Verbose,
    [string]$ReportsPath = "reports",
    [string]$BackendUrl = "http://localhost:3001",
    [int]$SampleCount = 5
)

$ErrorActionPreference = "Continue"

# Create reports directory if it doesn't exist
if (-not (Test-Path $ReportsPath)) {
    New-Item -ItemType Directory -Force -Path $ReportsPath | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "Cyan" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-APIEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [int]$Samples = 5
    )
    
    Write-Log "Testing API Endpoint: $Url ($Method) with $Samples samples" -Level "INFO"
    
    $responseTimes = @()
    $successCount = 0
    $failureCount = 0
    
    for ($i = 1; $i -le $Samples; $i++) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec 10 -ErrorAction Stop
            $stopwatch.Stop()
            
            $responseTimes += $stopwatch.ElapsedMilliseconds
            $successCount++
            
            if ($Verbose) {
                Write-Log "  Sample $i: ${stopwatch}ms (Status: $($response.StatusCode))" -Level "INFO"
            }
        } catch {
            $failureCount++
            Write-Log "  Sample $i failed: $($_.Exception.Message)" -Level "WARN"
        }
    }
    
    $avgResponseTime = if ($responseTimes.Count -gt 0) {
        [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
    } else { 0 }
    
    $minResponseTime = if ($responseTimes.Count -gt 0) {
        [math]::Round(($responseTimes | Measure-Object -Minimum).Minimum, 2)
    } else { 0 }
    
    $maxResponseTime = if ($responseTimes.Count -gt 0) {
        [math]::Round(($responseTimes | Measure-Object -Maximum).Maximum, 2)
    } else { 0 }
    
    $successRate = if ($Samples -gt 0) {
        [math]::Round(($successCount / $Samples) * 100, 2)
    } else { 0 }
    
    $result = @{
        Url = $Url
        Method = $Method
        Samples = $Samples
        SuccessCount = $successCount
        FailureCount = $failureCount
        SuccessRate = $successRate
        AverageResponseTime = $avgResponseTime
        MinResponseTime = $minResponseTime
        MaxResponseTime = $maxResponseTime
        Status = if ($successRate -eq 100 -and $avgResponseTime -lt 1000) { "excellent" } 
                 elseif ($successRate -ge 95 -and $avgResponseTime -lt 2000) { "good" }
                 elseif ($successRate -ge 80) { "warning" }
                 else { "critical" }
        Timestamp = (Get-Date).ToISOString()
    }
    
    Write-Log "✅ $Url - Avg: ${avgResponseTime}ms, Success: $successRate%" -Level "SUCCESS"
    return $result
}

function Test-MCPPerformance {
    param([int]$SampleCount = 3)
    
    Write-Log "Testing MCP Server Performance..." -Level "INFO"
    
    $mcpServers = @(
        @{ Name = "FinBot"; Port = 5555; Endpoint = "/finbot/health" },
        @{ Name = "MuBot"; Port = 5556; Endpoint = "/mubot/health" },
        @{ Name = "DESE"; Port = 5557; Endpoint = "/dese/health" },
        @{ Name = "Observability"; Port = 5558; Endpoint = "/observability/health" }
    )
    
    $results = @()
    foreach ($server in $mcpServers) {
        $url = "http://localhost:$($server.Port)$($server.Endpoint)"
        $result = Test-APIEndpoint -Url $url -Samples $SampleCount
        $result.Name = $server.Name
        $results += $result
    }
    
    return $results
}

function Test-BackendEndpoints {
    param([string]$BaseUrl, [int]$SampleCount = 3)
    
    Write-Log "Testing Backend API Endpoints..." -Level "INFO"
    
    $endpoints = @(
        @{ Path = "/health"; Method = "GET" },
        @{ Path = "/health/live"; Method = "GET" },
        @{ Path = "/metrics"; Method = "GET" },
        @{ Path = "/api/v1/analytics/dashboard"; Method = "GET" }
    )
    
    $results = @()
    foreach ($endpoint in $endpoints) {
        $url = "$BaseUrl$($endpoint.Path)"
        $result = Test-APIEndpoint -Url $url -Method $endpoint.Method -Samples $SampleCount
        $result.Path = $endpoint.Path
        $results += $result
    }
    
    return $results
}

# Main execution
Write-Log "=== JARVIS Diagnostic Phase 3: Performance Metrics ===" -Level "INFO"

$results = @{
    MCPPerformance = Test-MCPPerformance -SampleCount $SampleCount
    BackendPerformance = Test-BackendEndpoints -BaseUrl $BackendUrl -SampleCount $SampleCount
}

# Calculate overall metrics
$allMCPResults = $results.MCPPerformance
$allBackendResults = $results.BackendPerformance

$overallMetrics = @{
    MCP = @{
        AverageResponseTime = if ($allMCPResults.Count -gt 0) {
            [math]::Round(($allMCPResults | Measure-Object -Property AverageResponseTime -Average).Average, 2)
        } else { 0 }
        AverageSuccessRate = if ($allMCPResults.Count -gt 0) {
            [math]::Round(($allMCPResults | Measure-Object -Property SuccessRate -Average).Average, 2)
        } else { 0 }
        TotalServers = $allMCPResults.Count
    }
    Backend = @{
        AverageResponseTime = if ($allBackendResults.Count -gt 0) {
            [math]::Round(($allBackendResults | Measure-Object -Property AverageResponseTime -Average).Average, 2)
        } else { 0 }
        AverageSuccessRate = if ($allBackendResults.Count -gt 0) {
            [math]::Round(($allBackendResults | Measure-Object -Property SuccessRate -Average).Average, 2)
        } else { 0 }
        TotalEndpoints = $allBackendResults.Count
    }
}

# Determine overall status
$mcpStatus = if ($overallMetrics.MCP.AverageSuccessRate -eq 100 -and $overallMetrics.MCP.AverageResponseTime -lt 500) { "excellent" }
            elseif ($overallMetrics.MCP.AverageSuccessRate -ge 95 -and $overallMetrics.MCP.AverageResponseTime -lt 1000) { "good" }
            elseif ($overallMetrics.MCP.AverageSuccessRate -ge 80) { "warning" }
            else { "critical" }

$backendStatus = if ($overallMetrics.Backend.AverageSuccessRate -eq 100 -and $overallMetrics.Backend.AverageResponseTime -lt 1000) { "excellent" }
                elseif ($overallMetrics.Backend.AverageSuccessRate -ge 95 -and $overallMetrics.Backend.AverageResponseTime -lt 2000) { "good" }
                elseif ($overallMetrics.Backend.AverageSuccessRate -ge 80) { "warning" }
                else { "critical" }

$overallStatus = if ($mcpStatus -eq "excellent" -and $backendStatus -eq "excellent") { "PASS" }
                elseif ($mcpStatus -ne "critical" -and $backendStatus -ne "critical") { "WARNING" }
                else { "FAIL" }

$summary = @{
    Phase = "Phase 3 - Performance Metrics"
    Timestamp = (Get-Date).ToISOString()
    SampleCount = $SampleCount
    OverallMetrics = $overallMetrics
    MCPStatus = $mcpStatus
    BackendStatus = $backendStatus
    OverallStatus = $overallStatus
    Results = $results
}

# Save report
$reportPath = "$ReportsPath/jarvis_diagnostic_phase3_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 10 | Out-File $reportPath
Write-Log "Phase 3 report saved to: $reportPath" -Level "SUCCESS"

# Print summary
Write-Log "=== Phase 3 Summary ===" -Level "INFO"
Write-Log "MCP Average Response Time: $($overallMetrics.MCP.AverageResponseTime)ms" -Level "INFO"
Write-Log "MCP Average Success Rate: $($overallMetrics.MCP.AverageSuccessRate)%" -Level "INFO"
Write-Log "MCP Status: $mcpStatus" -Level $(if ($mcpStatus -eq "excellent") { "SUCCESS" } elseif ($mcpStatus -eq "good") { "SUCCESS" } elseif ($mcpStatus -eq "warning") { "WARN" } else { "ERROR" })
Write-Log "Backend Average Response Time: $($overallMetrics.Backend.AverageResponseTime)ms" -Level "INFO"
Write-Log "Backend Average Success Rate: $($overallMetrics.Backend.AverageSuccessRate)%" -Level "INFO"
Write-Log "Backend Status: $backendStatus" -Level $(if ($backendStatus -eq "excellent") { "SUCCESS" } elseif ($backendStatus -eq "good") { "SUCCESS" } elseif ($backendStatus -eq "warning") { "WARN" } else { "ERROR" })
Write-Log "Overall Status: $overallStatus" -Level $(if ($overallStatus -eq "PASS") { "SUCCESS" } elseif ($overallStatus -eq "WARNING") { "WARN" } else { "ERROR" })

exit $(if ($overallStatus -eq "FAIL") { 1 } else { 0 })

