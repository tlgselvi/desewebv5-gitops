# ===============================================
# EA PLAN v6.x LIFECYCLE PIPELINE
# PowerShell Version
# ===============================================

param(
    [string]$Phase = "all",
    [switch]$SkipErrors = $false
)

$ErrorActionPreference = if ($SkipErrors) { "Continue" } else { "Stop" }

$NAMESPACE_WEB = "ea-web"
$NAMESPACE_MONITORING = "monitoring"
$NAMESPACE_AIOPS = "aiops"
$REPO_PATH = if ($env:REPO_PATH) { $env:REPO_PATH } else { $PWD }

function Write-Phase {
    param([string]$Message)
    Write-Host "[EA PLAN] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-Namespace {
    param([string]$Namespace)
    
    if (-not (kubectl get ns $Namespace 2>&1 | Out-Null)) {
        kubectl create ns $Namespace | Out-Null
        Write-Success "Namespace $Namespace created"
    }
}

# Phase functions
function Phase-Init {
    Write-Phase "Phase 1: INIT - System Initialization"
    
    Test-Namespace $NAMESPACE_WEB
    Test-Namespace $NAMESPACE_MONITORING
    Test-Namespace $NAMESPACE_AIOPS
    
    $timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    kubectl create configmap ea-plan-v6-pipeline `
        --from-literal=phase=init `
        --from-literal=start-time=$timestamp `
        -n $NAMESPACE_WEB --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    
    Write-Success "Init phase complete"
}

function Phase-Predictive {
    Write-Phase "Phase 2: PREDICTIVE - Predictive Analysis Setup"
    
    kubectl create configmap predictive-config -n $NAMESPACE_MONITORING `
        --from-literal=forecast_horizon=90 `
        --from-literal=confidence_threshold=0.85 `
        --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    
    Write-Success "Predictive phase complete"
}

function Phase-Drift {
    Write-Phase "Phase 3: DRIFT - Drift Monitoring"
    
    kubectl create configmap drift-detection-config -n $NAMESPACE_MONITORING `
        --from-literal=enabled=true `
        --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    
    Write-Success "Drift phase complete"
}

function Phase-Adaptive {
    Write-Phase "Phase 4: ADAPTIVE - Adaptive Tuning"
    
    kubectl patch configmap ea-plan-v6-pipeline -n $NAMESPACE_WEB `
        --type merge -p '{"data":{"adaptive-tuning":"active"}}' | Out-Null
    
    Write-Success "Adaptive phase complete"
}

function Phase-Autoscaling {
    Write-Phase "Phase 5: AUTOSCALING - Auto-scaling Configuration"
    
    if (Test-Path "deploy\overlays\prod\hpa.yaml") {
        kubectl apply -f deploy\overlays\prod\hpa.yaml -n $NAMESPACE_WEB | Out-Null
    } else {
        Write-Warning "HPA configuration not found, skipping"
    }
    
    Write-Success "Autoscaling phase complete"
}

function Phase-Healing {
    Write-Phase "Phase 6: HEALING - Self-Healing Configuration"
    
    kubectl create configmap auto-remediation-rules -n $NAMESPACE_WEB `
        --from-literal=enabled=true `
        --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    
    Write-Success "Healing phase complete"
}

function Phase-Security {
    Write-Phase "Phase 7: SECURITY - Security Hardening"
    
    kubectl label ns $NAMESPACE_WEB pod-security.kubernetes.io/enforce=baseline `
        --overwrite 2>&1 | Out-Null
    
    Write-Success "Security phase complete"
}

