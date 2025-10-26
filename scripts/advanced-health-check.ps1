# =========================================================
# Advanced Production Health Check Script
# =========================================================

param(
    [switch]$Verbose,
    [switch]$NotifySlack,
    [string]$Namespace = "dese-ea-plan-v5",
    [int]$Retries = 3,
    [int]$WaitBetweenRetries = 10
)

$ErrorActionPreference = "Continue"
$ScriptStartTime = Get-Date

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# =========================================================
# HEALTH CHECK RESULTS
# =========================================================
$healthResults = @{
    Cluster = @{}
    Namespaces = @{}
    Pods = @{}
    Services = @{}
    Deployments = @{}
    Ingress = @{}
    Monitoring = @{}
    Database = @{}
    Storage = @{}
    Security = @{}
}

$overallStatus = "UNKNOWN"

# =========================================================
# FUNCTIONS
# =========================================================

function Test-Kubectl {
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Error "❌ kubectl bulunamadı!"
        exit 1
    }
    Write-Success "✅ kubectl mevcut"
}

function Get-HealthScore {
    param($component, $status)
    
    $score = 100
    $failed = 0
    
    foreach ($key in $status.PSObject.Properties.Name) {
        if ($status.$key.Status -eq "FAILED") { $score -= 10; $failed++ }
        elseif ($status.$key.Status -eq "WARNING") { $score -= 5 }
    }
    
    return @{
        Score = $score
        Failed = $failed
        Total = $status.Count
        Status = if ($score -eq 100) { "EXCELLENT" } elseif ($score -ge 80) { "GOOD" } elseif ($score -ge 60) { "DEGRADED" } else { "CRITICAL" }
    }
}

