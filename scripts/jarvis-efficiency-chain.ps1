# DESE JARVIS Efficiency Chain
# System Efficiency & Optimization Chain v1.0
# Purpose: Weekly maintenance automation for Cursor AI development environment
# Compatible with: upgrade-protocol-v1.2

param(
    [switch]$Verbose,
    [string]$OutputPath = "reports/efficiency_report_$(Get-Date -Format 'yyyyMMdd').md"
)

$ErrorActionPreference = "Continue"
$StartTime = Get-Date

# Color output functions
function Write-StepHeader {
    param([int]$Step, [int]$Total, [string]$Name)
    Write-Host "`n[$Step/$Total] $Name..." -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Initialize report
$ReportContent = @"
# DESE JARVIS Efficiency Chain Report
**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Version:** 1.0  
**Status:** RUNNING

---

## Execution Summary

"@

$ReportContent += "`n### 1. Context Cleanup`n" | Out-String

# Step 1: Context Cleanup
Write-StepHeader 1 6 "Context Cleanup"

try {
    $cursorContextPath = ".cursor\memory"
    if (Test-Path $cursorContextPath) {
        $oldFiles = Get-ChildItem -Path $cursorContextPath -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-3) }
        $oldCount = ($oldFiles | Measure-Object).Count
        
        if ($oldCount -gt 0) {
            $oldFiles | Remove-Item -Force
            Write-Success "Removed $oldCount old context files"
            $ReportContent += "✅ Removed $oldCount old context files (older than 3 days)`n" | Out-String
        } else {
            Write-Success "No old context files to clean"
            $ReportContent += "✅ No old context files to clean`n" | Out-String
        }
    } else {
        Write-Warning ".cursor/memory directory not found"
        $ReportContent += "⚠️  .cursor/memory directory not found`n" | Out-String
    }
} catch {
    Write-Error-Custom "Context cleanup failed: $_"
    $ReportContent += "❌ Context cleanup failed: $_`n" | Out-String
}

# Step 2: Log Archive
Write-StepHeader 2 6 "Log Archive"
$ReportContent += "`n### 2. Log Archive`n" | Out-String

try {
    $logsPath = "logs"
    $archivePath = "logs\archive"
    
    if (-not (Test-Path $archivePath)) {
        New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    }
    
    if (Test-Path $logsPath) {
        $oldLogs = Get-ChildItem -Path $logsPath -Recurse -File -Exclude "archive" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-3) }
        $oldLogsCount = ($oldLogs | Measure-Object).Count
        
        if ($oldLogsCount -gt 0) {
            $archiveName = "logs\archive\$(Get-Date -Format 'yyyyMMdd')_cursor_logs.tar.gz"
            # On Windows, use 7-Zip or Compress-Archive
            Compress-Archive -Path $oldLogs.FullName -DestinationPath ($archiveName -replace "\.tar\.gz$", ".zip") -Force
            $oldLogs | Remove-Item -Force
            Write-Success "Archived $oldLogsCount log files"
            $ReportContent += "✅ Archived $oldLogsCount log files to $archiveName`n" | Out-String
        } else {
            Write-Success "No old logs to archive"
            $ReportContent += "✅ No old logs to archive`n" | Out-String
        }
    } else {
        Write-Warning "logs directory not found"
        $ReportContent += "⚠️  logs directory not found`n" | Out-String
    }
} catch {
    Write-Error-Custom "Log archive failed: $_"
    $ReportContent += "❌ Log archive failed: $_`n" | Out-String
}

# Step 3: MCP Connectivity Audit
Write-StepHeader 3 6 "MCP Connectivity Audit"
$ReportContent += "`n### 3. MCP Connectivity Audit`n" | Out-String

$mcpServers = @(
    @{ Name = "FinBot"; Port = 5555 },
    @{ Name = "MuBot"; Port = 5556 },
    @{ Name = "Dese"; Port = 5557 }
)

$mcpHealthy = 0
$mcpTotal = $mcpServers.Count

foreach ($server in $mcpServers) {
    try {
        $healthUrl = "http://localhost:$($server.Port)/health"
        $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 5 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Success "$($server.Name) MCP server is healthy"
            $ReportContent += "✅ $($server.Name) MCP server is healthy`n" | Out-String
            $mcpHealthy++
        } else {
            Write-Warning "$($server.Name) MCP returned status code $($response.StatusCode)"
            $ReportContent += "⚠️  $($server.Name) MCP returned status code $($response.StatusCode)`n" | Out-String
        }
    } catch {
        Write-Error-Custom "$($server.Name) MCP server unreachable"
        $ReportContent += "❌ $($server.Name) MCP server unreachable`n" | Out-String
    }
}

