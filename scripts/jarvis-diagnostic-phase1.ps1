# JARVIS Diagnostic Phase 1 - MCP Connectivity Check
# Version: 1.0.0
# Description: Phase 1 diagnostic - MCP server connectivity and health checks

param(
    [switch]$Verbose,
    [string]$ReportsPath = "reports"
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

function Test-MCPServer {
    param(
        [string]$Name,
        [int]$Port,
        [string]$Endpoint = "/health"
    )
    
    $url = "http://localhost:$Port$Endpoint"
    Write-Log "Checking MCP Server: $Name (Port: $Port)" -Level "INFO"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -Method Get -ErrorAction Stop
        $stopwatch.Stop()
        
        $responseData = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        $result = @{
            Name = $Name
            Port = $Port
            Status = "healthy"
            ResponseTime = $stopwatch.ElapsedMilliseconds
            StatusCode = $response.StatusCode
            Timestamp = (Get-Date).ToISOString()
            Data = $responseData
        }
        
        Write-Log "✅ $Name is healthy (${stopwatch}ms)" -Level "SUCCESS"
        return $result
    } catch {
        $result = @{
            Name = $Name
            Port = $Port
            Status = "unhealthy"
            Error = $_.Exception.Message
            Timestamp = (Get-Date).ToISOString()
        }
        Write-Log "❌ $Name is unhealthy: $($_.Exception.Message)" -Level "ERROR"
        return $result
    }
}

# Main execution
Write-Log "=== JARVIS Diagnostic Phase 1: MCP Connectivity Check ===" -Level "INFO"

$mcpServers = @(
    @{ Name = "FinBot"; Port = 5555; Endpoint = "/finbot/health" },
    @{ Name = "MuBot"; Port = 5556; Endpoint = "/mubot/health" },
    @{ Name = "DESE"; Port = 5557; Endpoint = "/dese/health" },
    @{ Name = "Observability"; Port = 5558; Endpoint = "/observability/health" }
)

$results = @()
foreach ($server in $mcpServers) {
    $result = Test-MCPServer -Name $server.Name -Port $server.Port -Endpoint $server.Endpoint
    $results += $result
}

# Summary
$healthyCount = ($results | Where-Object { $_.Status -eq "healthy" }).Count
$unhealthyCount = ($results | Where-Object { $_.Status -eq "unhealthy" }).Count
$avgResponseTime = if ($healthyCount -gt 0) {
    [math]::Round(($results | Where-Object { $_.Status -eq "healthy" } | Measure-Object -Property ResponseTime -Average).Average, 2)
} else { 0 }

$summary = @{
    Phase = "Phase 1 - MCP Connectivity"
    Timestamp = (Get-Date).ToISOString()
    TotalServers = $results.Count
    HealthyServers = $healthyCount
    UnhealthyServers = $unhealthyCount
    AverageResponseTime = $avgResponseTime
    Status = if ($unhealthyCount -eq 0) { "PASS" } else { "FAIL" }
    Results = $results
}

# Save report
$reportPath = "$ReportsPath/jarvis_diagnostic_phase1_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 10 | Out-File $reportPath
Write-Log "Phase 1 report saved to: $reportPath" -Level "SUCCESS"

# Print summary
Write-Log "=== Phase 1 Summary ===" -Level "INFO"
Write-Log "Total Servers: $($summary.TotalServers)" -Level "INFO"
Write-Log "Healthy: $($summary.HealthyServers)" -Level "SUCCESS"
Write-Log "Unhealthy: $($summary.UnhealthyServers)" -Level $(if ($unhealthyCount -gt 0) { "ERROR" } else { "SUCCESS" })
Write-Log "Average Response Time: ${avgResponseTime}ms" -Level "INFO"
Write-Log "Overall Status: $($summary.Status)" -Level $(if ($summary.Status -eq "PASS") { "SUCCESS" } else { "ERROR" })

exit $(if ($summary.Status -eq "PASS") { 0 } else { 1 })

