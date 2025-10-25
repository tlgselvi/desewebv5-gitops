#!/bin/bash
# =========================================================
# Dese EA Plan v5.0 - GitOps Sync Script
# =========================================================

echo "🔄 GitOps Sync başlatılıyor..."
echo "📅 $(date)"

# Monitoring namespace kontrolü
echo "📋 Namespace kontrolü..."
kubectl get namespace monitoring > /dev/null 2>&1 || kubectl create namespace monitoring

# Monitoring stack deployment
echo "🚀 Monitoring stack güncelleniyor..."
kubectl apply -f prometheus-deployment.yaml
kubectl apply -f aiops-extensions.yaml  
kubectl apply -f seo-observer.yaml
kubectl apply -f tempo-config.yaml

# Durum kontrolü
echo "📊 Pod durumları:"
kubectl get pods -n monitoring

echo "🌐 Service durumları:"
kubectl get svc -n monitoring

echo "✅ GitOps Sync tamamlandı!"
echo "🔗 Grafana: http://localhost:3000 (admin/admin)"
echo "📈 Prometheus: http://localhost:9090"
