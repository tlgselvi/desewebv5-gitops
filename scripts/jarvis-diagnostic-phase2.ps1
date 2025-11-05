# JARVIS Diagnostic Phase 2 - System Health Check
# Version: 1.0.0
# Description: Phase 2 diagnostic - System resources, database, Redis, and backend health

param(
    [switch]$Verbose,
    [string]$ReportsPath = "reports",
    [string]$BackendUrl = "http://localhost:3001"
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

function Test-BackendHealth {
    param([string]$Url)
    
    Write-Log "Checking Backend Health: $Url" -Level "INFO"
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "$Url/health" -TimeoutSec 5 -Method Get -ErrorAction Stop
        $stopwatch.Stop()
        
        $responseData = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        $result = @{
            Status = "healthy"
            ResponseTime = $stopwatch.ElapsedMilliseconds
            StatusCode = $response.StatusCode
            Data = $responseData
            Timestamp = (Get-Date).ToISOString()
        }
        
        Write-Log "✅ Backend is healthy (${stopwatch}ms)" -Level "SUCCESS"
        return $result
    } catch {
        $result = @{
            Status = "unhealthy"
            Error = $_.Exception.Message
            Timestamp = (Get-Date).ToISOString()
        }
        Write-Log "❌ Backend is unhealthy: $($_.Exception.Message)" -Level "ERROR"
        return $result
    }
}

function Test-RedisConnection {
    param([string]$Host = "localhost", [int]$Port = 6379)
    
    Write-Log "Checking Redis Connection: ${Host}:${Port}" -Level "INFO"
    
    try {
        # Try to connect using Test-NetConnection (PowerShell 5.1+) or Test-Connection
        $connection = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue -ErrorAction Stop
        
        if ($connection.TcpTestSucceeded) {
            Write-Log "✅ Redis connection successful" -Level "SUCCESS"
            return @{
                Status = "healthy"
                Host = $Host
                Port = $Port
                Timestamp = (Get-Date).ToISOString()
            }
        } else {
            Write-Log "❌ Redis connection failed" -Level "ERROR"
            return @{
                Status = "unhealthy"
                Host = $Host
                Port = $Port
                Error = "TCP connection test failed"
                Timestamp = (Get-Date).ToISOString()
            }
        }
    } catch {
        Write-Log "❌ Redis connection error: $($_.Exception.Message)" -Level "ERROR"
        return @{
            Status = "unhealthy"
            Host = $Host
            Port = $Port
            Error = $_.Exception.Message
            Timestamp = (Get-Date).ToISOString()
        }
    }
}

function Test-DatabaseConnection {
    param([string]$Host = "localhost", [int]$Port = 5432)
    
    Write-Log "Checking Database Connection: ${Host}:${Port}" -Level "INFO"
    
    try {
        $connection = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue -ErrorAction Stop
        
        if ($connection.TcpTestSucceeded) {
            Write-Log "✅ Database connection successful" -Level "SUCCESS"
            return @{
                Status = "healthy"
                Host = $Host
                Port = $Port
                Timestamp = (Get-Date).ToISOString()
            }
        } else {
            Write-Log "❌ Database connection failed" -Level "ERROR"
            return @{
                Status = "unhealthy"
                Host = $Host
                Port = $Port
                Error = "TCP connection test failed"
                Timestamp = (Get-Date).ToISOString()
            }
        }
    } catch {
        Write-Log "❌ Database connection error: $($_.Exception.Message)" -Level "ERROR"
        return @{
            Status = "unhealthy"
            Host = $Host
            Port = $Port
            Error = $_.Exception.Message
            Timestamp = (Get-Date).ToISOString()
        }
    }
}

function Get-SystemResources {
    Write-Log "Collecting system resource information..." -Level "INFO"
    
    try {
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $memory = Get-CimInstance Win32_OperatingSystem
        $disk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
        
        $result = @{
            CPU = @{
                LoadPercentage = [math]::Round($cpu.Average, 2)
                Status = if ($cpu.Average -lt 80) { "healthy" } elseif ($cpu.Average -lt 90) { "warning" } else { "critical" }
            }
            Memory = @{
                TotalGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
                FreeGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
                UsedPercent = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
                Status = if ((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) -lt 0.9) { "healthy" } else { "warning" }
            }
            Disk = @{
                TotalGB = [math]::Round($disk.Size / 1GB, 2)
                FreeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
                UsedPercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
                Status = if ((($disk.Size - $disk.FreeSpace) / $disk.Size) -lt 0.9) { "healthy" } else { "warning" }
            }
            Timestamp = (Get-Date).ToISOString()
        }
        
        Write-Log "✅ System resources collected" -Level "SUCCESS"
        return $result
    } catch {
        Write-Log "❌ Failed to collect system resources: $($_.Exception.Message)" -Level "ERROR"
        return @{
            Error = $_.Exception.Message
            Timestamp = (Get-Date).ToISOString()
        }
    }
}

# Main execution
Write-Log "=== JARVIS Diagnostic Phase 2: System Health Check ===" -Level "INFO"

$results = @{
    Backend = Test-BackendHealth -Url $BackendUrl
    Redis = Test-RedisConnection
    Database = Test-DatabaseConnection
    SystemResources = Get-SystemResources
}

# Calculate overall status
$healthyCount = 0
$unhealthyCount = 0
$warningCount = 0

foreach ($key in $results.PSObject.Properties.Name) {
    $item = $results.$key
    if ($item.Status -eq "healthy") { $healthyCount++ }
    elseif ($item.Status -eq "unhealthy") { $unhealthyCount++ }
    elseif ($item.Status -eq "warning") { $warningCount++ }
}

$summary = @{
    Phase = "Phase 2 - System Health"
    Timestamp = (Get-Date).ToISOString()
    HealthyComponents = $healthyCount
    UnhealthyComponents = $unhealthyCount
    WarningComponents = $warningCount
    Status = if ($unhealthyCount -eq 0 -and $warningCount -eq 0) { "PASS" } elseif ($unhealthyCount -eq 0) { "WARNING" } else { "FAIL" }
    Results = $results
}

# Save report
$reportPath = "$ReportsPath/jarvis_diagnostic_phase2_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 10 | Out-File $reportPath
Write-Log "Phase 2 report saved to: $reportPath" -Level "SUCCESS"

# Print summary
Write-Log "=== Phase 2 Summary ===" -Level "INFO"
Write-Log "Healthy Components: $($summary.HealthyComponents)" -Level "SUCCESS"
Write-Log "Unhealthy Components: $($summary.UnhealthyComponents)" -Level $(if ($unhealthyCount -gt 0) { "ERROR" } else { "SUCCESS" })
Write-Log "Warning Components: $($summary.WarningComponents)" -Level $(if ($warningCount -gt 0) { "WARN" } else { "SUCCESS" })
Write-Log "Overall Status: $($summary.Status)" -Level $(if ($summary.Status -eq "PASS") { "SUCCESS" } elseif ($summary.Status -eq "WARNING") { "WARN" } else { "ERROR" })

exit $(if ($summary.Status -eq "FAIL") { 1 } else { 0 })