Write-Host "`n📊 MCP Health: $mcpHealthy/$mcpTotal servers healthy" -ForegroundColor $(if ($mcpHealthy -eq $mcpTotal) { "Green" } else { "Yellow" })
$ReportContent += "`n**MCP Health:** $mcpHealthy/$mcpTotal servers healthy`n" | Out-String

# Step 4: LLM Benchmark (Placeholder)
Write-StepHeader 4 6 "LLM Benchmark"
$ReportContent += "`n### 4. LLM Benchmark`n" | Out-String

Write-Warning "LLM Benchmark not yet implemented (feature placeholder)"
$ReportContent += "⚠️  LLM Benchmark not yet implemented (feature placeholder)`n" | Out-String

# Step 5: Context Stats Report
Write-StepHeader 5 6 "Context Stats Report"
$ReportContent += "`n### 5. Context Stats Report`n" | Out-String

try {
    $cursorStats = @{
        contextFiles = (Get-ChildItem -Path ".cursor\memory" -File -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        logFiles = (Get-ChildItem -Path "logs" -File -Recurse -Exclude "archive" -ErrorAction SilentlyContinue | Measure-Object).Count
        reportFiles = (Get-ChildItem -Path "reports" -File -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    
    Write-Host "Context Files: $($cursorStats.contextFiles)" -ForegroundColor White
    Write-Host "Log Files: $($cursorStats.logFiles)" -ForegroundColor White
    Write-Host "Report Files: $($cursorStats.reportFiles)" -ForegroundColor White
    
    $ReportContent += "`n| Metric | Value |`n|--------|-------|`n" | Out-String
    $ReportContent += "| Context Files | $($cursorStats.contextFiles) |`n" | Out-String
    $ReportContent += "| Log Files | $($cursorStats.logFiles) |`n" | Out-String
    $ReportContent += "| Report Files | $($cursorStats.reportFiles) |`n" | Out-String
    
    Write-Success "Context stats report generated"
} catch {
    Write-Error-Custom "Context stats report failed: $_"
    $ReportContent += "❌ Context stats report failed: $_`n" | Out-String
}

# Step 6: Metrics Push (Prometheus)
Write-StepHeader 6 6 "Metrics Push"
$ReportContent += "`n### 6. Metrics Push`n" | Out-String

try {
    $prometheusEndpoint = "http://localhost:9090/api/v1/status/config"
    $response = Invoke-WebRequest -Uri $prometheusEndpoint -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200) {
        Write-Success "Prometheus endpoint accessible"
        $ReportContent += "✅ Prometheus endpoint accessible`n" | Out-String
        
        # Note: Actual metrics push would go here if implemented
        Write-Host "   ℹ️  Metrics push endpoint would send data here" -ForegroundColor Gray
    } else {
        Write-Warning "Prometheus endpoint returned status code $($response.StatusCode)"
        $ReportContent += "⚠️  Prometheus endpoint returned status code $($response.StatusCode)`n" | Out-String
    }
} catch {
    Write-Warning "Prometheus endpoint not accessible (expected in dev environment)"
    $ReportContent += "⚠️  Prometheus endpoint not accessible (expected in dev)`n" | Out-String
}

# Final Summary
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

$ReportContent += @"

---

## Final Summary

**Execution Time:** $($Duration.TotalSeconds)s  
**MCP Health:** $mcpHealthy/$mcpTotal servers  
**Timestamp:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Status:** COMPLETED

---

*Generated by DESE JARVIS Efficiency Chain v1.0*
"@

# Save report
try {
    if (-not (Test-Path (Split-Path $OutputPath))) {
        New-Item -ItemType Directory -Path (Split-Path $OutputPath) -Force | Out-Null
    }
    $ReportContent | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-Success "Report saved to $OutputPath"
} catch {
    Write-Error-Custom "Failed to save report: $_"
}

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ JARVIS Efficiency Chain Completed Successfully!" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host "`n📊 Duration: $($Duration.TotalSeconds)s" -ForegroundColor Cyan
Write-Host "📄 Report: $OutputPath`n" -ForegroundColor Cyan

# Alert logging if any failures occurred
if ($mcpHealthy -lt $mcpTotal) {
    $alertMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): MCP connectivity issues detected ($mcpHealthy/$mcpTotal healthy)"
    $alertMessage | Out-File -FilePath "ops\alerts\jarvis_efficiency.log" -Append -Encoding UTF8
    Write-Warning "Alert logged to ops\alerts\jarvis_efficiency.log"
}

exit 0

