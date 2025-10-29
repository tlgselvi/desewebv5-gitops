#!/bin/bash
# ===============================================
# FinBot & MuBot Build & Push Script
# Bash Version
# ===============================================

set -e

echo "🐳 FinBot & MuBot Docker Build & Push"
echo ""

# Dizin kontrolü
FINBOT_DIR="./finbot"
MUBOT_DIR="./mubot"

if [ ! -d "$FINBOT_DIR" ]; then
    echo "❌ FinBot dizini bulunamadı: $FINBOT_DIR"
    echo "⚠️  Build işlemi atlanıyor"
    exit 1
fi

if [ ! -d "$MUBOT_DIR" ]; then
    echo "❌ MuBot dizini bulunamadı: $MUBOT_DIR"
    echo "⚠️  Build işlemi atlanıyor"
    exit 1
fi

echo "📂 Dizinler tespit edildi:"
echo "   FinBot: $FINBOT_DIR"
echo "   MuBot: $MUBOT_DIR"
echo ""

# Docker kontrolü
echo "=== 1. Docker Kontrolü ==="
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker çalışmıyor"
    exit 1
fi
echo "✅ Docker çalışıyor"
echo ""

# FinBot Build
echo "=== 2. FinBot Build ==="
echo "Building: ghcr.io/cptsystems/finbot:latest from $FINBOT_DIR"
docker build -t ghcr.io/cptsystems/finbot:latest "$FINBOT_DIR"

if [ $? -eq 0 ]; then
    echo "✅ FinBot build başarılı"
else
    echo "❌ FinBot build başarısız"
    exit 1
fi
echo ""

# MuBot Build
echo "=== 3. MuBot Build ==="
echo "Building: ghcr.io/cptsystems/mubot:latest from $MUBOT_DIR"
docker build -t ghcr.io/cptsystems/mubot:latest "$MUBOT_DIR"

if [ $? -eq 0 ]; then
    echo "✅ MuBot build başarılı"
else
    echo "❌ MuBot build başarısız"
    exit 1
fi
echo ""

# Push işlemleri
echo "=== 4. Image Push ==="

echo "Pushing: ghcr.io/cptsystems/finbot:latest"
docker push ghcr.io/cptsystems/finbot:latest || {
    echo "⚠️  FinBot push başarısız (login gerekebilir)"
    echo "   Login: echo \$GH_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
}

echo ""

echo "Pushing: ghcr.io/cptsystems/mubot:latest"
docker push ghcr.io/cptsystems/mubot:latest || {
    echo "⚠️  MuBot push başarısız (login gerekebilir)"
    echo "   Login: echo \$GH_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
}

echo ""

# Deployment update
echo "=== 5. Kubernetes Deployment Update ==="

kubectl set image deployment/finbot finbot=ghcr.io/cptsystems/finbot:latest -n aiops || \
    echo "⚠️  FinBot deployment güncellenemedi"

kubectl set image deployment/mubot mubot=ghcr.io/cptsystems/mubot:latest -n aiops || \
    echo "⚠️  MuBot deployment güncellenemedi"

echo ""

# Pod durumu
echo "=== 6. Pod Durumu ==="
sleep 5
kubectl get pods -n aiops | grep -E "finbot|mubot" || echo "Pod'lar henüz oluşmadı"

echo ""
echo "✅ Build & Push işlemi tamamlandı!"
echo ""
echo "📋 Sonraki Adımlar:"
echo "   • Pod'ların Running olduğunu kontrol: kubectl get pods -n aiops"
echo "   • Logları kontrol: kubectl logs -f <pod-name> -n aiops"
echo "   • Prometheus'da metrics: up{namespace=\"aiops\"}"
echo ""