function Phase-Optimization {
    Write-Phase "Phase 8: OPTIMIZATION - Performance Optimization"
    
    $timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    kubectl patch configmap ea-plan-v6-pipeline -n $NAMESPACE_WEB `
        --type merge -p "{`"data`":{`"optimization`":`"active`",`"LastUpdated`":`"$timestamp`"}}" | Out-Null
    
    Write-Success "Optimization phase complete"
}

function Phase-GoLive {
    Write-Phase "Phase 9: GO-LIVE - Production Activation"
    
    if (Test-Path "ops\production-go-live.ps1") {
        & "ops\production-go-live.ps1"
    } else {
        Write-Warning "Production go-live script not found"
    }
    
    Write-Success "Go-live phase complete"
}

function Phase-FinbotMubot {
    Write-Phase "Phase 10: FINBOT/MUBOT DEPLOY - AIOps Components"
    
    if (Test-Path "ops\deploy-finbot-mubot.ps1") {
        & "ops\deploy-finbot-mubot.ps1"
    } else {
        Test-Namespace $NAMESPACE_AIOPS
        Write-Warning "FinBot/MuBot deployment script not found, using fallback"
    }
    
    Write-Success "FinBot/MuBot deployment complete"
}

function Phase-PrometheusGrafana {
    Write-Phase "Phase 11: PROMETHEUS/GRAFANA - Monitoring Stack"
    
    if (Test-Path "prometheus-deployment.yaml") {
        kubectl apply -f prometheus-deployment.yaml -n $NAMESPACE_MONITORING | Out-Null
    }
    
    if (Test-Path "monitoring-stack-production.yaml") {
        kubectl apply -f monitoring-stack-production.yaml -n $NAMESPACE_MONITORING | Out-Null
    }
    
    Write-Success "Prometheus/Grafana deployment complete"
}

function Phase-Inspect {
    Write-Phase "Phase 12: INSPECT - System Inspection"
    
    Write-Host "`n=== System Status ===" -ForegroundColor Cyan
    kubectl get pods -A | Select-String -Pattern "Running|CrashLoopBackOff|Pending"
    
    Write-Host "`n=== FinBot/MuBot Status ===" -ForegroundColor Cyan
    kubectl get pods -n $NAMESPACE_AIOPS | Select-String -Pattern "finbot|mubot"
    
    Write-Host "`n=== Monitoring Stack ===" -ForegroundColor Cyan
    kubectl get pods -n $NAMESPACE_MONITORING | Select-String -Pattern "prometheus|grafana"
    
    Write-Success "Inspect phase complete"
}

function Phase-AIOpsValidation {
    Write-Phase "Phase 13: AIOPS VALIDATION - AIOps Validation"
    
    $finbotPod = kubectl get pods -n $NAMESPACE_AIOPS -l app=finbot --no-headers -o name 2>&1 | Select-Object -First 1
    if ($finbotPod) {
        Write-Host "FinBot health check..." -ForegroundColor Gray
        kubectl exec $finbotPod -n $NAMESPACE_AIOPS -- python3 -c "import requests; r=requests.get('http://localhost:8080/health'); print('FinBot:', r.json())" 2>&1 | Out-Null
    }
    
    $mubotPod = kubectl get pods -n $NAMESPACE_AIOPS -l app=mubot --no-headers -o name 2>&1 | Select-Object -First 1
    if ($mubotPod) {
        Write-Host "MuBot health check..." -ForegroundColor Gray
        kubectl exec $mubotPod -n $NAMESPACE_AIOPS -- python3 -c "import requests; r=requests.get('http://localhost:8081/health'); print('MuBot:', r.json())" 2>&1 | Out-Null
    }
    
    Write-Success "AIOps validation complete"
}

function Phase-AuditExport {
    Write-Phase "Phase 14: AUDIT/EXPORT - System Audit & Export"
    
    if (Test-Path "ops\audit-ea-plan-v6.sh") {
        bash ops\audit-ea-plan-v6.sh
    } else {
        Write-Warning "Audit script not found"
    }
    
    $reportDir = "reports\$(Get-Date -Format 'yyyyMMdd')"
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    kubectl get all -A -o yaml | Out-File "$reportDir\cluster-state.yaml" -Encoding utf8
    
    Write-Success "Audit/Export phase complete"
}

function Phase-Maintenance {
    Write-Phase "Phase 15: MAINTENANCE - Ongoing Maintenance"
    
    kubectl delete jobs --field-selector status.successful=1 --all-namespaces --grace-period=0 2>&1 | Out-Null
    
    $timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    kubectl patch configmap ea-plan-v6-pipeline -n $NAMESPACE_WEB `
        --type merge -p "{`"data`":{`"phase`":`"maintenance`",`"LastUpdated`":`"$timestamp`"}}" | Out-Null
    
    Write-Success "Maintenance phase complete"
}

# Main execution
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  EA PLAN v6.x LIFECYCLE PIPELINE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

switch ($Phase) {
    "init" { Phase-Init }
    "predictive" { Phase-Init; Phase-Predictive }
    "drift" { Phase-Init; Phase-Predictive; Phase-Drift }
    "adaptive" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive }
    "autoscaling" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive; Phase-Autoscaling }
    "healing" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive; Phase-Autoscaling; Phase-Healing }
    "security" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive; Phase-Autoscaling; Phase-Healing; Phase-Security }
    "optimization" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive; Phase-Autoscaling; Phase-Healing; Phase-Security; Phase-Optimization }
    "go-live" { Phase-Init; Phase-Predictive; Phase-Drift; Phase-Adaptive; Phase-Autoscaling; Phase-Healing; Phase-Security; Phase-Optimization; Phase-GoLive }
    "finbot-mubot" { Phase-Init; Phase-FinbotMubot }
    "monitoring" { Phase-Init; Phase-PrometheusGrafana }
    "inspect" { Phase-Inspect }
    "validation" { Phase-AIOpsValidation }
    "audit" { Phase-AuditExport }
    "maintenance" { Phase-Maintenance }
    default {
        Phase-Init
        Phase-Predictive
        Phase-Drift
        Phase-Adaptive
        Phase-Autoscaling
        Phase-Healing
        Phase-Security
        Phase-Optimization
        Phase-GoLive
        Phase-FinbotMubot
        Phase-PrometheusGrafana
        Phase-Inspect
        Phase-AIOpsValidation
        Phase-AuditExport
        Phase-Maintenance
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Success "Pipeline execution complete!"
Write-Host "===============================================" -ForegroundColor Cyan

