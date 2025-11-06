#!/bin/bash
# Kubernetes Secrets Oluşturma Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 4
# Tarih: 2025-01-27
# Kullanım: chmod +x scripts/gcp-create-secrets.sh && ./scripts/gcp-create-secrets.sh

set -e

echo "🔐 Kubernetes Secrets Oluşturma"
echo "================================"
echo ""

# kubectl bağlantısını kontrol et
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Hata: kubectl cluster'a bağlanamıyor!"
    echo "   Lütfen 'gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3' komutunu çalıştırın."
    exit 1
fi

echo "✅ kubectl cluster'a bağlı"
echo ""

# 1. Database Secret Oluşturma
echo "📦 Database Secret oluşturuluyor..."
if kubectl get secret dese-db-secret &>/dev/null; then
    echo "⚠️  Secret 'dese-db-secret' zaten mevcut, siliniyor..."
    kubectl delete secret dese-db-secret
fi

kubectl create secret generic dese-db-secret \
  --from-literal=DATABASE_URL="postgresql://postgres:GüvenliŞifre123!@34.159.32.249:5432/dese_db"

if [ $? -eq 0 ]; then
    echo "✅ Database Secret 'dese-db-secret' oluşturuldu"
else
    echo "❌ Hata: Database Secret oluşturulamadı!"
    exit 1
fi

echo ""

# 2. Redis Secret Oluşturma
echo "📦 Redis Secret oluşturuluyor..."
if kubectl get secret dese-redis-secret &>/dev/null; then
    echo "⚠️  Secret 'dese-redis-secret' zaten mevcut, siliniyor..."
    kubectl delete secret dese-redis-secret
fi

kubectl create secret generic dese-redis-secret \
  --from-literal=REDIS_URL="redis://10.146.144.75:6379"

if [ $? -eq 0 ]; then
    echo "✅ Redis Secret 'dese-redis-secret' oluşturuldu"
else
    echo "❌ Hata: Redis Secret oluşturulamadı!"
    exit 1
fi

echo ""

# 3. Secret'ları Listele
echo "📋 Oluşturulan Secrets:"
kubectl get secrets | grep -E "dese-db-secret|dese-redis-secret"

echo ""
echo "✅ Tüm Secrets başarıyla oluşturuldu!"
echo ""
echo "📝 Kullanım:"
echo "   Secret'ları Deployment'larınızda kullanmak için:"
echo ""
echo "   env:"
echo "     - name: DATABASE_URL"
echo "       valueFrom:"
echo "         secretKeyRef:"
echo "           name: dese-db-secret"
echo "           key: DATABASE_URL"
echo ""
echo "   env:"
echo "     - name: REDIS_URL"
echo "       valueFrom:"
echo "         secretKeyRef:"
echo "           name: dese-redis-secret"
echo "           key: REDIS_URL"
echo ""

