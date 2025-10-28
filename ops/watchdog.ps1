# ops/watchdog.ps1
# Continuous health monitoring and auto-restart for EA Plan v5.8.0 (Windows)

param(
    [int]$CheckInterval = 300,  # 5 minutes
    [int]$MaxFailures = 2
)

# Configuration
$OPS_SERVER_URL = "http://localhost:8000/api/v1/health"
$FRONTEND_URL = "http://localhost:3000/api/aiops/health"
$LOG_FILE = "logs/watchdog.log"
$FAILURE_COUNT = 0

# Create logs directory if it doesn't exist
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Logging function
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Health check function
function Test-Health {
    param(
        [string]$ServiceName,
        [string]$Url
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ $ServiceName health check PASSED"
            return $true
        } else {
            Write-Log "❌ $ServiceName health check FAILED (Status: $($response.StatusCode))"
            return $false
        }
    } catch {
        Write-Log "❌ $ServiceName health check FAILED (Error: $($_.Exception.Message))"
        return $false
    }
}

# Restart ops server function
function Restart-OpsServer {
    Write-Log "🔄 Restarting ops server..."
    
    # Kill existing ops server process
    $opsProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.CommandLine -like "*ops-server*" }
    if ($opsProcesses) {
        $opsProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
    
    # Start ops server in background
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "npm"
    $startInfo.Arguments = "run start:ops"
    $startInfo.WorkingDirectory = (Get-Location).Path
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.Start() | Out-Null
    
    Write-Log "✅ Ops server restarted (PID: $($process.Id))"
}

# Main watchdog loop
function Start-Watchdog {
    Write-Log "🚀 Starting EA Plan v5.8.0 Watchdog Monitor"
    Write-Log "📊 Monitoring: Ops Server ($OPS_SERVER_URL), Frontend ($FRONTEND_URL)"
    Write-Log "⏰ Check interval: ${CheckInterval}s, Max failures: $MaxFailures"
    
    while ($true) {
        $opsHealthy = Test-Health "Ops Server" $OPS_SERVER_URL
        $frontendHealthy = Test-Health "Frontend Proxy" $FRONTEND_URL
        
        # Handle failures
        if (!$opsHealthy -or !$frontendHealthy) {
            $script:FAILURE_COUNT++
            Write-Log "⚠️  Health check failure #$FAILURE_COUNT"
            
            if ($FAILURE_COUNT -ge $MaxFailures) {
                Write-Log "🚨 CRITICAL: $MaxFailures consecutive failures detected!"
                
                if (!$opsHealthy) {
                    Restart-OpsServer
                }
                
                # Reset failure count after restart
                $script:FAILURE_COUNT = 0
                
                # Send alert (placeholder for PagerDuty/Slack integration)
                Write-Log "📢 ALERT: System recovery actions initiated"
            }
        } else {
            # Reset failure count on success
            if ($FAILURE_COUNT -gt 0) {
                Write-Log "✅ System recovered, resetting failure count"
                $script:FAILURE_COUNT = 0
            }
        }
        
        # Wait before next check
        Start-Sleep -Seconds $CheckInterval
    }
}

# Signal handling
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Log "🛑 Watchdog monitor shutting down"
}

# Start the watchdog
try {
    Start-Watchdog
} catch {
    Write-Log "💥 Watchdog error: $($_.Exception.Message)"
    exit 1
}
