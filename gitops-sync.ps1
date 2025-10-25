# =========================================================
# Dese EA Plan v5.0 - GitOps Sync Script (PowerShell)
# =========================================================

Write-Host "🔄 GitOps Sync başlatılıyor..." -ForegroundColor Green
Write-Host "📅 $(Get-Date)" -ForegroundColor Cyan

# Monitoring namespace kontrolü
Write-Host "📋 Namespace kontrolü..." -ForegroundColor Yellow
$namespace = kubectl get namespace monitoring 2>$null
if (-not $namespace) {
    kubectl create namespace monitoring
    Write-Host "✅ Monitoring namespace oluşturuldu" -ForegroundColor Green
}

# Monitoring stack deployment
Write-Host "🚀 Monitoring stack güncelleniyor..." -ForegroundColor Yellow
kubectl apply -f prometheus-deployment.yaml
kubectl apply -f aiops-extensions.yaml  
kubectl apply -f seo-observer.yaml
kubectl apply -f tempo-config.yaml

# Durum kontrolü
Write-Host "`n📊 Pod durumları:" -ForegroundColor Cyan
kubectl get pods -n monitoring

Write-Host "`n🌐 Service durumları:" -ForegroundColor Cyan
kubectl get svc -n monitoring

Write-Host "`n✅ GitOps Sync tamamlandı!" -ForegroundColor Green
Write-Host "🔗 Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor Blue
Write-Host "📈 Prometheus: http://localhost:9090" -ForegroundColor Blue
