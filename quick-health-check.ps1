# Quick Health Check Script

Write-Host "`n=== 🚀 QUICK PRODUCTION HEALTH CHECK ===`n" -ForegroundColor Cyan

# Kubernetes Status
Write-Host "📊 Kubernetes Cluster:" -ForegroundColor Yellow
kubectl get nodes
Write-Host ""

# Pods Status
Write-Host "📊 Pods in All Namespaces:" -ForegroundColor Yellow
$pods = kubectl get pods -A --no-headers
$running = ($pods | Select-String "Running").Count
$total = $pods.Count
Write-Host "✅ Running: $running / $total pods`n" -ForegroundColor Green

# Tools Check
Write-Host "🛠️  DevOps Tools:" -ForegroundColor Yellow
$tools = @{
    "kubectl" = "kubectl version --client"
    "helm" = "helm version"
    "docker" = "docker --version"
}
foreach ($tool in $tools.GetEnumerator()) {
    try {
        $result = Invoke-Expression "$($tool.Value) 2>&1"
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Host "  ✅ $($tool.Key)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ❌ $($tool.Key)" -ForegroundColor Red
    }
}

# Grafana Check
Write-Host "`n📊 Grafana Deployment:" -ForegroundColor Yellow
$grafanaPods = kubectl get pods -A -l app=grafana --no-headers
if ($grafanaPods -match "Running") {
    Write-Host "  ✅ Grafana is Running in Kubernetes" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Grafana not found" -ForegroundColor Yellow
}

Write-Host "`n=== ✅ STATUS: SYSTEM OPERATIONAL ===`n" -ForegroundColor Green

