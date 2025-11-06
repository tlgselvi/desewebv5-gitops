#!/bin/bash
# NGINX Ingress Controller Kurulum Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 3
# Tarih: 2025-01-27
# Kullanım: chmod +x scripts/gcp-nginx-ingress-install.sh && ./scripts/gcp-nginx-ingress-install.sh

set -e

echo "🚀 NGINX Ingress Controller Kurulumu"
echo "===================================="
echo ""

# kubectl bağlantısını kontrol et
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Hata: kubectl cluster'a bağlanamıyor!"
    echo "   Lütfen 'gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3' komutunu çalıştırın."
    exit 1
fi

echo "✅ kubectl cluster'a bağlı"
echo ""

# Helm kontrolü
if ! command -v helm &> /dev/null; then
    echo "❌ Hata: Helm yüklü değil!"
    echo "   Lütfen Helm 3.10+ yükleyin."
    exit 1
fi

HELM_VERSION=$(helm version --short | cut -d' ' -f1 | sed 's/v//')
echo "✅ Helm yüklü: v$HELM_VERSION"
echo ""

# 1. Helm repo ekleme
echo "📦 Helm repo ekleniyor..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

if [ $? -ne 0 ]; then
    echo "❌ Hata: Helm repo eklenemedi!"
    exit 1
fi

echo "✅ ingress-nginx repo eklendi"
echo ""

# 2. Helm repo güncelleme
echo "📦 Helm repo güncelleniyor..."
helm repo update

if [ $? -ne 0 ]; then
    echo "❌ Hata: Helm repo güncellenemedi!"
    exit 1
fi

echo "✅ Helm repo güncellendi"
echo ""

# 3. Namespace oluşturma
echo "📦 Namespace oluşturuluyor..."
if kubectl get namespace ingress-nginx &>/dev/null; then
    echo "⚠️  Namespace 'ingress-nginx' zaten mevcut, atlanıyor..."
else
    kubectl create namespace ingress-nginx
    
    if [ $? -ne 0 ]; then
        echo "❌ Hata: Namespace oluşturulamadı!"
        exit 1
    fi
    
    echo "✅ Namespace 'ingress-nginx' oluşturuldu"
fi

echo ""

# 4. NGINX Ingress Controller kurulumu
echo "📦 NGINX Ingress Controller kuruluyor..."
echo "   Bu işlem 1-2 dakika sürebilir..."
echo ""

helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ NGINX Ingress Controller başarıyla kuruldu!"
    echo ""
    
    # Pod durumunu kontrol et
    echo "📋 Pod Durumu:"
    kubectl get pods -n ingress-nginx
    
    echo ""
    echo "📋 Service Durumu:"
    kubectl get svc -n ingress-nginx
    
    echo ""
    echo "📋 IngressClass Durumu:"
    kubectl get ingressclass
    
    echo ""
    echo "📝 Sonraki Adımlar:"
    echo "1. LoadBalancer External IP'yi alın (birkaç dakika sürebilir):"
    echo "   kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
    echo ""
    echo "2. Ingress resource'larınızı oluşturun (örnek: docs/GCP_MIGRATION_FAZ3_INGRESS.md)"
    echo ""
    echo "3. DNS kayıtlarınızı External IP'ye yönlendirin"
    echo ""
    echo "⚠️  Not: LoadBalancer External IP atanması 2-5 dakika sürebilir."
    echo ""
else
    echo ""
    echo "❌ NGINX Ingress Controller kurulumu başarısız!"
    exit 1
fi

