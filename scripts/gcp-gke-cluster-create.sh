#!/bin/bash
# Google Kubernetes Engine (GKE) Cluster Oluşturma Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 2
# Tarih: 2025-01-27
# Kullanım: chmod +x scripts/gcp-gke-cluster-create.sh && ./scripts/gcp-gke-cluster-create.sh

set -e

echo "🚀 Google Kubernetes Engine (GKE) Cluster Oluşturma"
echo "=================================================="
echo ""

# Proje kontrolü
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ Hata: Google Cloud proje ID'si bulunamadı!"
    echo "   Lütfen 'gcloud config set project ea-plan-seo-project' komutunu çalıştırın."
    exit 1
fi

echo "✅ Proje ID: $CURRENT_PROJECT"
echo ""

# GKE API aktifleştirme
echo "📦 GKE API aktifleştiriliyor..."
gcloud services enable container.googleapis.com

if [ $? -ne 0 ]; then
    echo "❌ Hata: GKE API aktifleştirilemedi!"
    exit 1
fi

echo "✅ GKE API aktif edildi"
echo ""

# Cluster oluşturma
echo "📦 Cluster oluşturuluyor..."
echo "   Bu işlem 5-15 dakika sürebilir..."
echo ""

# Not: Quota kontrolü yapılmalı
# Eğer quota yetersizse, e2-medium yerine e2-small veya node sayısı azaltılabilir
gcloud container clusters create dese-ea-plan-cluster \
  --region=europe-west3 \
  --num-nodes=2 \
  --machine-type=e2-medium \
  --release-channel=regular \
  --disk-size=100

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cluster başarıyla oluşturuldu!"
    echo ""
    
    # Cluster bilgilerini göster
    echo "📋 Cluster Bilgileri:"
    gcloud container clusters describe dese-ea-plan-cluster \
      --region=europe-west3 \
      --format="table(name,location,machineType,currentNodeCount,status,currentMasterVersion)"
    
    echo ""
    echo "📝 Sonraki Adımlar:"
    echo "1. kubectl context'i ayarlayın:"
    echo "   gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3"
    echo ""
    echo "2. Cluster durumunu kontrol edin:"
    echo "   kubectl get nodes"
    echo ""
    echo "3. Cluster'ı kullanmaya başlayın!"
    echo ""
else
    echo ""
    echo "❌ Cluster oluşturma başarısız!"
    echo ""
    echo "💡 İpucu: Quota sorunu varsa:"
    echo "   - Machine type'ı e2-small yapın"
    echo "   - Node sayısını 1'e düşürün"
    echo "   - Disk size'ı azaltın (--disk-size=50)"
    echo ""
    exit 1
fi

