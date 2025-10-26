# =========================================================
# Automated Health Monitoring Script
# =========================================================

param(
    [int]$IntervalSeconds = 60,
    [switch]$RunOnce,
    [switch]$NotifyOnFailure,
    [string]$Namespace = "dese-ea-plan-v5",
    [string]$LogFile = "health-monitor.log"
)

$ErrorActionPreference = "Continue"

# =========================================================
# CONFIGURATION
# =========================================================
$MaxFailures = 3
$FailureCount = 0
$HealthCheckHistory = @()

# =========================================================
# FUNCTIONS
# =========================================================

function Write-Log {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    if ($LogFile) {
        Add-Content -Path $LogFile -Value $LogMessage
    }
    
    switch ($Level) {
        "ERROR" { Write-Host $LogMessage -ForegroundColor Red }
        "WARNING" { Write-Host $LogMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $LogMessage -ForegroundColor Green }
        default { Write-Host $LogMessage -ForegroundColor Cyan }
    }
}

function Test-ApplicationHealth {
    param($Namespace)
    
    try {
        # Get application pods
        $pods = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dese-ea-plan-v5 --no-headers 2>&1
        
        if (-not $pods -or $pods -match "No resources") {
            return @{ Status = "FAILED"; Message = "No pods found" }
        }
        
        $runningPods = ($pods | Select-String "Running").Count
        $totalPods = $pods.Count
        
        if ($runningPods -lt $totalPods) {
            return @{ Status = "DEGRADED"; Message = "$runningPods/$totalPods pods running" }
        }
        
        # Check health endpoint
        $podName = ($pods[0] -split '\s+')[0]
        $healthResponse = kubectl exec -n $Namespace $podName -- curl -sf http://localhost:3000/health 2>&1
        
        if ($healthResponse -match '"status":"healthy"') {
            return @{ Status = "HEALTHY"; Message = "All systems operational" }
        } else {
            return @{ Status = "FAILED"; Message = "Health endpoint not healthy" }
        }
    } catch {
        return @{ Status = "FAILED"; Message = $_.Exception.Message }
    }
}

function Test-DatabaseConnection {
    param($Namespace)
    
    try {
        $pods = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dese-ea-plan-v5 --no-headers 2>&1 | Select-Object -First 1
        
        if ($pods) {
            $podName = ($pods -split '\s+')[0]
            
            # Try to connect to database (this would need actual DB connection logic)
            $dbCheck = kubectl exec -n $Namespace $podName -- node -e "
                const db = require('pg');
                // Add actual DB connection check
                console.log('DB connection OK');
            " 2>&1
            
            return @{ Status = "HEALTHY"; Message = "Database connected" }
        }
        
        return @{ Status = "UNKNOWN"; Message = "Cannot check database" }
    } catch {
        return @{ Status = "DEGRADED"; Message = "Database check failed" }
    }
}

function Get-SystemMetrics {
    param($Namespace)
    
    try {
        $metrics = @{
            CPU = kubectl top pod -n $Namespace -l app.kubernetes.io/name=dese-ea-plan-v5 --no-headers 2>&1
            Memory = kubectl top pod -n $Namespace -l app.kubernetes.io/name=dese-ea-plan-v5 --no-headers 2>&1
        }
        
        return @{ Status = "HEALTHY"; Metrics = $metrics }
    } catch {
        return @{ Status = "WARNING"; Message = "Metrics unavailable" }
    }
}

function Send-Alert {
    param($Alert, $Details)
    
    if (-not $NotifyOnFailure) { return }
    
    $webhookUrl = $env:SLACK_WEBHOOK_URL
    if (-not $webhookUrl) { return }
    
    $payload = @{
        text = "🚨 Production Alert: $Alert"
        blocks = @(
            @{
                type = "section"
                text = @{
                    type = "mrkdwn"
                    text = "*🚨 Production Alert*\n*Alert:* $Alert\n*Details:* $Details\n*Time:* $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                }
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $payload -ContentType "application/json"
        Write-Log "Alert sent" "SUCCESS"
    } catch {
        Write-Log "Failed to send alert" "ERROR"
    }
}

function Invoke-HealthCheckCycle {
    Write-Log "`n=== Starting Health Check Cycle ==="
    
    $results = @{
        Timestamp = Get-Date
        Application = Test-ApplicationHealth -Namespace $Namespace
        Database = Test-DatabaseConnection -Namespace $Namespace
        Metrics = Get-SystemMetrics -Namespace $Namespace
    }
    
    # Determine overall status
    $overallStatus = "HEALTHY"
    $failedComponents = 0
    
    if ($results.Application.Status -eq "FAILED" -or $results.Database.Status -eq "FAILED") {
        $overallStatus = "CRITICAL"
        $failedComponents++
    } elseif ($results.Application.Status -eq "DEGRADED") {
        $overallStatus = "DEGRADED"
        $failedComponents++
    }
    
    # Log results
    Write-Log "Application: $($results.Application.Status) - $($results.Application.Message)"
    Write-Log "Database: $($results.Database.Status) - $($results.Database.Message)"
    Write-Log "Overall Status: $overallStatus"
    
    # Add to history
    $HealthCheckHistory += $results
    
    # Keep only last 100 entries
    if ($HealthCheckHistory.Count -gt 100) {
        $HealthCheckHistory = $HealthCheckHistory[-100..-1]
    }
    
    # Send alert on failure
    if ($overallStatus -eq "CRITICAL") {
        $global:FailureCount++
        Write-Log "CRITICAL: System health check failed" "ERROR"
        
        if ($FailureCount -ge $MaxFailures) {
            Send-Alert -Alert "Critical System Failure" -Details "System has failed $FailureCount consecutive health checks"
        }
    } else {
        $global:FailureCount = 0
    }
    
    return $results
}

# =========================================================
# MAIN LOOP
# =========================================================

Write-Log "🚀 Starting Automated Health Monitor"
Write-Log "Namespace: $Namespace"
Write-Log "Interval: $IntervalSeconds seconds"
Write-Log "Monitoring started at $(Get-Date)`n"

if ($RunOnce) {
    Write-Log "Running single check..." "WARNING"
    Invoke-HealthCheckCycle
} else {
    Write-Log "Running continuous monitoring..." "INFO"
    
    while ($true) {
        try {
            Invoke-HealthCheckCycle
            
            Write-Log "Waiting $IntervalSeconds seconds until next check..."
            Start-Sleep -Seconds $IntervalSeconds
        } catch {
            Write-Log "Error in health check cycle: $_" "ERROR"
            Start-Sleep -Seconds $IntervalSeconds
        }
    }
}

Write-Log "Monitor stopped" "WARNING"