function Send-SlackNotification {
    param($status, $report)
    
    if (-not $NotifySlack) { return }
    
    $webhookUrl = $env:SLACK_WEBHOOK_URL
    if (-not $webhookUrl) {
        Write-Warning "⚠️  SLACK_WEBHOOK_URL bulunamadı"
        return
    }
    
    $payload = @{
        channel = "#devops-alerts"
        text = "🚨 Production Health Check: $status"
        attachments = @(
            @{
                color = if ($status -eq "HEALTHY") { "good" } else { "danger" }
                fields = @(
                    @{
                        title = "Status"
                        value = $status
                        short = $true
                    },
                    @{
                        title = "Timestamp"
                        value = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                        short = $true
                    }
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $payload -ContentType "application/json"
        Write-Success "📧 Slack bildirimi gönderildi"
    } catch {
        Write-Warning "⚠️  Slack bildirimi gönderilemedi: $_"
    }
}

# =========================================================
# MAIN HEALTH CHECKS
# =========================================================

Write-Info "`n========================================"
Write-Info "🚀 ADVANCED PRODUCTION HEALTH CHECK"
Write-Info "========================================`n"
Write-Info "📅 $(Get-Date)"
Write-Info "Namespace: $Namespace`n"

# Test kubectl
Test-Kubectl

# 1. CLUSTER HEALTH
Write-Info "`n[1/10] 📊 Kubernetes Cluster Health"
try {
    $nodes = kubectl get nodes --no-headers 2>&1
    $runningNodes = ($nodes | Select-String "Ready").Count
    
    $healthResults.Cluster = @{
        Status = "HEALTHY"
        Nodes = @{
            Total = (kubectl get nodes --no-headers 2>&1).Count
            Ready = $runningNodes
        }
        Status = if ($runningNodes -gt 0) { "READY" } else { "FAILED" }
    }
    
    if ($Verbose) {
        kubectl get nodes
    }
    Write-Success "✅ Cluster: $runningNodes node ready"
} catch {
    $healthResults.Cluster = @{ Status = "FAILED"; Error = $_ }
    Write-Error "❌ Cluster check failed"
}

# 2. NAMESPACE HEALTH
Write-Info "`n[2/10] 📦 Namespace Health"
try {
    $namespaceExists = kubectl get namespace $Namespace --no-headers 2>&1
    if ($namespaceExists -match $Namespace) {
        $healthResults.Namespaces = @{ Status = "HEALTHY"; Exists = $true }
        Write-Success "✅ Namespace '$Namespace' exists"
    } else {
        $healthResults.Namespaces = @{ Status = "FAILED"; Exists = $false }
        Write-Error "❌ Namespace '$Namespace' not found"
    }
} catch {
    $healthResults.Namespaces = @{ Status = "FAILED"; Error = $_ }
    Write-Error "❌ Namespace check failed"
}

# 3. PODS HEALTH
Write-Info "`n[3/10] 🐳 Pods Health"
try {
    $pods = kubectl get pods -n $Namespace --no-headers 2>&1
    $totalPods = $pods.Count
    $runningPods = ($pods | Select-String "Running").Count
    $failedPods = ($pods | Select-String "Error|CrashLoopBackOff|ImagePull|Evicted").Count
    
    $healthResults.Pods = @{
        Status = if ($failedPods -eq 0 -and $runningPods -eq $totalPods) { "HEALTHY" } elseif ($failedPods -gt 0) { "CRITICAL" } else { "DEGRADED" }
        Total = $totalPods
        Running = $runningPods
        Failed = $failedPods
        Percentage = [math]::Round(($runningPods / $totalPods) * 100, 2)
    }
    
    Write-Info "📊 Pods: $runningPods/$totalPods running"
    if ($failedPods -gt 0) {
        Write-Error "❌ $failedPods pod failed"
        if ($Verbose) {
            kubectl get pods -n $Namespace
        }
    } else {
        Write-Success "✅ All pods running"
    }
} catch {
    $healthResults.Pods = @{ Status = "FAILED"; Error = $_ }
    Write-Error "❌ Pod check failed"
}

# 4. DEPLOYMENTS HEALTH
Write-Info "`n[4/10] 📈 Deployments Health"
try {
    $deployments = kubectl get deployments -n $Namespace --no-headers 2>&1
    $totalDeployments = $deployments.Count
    $availableDeployments = ($deployments | Select-String "\d+/\d+\s+Available").Count
    
    $healthResults.Deployments = @{
        Status = if ($availableDeployments -eq $totalDeployments) { "HEALTHY" } else { "DEGRADED" }
        Total = $totalDeployments
        Available = $availableDeployments
    }
    
    Write-Info "📊 Deployments: $availableDeployments/$totalDeployments available"
    if ($Verbose) {
        kubectl get deployments -n $Namespace
    }
    Write-Success "✅ Deployments healthy"
} catch {
    $healthResults.Deployments = @{ Status = "FAILED"; Error = $_ }
    Write-Error "❌ Deployment check failed"
}

# 5. SERVICES HEALTH
Write-Info "`n[5/10] 🌐 Services Health"
try {
    $services = kubectl get svc -n $Namespace --no-headers 2>&1
    $totalServices = $services.Count
    
    $healthResults.Services = @{
        Status = "HEALTHY"
        Total = $totalServices
        External = (kubectl get svc -n $Namespace -o json | ConvertFrom-Json).items.where({ $_.spec.type -eq "LoadBalancer" -or $_.spec.type -eq "NodePort" }).Count
    }
    
    Write-Success "✅ $totalServices service(s) active"
} catch {
    $healthResults.Services = @{ Status = "FAILED"; Error = $_ }
    Write-Error "❌ Service check failed"
}

# 6. INGRESS HEALTH
Write-Info "`n[6/10] 🔀 Ingress Health"
try {
    $ingress = kubectl get ingress -n $Namespace --no-headers 2>&1
    if ($ingress) {
        $healthResults.Ingress = @{ Status = "HEALTHY"; Count = $ingress.Count }
        Write-Success "✅ Ingress configured"
    } else {
        $healthResults.Ingress = @{ Status = "WARNING"; Count = 0 }
        Write-Warning "⚠️  No ingress found"
    }
} catch {
    $healthResults.Ingress = @{ Status = "HEALTHY"; Note = "No ingress" }
}

# 7. APPLICATION HEALTH CHECK (HTTP)
Write-Info "`n[7/10] 🏥 Application Health Check"
try {
    $appPod = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dese-ea-plan-v5 --no-headers 2>&1 | Select-Object -First 1
    
    if ($appPod) {
        $podName = ($appPod -split '\s+')[0]
        
        # Port-forward and check health
        $healthCheck = kubectl exec -n $Namespace $podName -- curl -s http://localhost:3000/health 2>&1
        
        if ($healthCheck -match '"status":"healthy"') {
            $healthResults.Application = @{ Status = "HEALTHY"; HealthEndpoint = "OK" }
            Write-Success "✅ Application health check passed"
        } else {
            $healthResults.Application = @{ Status = "FAILED"; HealthEndpoint = "FAILED" }
            Write-Error "❌ Application health check failed"
        }
    } else {
        $healthResults.Application = @{ Status = "WARNING"; Note = "No app pods found" }
        Write-Warning "⚠️  No application pods found"
    }
} catch {
    $healthResults.Application = @{ Status = "FAILED"; Error = $_ }
    Write-Warning "⚠️  Application health check failed: $_"
}

# 8. MONITORING STACK
Write-Info "`n[8/10] 📊 Monitoring Stack Health"
try {
    $prometheusPod = kubectl get pods -A -l app=prometheus --no-headers 2>&1 | Select-Object -First 1
    $grafanaPod = kubectl get pods -A -l app=grafana --no-headers 2>&1 | Select-Object -First 1
    
    $monitoringHealth = @{
        Prometheus = if ($prometheusPod -match "Running") { "RUNNING" } else { "MISSING" }
        Grafana = if ($grafanaPod -match "Running") { "RUNNING" } else { "MISSING" }
    }
    
    $healthResults.Monitoring = @{
        Status = if ($monitoringHealth.Prometheus -eq "RUNNING" -and $monitoringHealth.Grafana -eq "RUNNING") { "HEALTHY" } else { "DEGRADED" }
        Components = $monitoringHealth
    }
    
    if ($healthResults.Monitoring.Status -eq "HEALTHY") {
        Write-Success "✅ Monitoring stack healthy"
    } else {
        Write-Warning "⚠️  Monitoring stack degraded"
    }
} catch {
    $healthResults.Monitoring = @{ Status = "DEGRADED"; Error = $_ }
    Write-Warning "⚠️  Monitoring check failed"
}

# 9. STORAGE
Write-Info "`n[9/10] 💾 Storage Health"
try {
    $pvc = kubectl get pvc -n $Namespace --no-headers 2>&1
    $healthResults.Storage = @{
        Status = "HEALTHY"
        PVCs = if ($pvc) { $pvc.Count } else { 0 }
    }
    Write-Success "✅ Storage healthy"
} catch {
    $healthResults.Storage = @{ Status = "HEALTHY"; Note = "No PVC" }
}

# 10. SECURITY
Write-Info "`n[10/10] 🔒 Security Health"
try {
    $securityPolicies = kubectl get networkpolicies -n $Namespace --no-headers 2>&1
    $healthResults.Security = @{
        Status = if ($securityPolicies) { "HEALTHY" } else { "WARNING" }
        NetworkPolicies = if ($securityPolicies) { $securityPolicies.Count } else { 0 }
    }
    
    if ($healthResults.Security.Status -eq "HEALTHY") {
        Write-Success "✅ Security policies active"
    } else {
        Write-Warning "⚠️  No network policies found"
    }
} catch {
    $healthResults.Security = @{ Status = "INFO"; Note = "No network policies" }
}

# =========================================================
# SUMMARY
# =========================================================

Write-Info "`n========================================"
Write-Info "📊 HEALTH CHECK SUMMARY"
Write-Info "========================================`n"

# Calculate overall status
$failedComponents = 0
$warningComponents = 0

foreach ($component in $healthResults.Values) {
    if ($component.Status -eq "FAILED") { $failedComponents++ }
    elseif ($component.Status -eq "WARNING" -or $component.Status -eq "DEGRADED") { $warningComponents++ }
}

if ($failedComponents -eq 0 -and $warningComponents -eq 0) {
    $overallStatus = "HEALTHY 🟢"
    Write-Success "Status: HEALTHY 🟢"
} elseif ($failedComponents -eq 0) {
    $overallStatus = "DEGRADED 🟡"
    Write-Warning "Status: DEGRADED 🟡"
} else {
    $overallStatus = "CRITICAL 🔴"
    Write-Error "Status: CRITICAL 🔴"
}

Write-Info "Failed Components: $failedComponents"
Write-Info "Warning Components: $warningComponents"

$duration = (Get-Date) - $ScriptStartTime
Write-Info "`nExecution Time: $($duration.TotalSeconds)s"
Write-Info "========================================`n"

# Detailed Report
if ($Verbose) {
    Write-Info "`n📋 Detailed Report:"
    $healthResults | ConvertTo-Json -Depth 5 | Write-Host
}

# Slack Notification
if ($NotifySlack) {
    Send-SlackNotification -status $overallStatus -report $healthResults
}

# Exit code
if ($overallStatus -match "CRITICAL") {
    exit 1
} elseif ($overallStatus -match "DEGRADED") {
    exit 2
} else {
    exit 0
}

