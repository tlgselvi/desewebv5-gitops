#!/bin/bash
# Kubernetes Google Cloud Credentials Secret Oluşturma Script
# Bu script gcp-credentials.json dosyasını Kubernetes Secret olarak oluşturur

set -e

echo "🔐 Kubernetes Google Cloud Credentials Secret Oluşturma"
echo ""

# 1. gcp-credentials.json dosyasını kontrol et
CREDENTIALS_FILE="gcp-credentials.json"
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "❌ $CREDENTIALS_FILE bulunamadı!"
    echo "   📝 Lütfen Google Cloud Console'dan Service Account JSON key indirin"
    echo "   📚 Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md"
    exit 1
fi

echo "✅ $CREDENTIALS_FILE bulundu"

# 2. kubectl bağlantısını kontrol et
echo ""
echo "🔍 Kubernetes cluster bağlantısı kontrol ediliyor..."
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Hata: kubectl cluster'a bağlanamıyor!"
    echo "   📝 Lütfen kubectl config dosyanızı kontrol edin"
    exit 1
fi

echo "✅ Kubernetes cluster'a bağlı"

# 3. Namespace kontrolü (varsayılan: default)
NAMESPACE="default"
echo ""
echo "📦 Namespace: $NAMESPACE"

# 4. Secret oluştur (gcp-credentials adında)
SECRET_NAME="gcp-credentials"
echo ""
echo "🔐 Secret oluşturuluyor: $SECRET_NAME"

# Mevcut secret'ı kontrol et
if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
    echo "⚠️  Secret '$SECRET_NAME' zaten mevcut, güncelleniyor..."
    kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE"
fi

# Secret oluştur (JSON key dosyasından)
kubectl create secret generic "$SECRET_NAME" \
    --from-file=gcp-credentials.json="$CREDENTIALS_FILE" \
    -n "$NAMESPACE"

if [ $? -eq 0 ]; then
    echo "✅ Secret '$SECRET_NAME' başarıyla oluşturuldu"
else
    echo "❌ Hata: Secret oluşturulamadı!"
    exit 1
fi

# 5. dese-secrets Secret'ına GSC environment variable'ları ekle
echo ""
echo "📝 dese-secrets Secret'ına GSC environment variable'ları ekleniyor..."

# JSON key dosyasından bilgileri oku
if command -v jq &> /dev/null; then
    PROJECT_ID=$(jq -r '.project_id' "$CREDENTIALS_FILE")
    CLIENT_EMAIL=$(jq -r '.client_email' "$CREDENTIALS_FILE")
    PRIVATE_KEY=$(jq -r '.private_key' "$CREDENTIALS_FILE")
    
    echo "   - Project ID: $PROJECT_ID"
    echo "   - Client Email: $CLIENT_EMAIL"
    
    # dese-secrets Secret'ını kontrol et
    if ! kubectl get secret dese-secrets -n "$NAMESPACE" &>/dev/null; then
        echo "⚠️  dese-secrets Secret'ı bulunamadı, oluşturuluyor..."
        kubectl create secret generic dese-secrets -n "$NAMESPACE"
    fi
    
    # GSC environment variable'larını ekle/güncelle
    echo "   📝 GSC_PROJECT_ID ekleniyor..."
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"$(echo -n "$PROJECT_ID" | base64 -w 0)\"}]" 2>/dev/null || \
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"replace\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"$(echo -n "$PROJECT_ID" | base64 -w 0)\"}]"
    
    echo "   📝 GSC_CLIENT_EMAIL ekleniyor..."
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"add\",\"path\":\"/data/GSC_CLIENT_EMAIL\",\"value\":\"$(echo -n "$CLIENT_EMAIL" | base64 -w 0)\"}]" 2>/dev/null || \
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"replace\",\"path\":\"/data/GSC_CLIENT_EMAIL\",\"value\":\"$(echo -n "$CLIENT_EMAIL" | base64 -w 0)\"}]"
    
    echo "   📝 GSC_PRIVATE_KEY ekleniyor..."
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PRIVATE_KEY\",\"value\":\"$(echo -n "$PRIVATE_KEY" | base64 -w 0)\"}]" 2>/dev/null || \
    kubectl patch secret dese-secrets -n "$NAMESPACE" --type='json' \
        -p="[{\"op\":\"replace\",\"path\":\"/data/GSC_PRIVATE_KEY\",\"value\":\"$(echo -n "$PRIVATE_KEY" | base64 -w 0)\"}]"
    
    echo "✅ dese-secrets Secret'ı güncellendi"
else
    echo "⚠️  Uyarı: jq yüklü değil, GSC environment variable'ları manuel eklenmeli"
    echo "   📝 Manuel olarak ekleyebilirsiniz:"
    echo "      kubectl patch secret dese-secrets -n $NAMESPACE --type='json' -p='[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"BASE64_VALUE\"}]'"
fi

# 6. Secret'ları listele
echo ""
echo "📋 Oluşturulan Secrets:"
kubectl get secrets -n "$NAMESPACE" | grep -E "gcp-credentials|dese-secrets"

echo ""
echo "✅ Google Cloud Credentials Secret'ları başarıyla oluşturuldu!"
echo ""
echo "📚 Sonraki adımlar:"
echo "   1. Deployment dosyalarını güncelleyin (volume mount ekleyin)"
echo "   2. Deployment'ları apply edin: kubectl apply -f k8s/"
echo "   3. Pod'ları kontrol edin: kubectl get pods"

