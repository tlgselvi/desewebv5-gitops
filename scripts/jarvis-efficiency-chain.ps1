# JARVIS Efficiency Chain - Weekly Auto Maintenance
# Version: 1.0.0
# Protocol: upgrade-protocol-v1.2
# Description: Automated efficiency optimization for Cursor AI development environment

param(
    [switch]$Verbose,
    [string]$ReportsPath = "reports"
)

$ErrorActionPreference = "Stop"

# Create reports directory if it doesn't exist
if (-not (Test-Path $ReportsPath)) {
    New-Item -ItemType Directory -Force -Path $ReportsPath | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    if ($Verbose) {
        Write-Verbose $logMessage
    }
}

function Step-ContextCleanup {
    Write-Log "Starting context cleanup..."
    $removedCount = 0
    $removedSize = 0
    
    if (Test-Path ".cursor/memory") {
        $oldFiles = Get-ChildItem -Path ".cursor/memory" -File | 
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
        
        foreach ($file in $oldFiles) {
            $removedSize += $file.Length
            Remove-Item $file.FullName -Force
            $removedCount++
        }
    }
    
    Write-Log "Context cleanup completed: $removedCount files removed ($([math]::Round($removedSize / 1MB, 2)) MB)"
    return @{
        FilesRemoved = $removedCount
        SizeFreed = $removedSize
    }
}

function Step-LogArchive {
    Write-Log "Starting log archive..."
    $archivedCount = 0
    
    if (Test-Path "logs") {
        $archiveDate = (Get-Date).ToString("yyyy-MM-dd")
        $archivePath = "logs/archive/$archiveDate"
        
        if (-not (Test-Path $archivePath)) {
            New-Item -ItemType Directory -Force -Path $archivePath | Out-Null
        }
        
        $oldLogs = Get-ChildItem -Path "logs" -File -Filter "*.log" | 
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
        
        foreach ($log in $oldLogs) {
            Move-Item $log.FullName -Destination $archivePath -Force
            $archivedCount++
        }
    }
    
    Write-Log "Log archive completed: $archivedCount files archived"
    return @{
        FilesArchived = $archivedCount
    }
}

function Step-MCPConnectivityAudit {
    Write-Log "Starting MCP connectivity audit..."
    $mcpServers = @(
        @{ Name = "FinBot"; Port = 5555; Endpoint = "/finbot/health" },
        @{ Name = "MuBot"; Port = 5556; Endpoint = "/mubot/health" },
        @{ Name = "DESE"; Port = 5557; Endpoint = "/dese/health" },
        @{ Name = "Observability"; Port = 5558; Endpoint = "/observability/health" }
    )
    
    $results = @()
    foreach ($server in $mcpServers) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://localhost:$($server.Port)$($server.Endpoint)" -TimeoutSec 5 -ErrorAction Stop
            $stopwatch.Stop()
            
            $results += @{
                Name = $server.Name
                Port = $server.Port
                Status = "healthy"
                ResponseTime = $stopwatch.ElapsedMilliseconds
                StatusCode = $response.StatusCode
            }
            Write-Log "MCP Server $($server.Name) is healthy (${stopwatch}ms)"
        } catch {
            $results += @{
                Name = $server.Name
                Port = $server.Port
                Status = "unhealthy"
                Error = $_.Exception.Message
            }
            Write-Log "MCP Server $($server.Name) is unhealthy: $($_.Exception.Message)" -Level "WARN"
        }
    }
    
    $reportPath = "$ReportsPath/mcp_connectivity_$(Get-Date -Format 'yyyyMMdd').json"
    $results | ConvertTo-Json -Depth 10 | Out-File $reportPath
    Write-Log "MCP connectivity report saved to: $reportPath"
    
    return @{
        ServersChecked = $results.Count
        HealthyServers = ($results | Where-Object { $_.Status -eq "healthy" }).Count
        UnhealthyServers = ($results | Where-Object { $_.Status -eq "unhealthy" }).Count
    }
}

function Step-ContextStatsReport {
    Write-Log "Generating context statistics report..."
    
    $stats = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        memoryFiles = if (Test-Path ".cursor/memory") { (Get-ChildItem -Path ".cursor/memory" -File).Count } else { 0 }
        memorySize = if (Test-Path ".cursor/memory") { (Get-ChildItem -Path ".cursor/memory" -File | Measure-Object -Property Length -Sum).Sum } else { 0 }
        chainFiles = if (Test-Path ".cursor/chains") { (Get-ChildItem -Path ".cursor/chains" -File).Count } else { 0 }
        scriptFiles = if (Test-Path "scripts") { (Get-ChildItem -Path "scripts" -File -Filter "*.ps1").Count } else { 0 }
        mcpServerFiles = if (Test-Path "src/mcp") { (Get-ChildItem -Path "src/mcp" -File -Filter "*.ts").Count } else { 0 }
    }
    
    $reportPath = "$ReportsPath/context_stats_$(Get-Date -Format 'yyyyMMdd').json"
    $stats | ConvertTo-Json -Depth 10 | Out-File $reportPath
    Write-Log "Context stats report saved to: $reportPath"
    
    return $stats
}

function Step-MetricsPush {
    Write-Log "Pushing metrics to Prometheus..."
    $promUrl = $env:PROMETHEUS_URL ?? "http://localhost:9090"
    
    try {
        # Check if Prometheus is reachable
        $response = Invoke-WebRequest -Uri "$promUrl/api/v1/status/config" -TimeoutSec 5 -ErrorAction Stop
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Log "Prometheus is reachable at: $promUrl"
        } else {
            Write-Log "Prometheus returned status code: $statusCode" -Level "WARN"
        }
        
        # Metrics push would go here (placeholder)
        # In production, push metrics using Prometheus Pushgateway or similar
        Write-Log "Metrics push completed (placeholder)"
        
        return @{
            PrometheusUrl = $promUrl
            Status = "success"
            StatusCode = $statusCode
        }
    } catch {
        Write-Log "Prometheus is not reachable: $($_.Exception.Message)" -Level "WARN"
        return @{
            PrometheusUrl = $promUrl
            Status = "failed"
            Error = $_.Exception.Message
        }
    }
}

# Main execution
Write-Log "=== JARVIS Efficiency Chain Started ===" -Level "INFO"
Write-Log "Reports path: $ReportsPath"

$summary = @{
    StartTime = (Get-Date).ToUniversalTime().ToString("o")
    Steps = @{}
}

try {
    $summary.Steps.ContextCleanup = Step-ContextCleanup
    $summary.Steps.LogArchive = Step-LogArchive
    $summary.Steps.MCPConnectivityAudit = Step-MCPConnectivityAudit
    $summary.Steps.ContextStatsReport = Step-ContextStatsReport
    $summary.Steps.MetricsPush = Step-MetricsPush
    
    $summary.EndTime = (Get-Date).ToUniversalTime().ToString("o")
    $summary.Status = "success"
    
    Write-Log "=== JARVIS Efficiency Chain Completed Successfully ===" -Level "INFO"
} catch {
    $summary.EndTime = (Get-Date).ToUniversalTime().ToString("o")
    $summary.Status = "failed"
    $summary.Error = $_.Exception.Message
    Write-Log "JARVIS Efficiency Chain failed: $($_.Exception.Message)" -Level "ERROR"
    exit 1
}

# Save summary report
$summaryPath = "$ReportsPath/jarvis_efficiency_summary_$(Get-Date -Format 'yyyyMMdd').json"
$summary | ConvertTo-Json -Depth 10 | Out-File $summaryPath
Write-Log "Summary report saved to: $summaryPath"

exit 0

