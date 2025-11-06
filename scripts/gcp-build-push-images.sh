#!/bin/bash
# Docker Image Build ve Google Artifact Registry Push Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 5
# Tarih: 2025-01-27
# Kullanım: chmod +x scripts/gcp-build-push-images.sh && ./scripts/gcp-build-push-images.sh

set -e

# Konfigürasyon
PROJECT_ID="ea-plan-seo-project"
REGION="europe-west3"
REPOSITORY="dese-ea-plan-images"
VERSION="v6.8.0"
REGISTRY="${REGION}-docker.pkg.dev"
FULL_REGISTRY="${REGISTRY}/${PROJECT_ID}/${REPOSITORY}"

echo "🚀 Docker Image Build ve Push"
echo "=============================="
echo ""
echo "Proje ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Repository: $REPOSITORY"
echo "Version: $VERSION"
echo ""

# kubectl bağlantısını kontrol et
if ! gcloud config get-value project &>/dev/null; then
    echo "❌ Hata: Google Cloud proje ID'si bulunamadı!"
    echo "   Lütfen 'gcloud config set project $PROJECT_ID' komutunu çalıştırın."
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Uyarı: Aktif proje ($CURRENT_PROJECT) farklı!"
    echo "   Doğru projeye geçiliyor..."
    gcloud config set project $PROJECT_ID
fi

echo "✅ Proje ID: $CURRENT_PROJECT"
echo ""

# 1. Artifact Registry API aktifleştirme
echo "📦 Artifact Registry API aktifleştiriliyor..."
gcloud services enable artifactregistry.googleapis.com

if [ $? -ne 0 ]; then
    echo "❌ Hata: Artifact Registry API aktifleştirilemedi!"
    exit 1
fi

echo "✅ Artifact Registry API aktif edildi"
echo ""

# 2. Repository oluşturma
echo "📦 Repository oluşturuluyor..."
if gcloud artifacts repositories describe $REPOSITORY --location=$REGION --format="value(name)" &>/dev/null; then
    echo "⚠️  Repository '$REPOSITORY' zaten mevcut, atlanıyor..."
else
    gcloud artifacts repositories create $REPOSITORY \
      --repository-format=docker \
      --location=$REGION \
      --description="Dese EA Plan v6.8.0 Docker Images"
    
    if [ $? -ne 0 ]; then
        echo "❌ Hata: Repository oluşturulamadı!"
        exit 1
    fi
    
    echo "✅ Repository '$REPOSITORY' oluşturuldu"
fi

echo ""

# 3. Docker'ı yetkilendirme
echo "📦 Docker yetkilendiriliyor..."
gcloud auth configure-docker $REGISTRY --quiet

if [ $? -ne 0 ]; then
    echo "❌ Hata: Docker yetkilendirilemedi!"
    exit 1
fi

echo "✅ Docker yetkilendirildi"
echo ""

# 4. Image'ları build et ve push et
echo "📦 Image'lar build ediliyor ve push ediliyor..."
echo ""

# 4.1. API Image
echo "🔨 dese-api image build ediliyor..."
docker build -t ${FULL_REGISTRY}/dese-api:${VERSION} -t ${FULL_REGISTRY}/dese-api:latest -f Dockerfile .

if [ $? -eq 0 ]; then
    echo "✅ dese-api build başarılı"
    echo "📤 dese-api push ediliyor..."
    docker push ${FULL_REGISTRY}/dese-api:${VERSION}
    docker push ${FULL_REGISTRY}/dese-api:latest
    echo "✅ dese-api push başarılı"
else
    echo "❌ Hata: dese-api build başarısız!"
    exit 1
fi

echo ""

# 4.2. Frontend Image
echo "🔨 dese-frontend image build ediliyor..."
docker build -t ${FULL_REGISTRY}/dese-frontend:${VERSION} -t ${FULL_REGISTRY}/dese-frontend:latest -f frontend/Dockerfile ./frontend

if [ $? -eq 0 ]; then
    echo "✅ dese-frontend build başarılı"
    echo "📤 dese-frontend push ediliyor..."
    docker push ${FULL_REGISTRY}/dese-frontend:${VERSION}
    docker push ${FULL_REGISTRY}/dese-frontend:latest
    echo "✅ dese-frontend push başarılı"
