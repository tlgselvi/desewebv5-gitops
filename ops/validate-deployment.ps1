# Dese EA Plan v5.6 - Post-Deploy Validation Script (PowerShell)

$ErrorActionPreference = "Continue"

$NAMESPACE = "dese-ea-plan-v5"
$MONITORING_NAMESPACE = "monitoring"
$TIMEOUT = 120

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Dese EA Plan v5.6 - Post-Deploy Validation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pod durum kontrolü
Write-Host "1️⃣ Checking Pod Status..." -ForegroundColor Yellow
Write-Host "---------------------------"
kubectl get pods -n $NAMESPACE -o wide
Write-Host ""

# Check if all pods are running
$pods = kubectl get pods -n $NAMESPACE -o json | ConvertFrom-Json
$runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
$totalPods = $pods.items.Count

if ($runningPods -eq $totalPods) {
    Write-Host "✓ All pods are running" -ForegroundColor Green
} else {
    Write-Host "✗ Some pods are not running" -ForegroundColor Red
}
Write-Host ""

# 2. Deployment Health
Write-Host "2️⃣ Checking Deployment Status..." -ForegroundColor Yellow
Write-Host "---------------------------"
Write-Host "Backend deployment:"
try {
    kubectl rollout status deployment/cpt-ajan-backend -n $NAMESP托管 --timeout=${TIMEOUT}s 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backend deployment is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend deployment health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error checking backend deployment" -ForegroundColor Red
}

Write-Host "Frontend deployment:"
try {
    kubectl rollout status deployment/cpt-ajan-frontend -n $NAMESPACE --timeout=${TIMEOUT}s 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend deployment is healthy" -ForegroundColor Green
    } else {
        Write-Host "✗ Frontend deployment health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error checking frontend deployment" -ForegroundColor Red
}
Write-Host ""

# 3. Service Monitor doğrulama
Write-Host "3️⃣ Checking ServiceMonitor..." -ForegroundColor Yellow
Write-Host "---------------------------"
kubectl get servicemonitor -n $MONITORING_NAMESPACE 2>&1 | Select-String "cpt-ajan-backend"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ ServiceMonitor exists" -ForegroundColor Green
} else {
    Write-Host "✗ ServiceMonitor not found" -ForegroundColor Red
}
Write-Host ""

# 4. Services
Write-Host "4️⃣ Checking Services..." -ForegroundColor Yellow
Write-Host "---------------------------"
kubectl get svc -n $NAMESPACE
Write-Host ""

# 5. Check Logs
Write-Host "5️⃣ Checking Logs for Errors..." -ForegroundColor Yellow
Write-Host "---------------------------"
Write-Host "Backend logs (last 20 lines):"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-backend --tail=20 2>&1
Write-Host ""

Write-Host "Frontend logs (last 20 lines):"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-frontend --tail=20 2>&1
Write-Host ""

# Check for AIOps events
Write-Host "Checking for AIOps events:"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-backend --tail=100 2>&1 | Select-String "AIOPS"
Write-Host ""

# 6. Events
Write-Host "6️⃣ Recent Events..." -ForegroundColor Yellow
Write-Host "---------------------------"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | Select-Object -Last 10
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "- Pods Running: $runningPods/$totalPods" -ForegroundColor Cyan
Write-Host ""
Write-Host "For Prometheus and Grafana validation:" -ForegroundColor Yellow
Write-Host "  kubectl port-forward svc/prometheus-k8s -n monitoring 9090:9090" -ForegroundColor Gray
Write-Host "  kubectl port-forward svc/grafana -n monitoring 3000:3000" -ForegroundColor Gray
Write-Host ""

