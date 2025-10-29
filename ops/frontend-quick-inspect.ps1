# ===============================================
# Frontend Quick Inspect Script (PowerShell)
# Similar to finbot-quick-inspect.ps1
# ===============================================

$NAMESPACE = "aiops"

Write-Host "`n🔍 Frontend Services Quick Inspect" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

# Auto-discover pods
$FRONTEND_POD = kubectl get pods -n $NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>&1 | Select-String -Pattern '\S+'
$DESE_WEB_POD = kubectl get pods -n $NAMESPACE -l app=dese-web -o jsonpath='{.items[0].metadata.name}' 2>&1 | Select-String -Pattern '\S+'

Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "-------------------`n" -ForegroundColor Gray
kubectl get pods,svc -n $NAMESPACE -l 'app in (frontend,dese-web)' 2>&1
Write-Host ""

if ($FRONTEND_POD) {
    Write-Host "📝 Frontend Logs (last 20 lines):" -ForegroundColor Yellow
    Write-Host "-----------------------------------`n" -ForegroundColor Gray
    kubectl logs $FRONTEND_POD -n $NAMESPACE --tail=20 2>&1
    Write-Host ""
}

if ($DESE_WEB_POD) {
    Write-Host "📝 Dese Web Logs (last 20 lines):" -ForegroundColor Yellow
    Write-Host "----------------------------------`n" -ForegroundColor Gray
    kubectl logs $DESE_WEB_POD -n $NAMESPACE --tail=20 2>&1
    Write-Host ""
}

Write-Host "🔌 Port-Forward Setup:" -ForegroundColor Yellow
Write-Host "----------------------`n" -ForegroundColor Gray
Write-Host "To access Frontend:" -ForegroundColor White
Write-Host "  kubectl port-forward svc/frontend 8083:80 -n $NAMESPACE" -ForegroundColor Cyan
Write-Host "  → http://localhost:8083`n" -ForegroundColor Gray
Write-Host "To access Dese Web:" -ForegroundColor White
Write-Host "  kubectl port-forward svc/dese-web 8084:80 -n $NAMESPACE" -ForegroundColor Cyan
Write-Host "  → http://localhost:8084`n" -ForegroundColor Gray
Write-Host "To access Prometheus:" -ForegroundColor White
Write-Host "  kubectl port-forward svc/prometheus 9090:9090 -n monitoring" -ForegroundColor Cyan
Write-Host "  → http://localhost:9090`n" -ForegroundColor Gray
Write-Host "📊 Prometheus Queries:" -ForegroundColor Yellow
Write-Host "----------------------`n" -ForegroundColor Gray
Write-Host '  up{app="frontend",namespace="aiops"}' -ForegroundColor Cyan
Write-Host '  up{app="dese-web",namespace="aiops"}`n' -ForegroundColor Cyan