else
    echo "❌ Hata: dese-frontend build başarısız!"
    exit 1
fi

echo ""

# 4.3. FinBot Image (Python FastAPI)
echo "🔨 dese-finbot image build ediliyor..."
if [ -f "deploy/finbot-v2/Dockerfile" ]; then
    docker build -t ${FULL_REGISTRY}/dese-finbot:${VERSION} -t ${FULL_REGISTRY}/dese-finbot:latest -f deploy/finbot-v2/Dockerfile ./deploy/finbot-v2
else
    echo "⚠️  FinBot Dockerfile bulunamadı, basit Python image oluşturuluyor..."
    docker build -t ${FULL_REGISTRY}/dese-finbot:${VERSION} -t ${FULL_REGISTRY}/dese-finbot:latest \
      --build-arg VERSION=${VERSION} \
      -f - ./deploy/finbot-v2 <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY finbot-forecast.py .
RUN pip install --no-cache-dir fastapi uvicorn
EXPOSE 8000
CMD ["uvicorn", "finbot-forecast:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ dese-finbot build başarılı"
    echo "📤 dese-finbot push ediliyor..."
    docker push ${FULL_REGISTRY}/dese-finbot:${VERSION}
    docker push ${FULL_REGISTRY}/dese-finbot:latest
    echo "✅ dese-finbot push başarılı"
else
    echo "❌ Hata: dese-finbot build başarısız!"
    exit 1
fi

echo ""

# 4.4. MuBot Image (Python)
echo "🔨 dese-mubot image build ediliyor..."
if [ -f "deploy/mubot-v2/Dockerfile" ]; then
    docker build -t ${FULL_REGISTRY}/dese-mubot:${VERSION} -t ${FULL_REGISTRY}/dese-mubot:latest -f deploy/mubot-v2/Dockerfile ./deploy/mubot-v2
else
    echo "⚠️  MuBot Dockerfile bulunamadı, basit Python image oluşturuluyor..."
    docker build -t ${FULL_REGISTRY}/dese-mubot:${VERSION} -t ${FULL_REGISTRY}/dese-mubot:latest \
      --build-arg VERSION=${VERSION} \
      -f - ./deploy/mubot-v2 <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY mubot-ingestion.py .
RUN pip install --no-cache-dir flask requests
EXPOSE 8080
CMD ["python", "mubot-ingestion.py"]
EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ dese-mubot build başarılı"
    echo "📤 dese-mubot push ediliyor..."
    docker push ${FULL_REGISTRY}/dese-mubot:${VERSION}
    docker push ${FULL_REGISTRY}/dese-mubot:latest
    echo "✅ dese-mubot push başarılı"
else
    echo "❌ Hata: dese-mubot build başarısız!"
    exit 1
fi

echo ""
echo "✅ Tüm image'lar başarıyla build edildi ve push edildi!"
echo ""
echo "📋 Push Edilen Image'lar:"
echo "  - ${FULL_REGISTRY}/dese-api:${VERSION}"
echo "  - ${FULL_REGISTRY}/dese-api:latest"
echo "  - ${FULL_REGISTRY}/dese-frontend:${VERSION}"
echo "  - ${FULL_REGISTRY}/dese-frontend:latest"
echo "  - ${FULL_REGISTRY}/dese-finbot:${VERSION}"
echo "  - ${FULL_REGISTRY}/dese-finbot:latest"
echo "  - ${FULL_REGISTRY}/dese-mubot:${VERSION}"
echo "  - ${FULL_REGISTRY}/dese-mubot:latest"
echo ""
echo "📝 Sonraki Adımlar:"
echo "1. Repository'deki image'ları kontrol edin:"
echo "   gcloud artifacts docker images list ${FULL_REGISTRY}"
echo ""
echo "2. Deployment YAML'larında image URL'lerini güncelleyin:"
echo "   image: ${FULL_REGISTRY}/dese-api:${VERSION}"
echo ""

