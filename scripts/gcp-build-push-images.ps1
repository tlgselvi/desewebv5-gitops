# Docker Image Build ve Google Artifact Registry Push Scripti
# Dese EA Plan v6.8.0 - Cloud Migration Faz 5
# Tarih: 2025-01-27
# Kullanım: .\scripts\gcp-build-push-images.ps1

$ErrorActionPreference = "Stop"

# Konfigürasyon
$PROJECT_ID = "ea-plan-seo-project"
$REGION = "europe-west3"
$REPOSITORY = "dese-ea-plan-images"
$VERSION = "v6.8.0"
$REGISTRY = "$REGION-docker.pkg.dev"
$FULL_REGISTRY = "$REGISTRY/$PROJECT_ID/$REPOSITORY"

Write-Host "🚀 Docker Image Build ve Push" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""
Write-Host "Proje ID: $PROJECT_ID" -ForegroundColor White
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "Repository: $REPOSITORY" -ForegroundColor White
Write-Host "Version: $VERSION" -ForegroundColor White
Write-Host ""

# Proje kontrolü
try {
    $currentProject = gcloud config get-value project 2>$null
    if (-not $currentProject) {
        Write-Host "❌ Hata: Google Cloud proje ID'si bulunamadı!" -ForegroundColor Red
        Write-Host "   Lütfen 'gcloud config set project $PROJECT_ID' komutunu çalıştırın." -ForegroundColor Yellow
        exit 1
    }
    
    if ($currentProject -ne $PROJECT_ID) {
        Write-Host "⚠️  Uyarı: Aktif proje ($currentProject) farklı!" -ForegroundColor Yellow
        Write-Host "   Doğru projeye geçiliyor..." -ForegroundColor Yellow
        gcloud config set project $PROJECT_ID
    }
    
    Write-Host "✅ Proje ID: $currentProject" -ForegroundColor Green
} catch {
    Write-Host "❌ Hata: Google Cloud yapılandırması kontrol edilemedi!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 1. Artifact Registry API aktifleştirme
Write-Host "📦 Artifact Registry API aktifleştiriliyor..." -ForegroundColor Yellow
gcloud services enable artifactregistry.googleapis.com

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hata: Artifact Registry API aktifleştirilemedi!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Artifact Registry API aktif edildi" -ForegroundColor Green
Write-Host ""

# 2. Repository oluşturma
Write-Host "📦 Repository oluşturuluyor..." -ForegroundColor Yellow
$repoExists = gcloud artifacts repositories describe $REPOSITORY --location=$REGION --format="value(name)" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Repository '$REPOSITORY' zaten mevcut, atlanıyor..." -ForegroundColor Yellow
} else {
    gcloud artifacts repositories create $REPOSITORY `
      --repository-format=docker `
      --location=$REGION `
      --description="Dese EA Plan v6.8.0 Docker Images"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Hata: Repository oluşturulamadı!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Repository '$REPOSITORY' oluşturuldu" -ForegroundColor Green
}

Write-Host ""

# 3. Docker'ı yetkilendirme
Write-Host "📦 Docker yetkilendiriliyor..." -ForegroundColor Yellow
gcloud auth configure-docker $REGISTRY --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Hata: Docker yetkilendirilemedi!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker yetkilendirildi" -ForegroundColor Green
Write-Host ""

# 4. Image'ları build et ve push et
Write-Host "📦 Image'lar build ediliyor ve push ediliyor..." -ForegroundColor Yellow
Write-Host ""

# 4.1. API Image
Write-Host "🔨 dese-api image build ediliyor..." -ForegroundColor Cyan
docker build -t "${FULL_REGISTRY}/dese-api:${VERSION}" -t "${FULL_REGISTRY}/dese-api:latest" -f Dockerfile .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ dese-api build başarılı" -ForegroundColor Green
    Write-Host "📤 dese-api push ediliyor..." -ForegroundColor Cyan
    docker push "${FULL_REGISTRY}/dese-api:${VERSION}"
    docker push "${FULL_REGISTRY}/dese-api:latest"
    Write-Host "✅ dese-api push başarılı" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: dese-api build başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4.2. Frontend Image
Write-Host "🔨 dese-frontend image build ediliyor..." -ForegroundColor Cyan
docker build -t "${FULL_REGISTRY}/dese-frontend:${VERSION}" -t "${FULL_REGISTRY}/dese-frontend:latest" -f frontend/Dockerfile ./frontend

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ dese-frontend build başarılı" -ForegroundColor Green
    Write-Host "📤 dese-frontend push ediliyor..." -ForegroundColor Cyan
    docker push "${FULL_REGISTRY}/dese-frontend:${VERSION}"
    docker push "${FULL_REGISTRY}/dese-frontend:latest"
    Write-Host "✅ dese-frontend push başarılı" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: dese-frontend build başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4.3. FinBot Image (Python FastAPI)
Write-Host "🔨 dese-finbot image build ediliyor..." -ForegroundColor Cyan
if (Test-Path "deploy/finbot-v2/Dockerfile") {
    docker build -t "${FULL_REGISTRY}/dese-finbot:${VERSION}" -t "${FULL_REGISTRY}/dese-finbot:latest" -f deploy/finbot-v2/Dockerfile ./deploy/finbot-v2
} else {
    Write-Host "⚠️  FinBot Dockerfile bulunamadı, basit Python image oluşturuluyor..." -ForegroundColor Yellow
    
    # Dockerfile oluştur (geçici)
    $dockerfileContent = @"
FROM python:3.11-slim
WORKDIR /app
COPY finbot-forecast.py .
RUN pip install --no-cache-dir fastapi uvicorn
EXPOSE 8000
CMD ["uvicorn", "finbot-forecast:app", "--host", "0.0.0.0", "--port", "8000"]
"@
    
    $tempDockerfile = "deploy/finbot-v2/Dockerfile.temp"
    $dockerfileContent | Out-File -FilePath $tempDockerfile -Encoding UTF8
    
    docker build -t "${FULL_REGISTRY}/dese-finbot:${VERSION}" -t "${FULL_REGISTRY}/dese-finbot:latest" -f $tempDockerfile ./deploy/finbot-v2
    
    # Geçici Dockerfile'ı sil
    Remove-Item $tempDockerfile -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ dese-finbot build başarılı" -ForegroundColor Green
    Write-Host "📤 dese-finbot push ediliyor..." -ForegroundColor Cyan
    docker push "${FULL_REGISTRY}/dese-finbot:${VERSION}"
    docker push "${FULL_REGISTRY}/dese-finbot:latest"
    Write-Host "✅ dese-finbot push başarılı" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: dese-finbot build başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4.4. MuBot Image (Python)
Write-Host "🔨 dese-mubot image build ediliyor..." -ForegroundColor Cyan
if (Test-Path "deploy/mubot-v2/Dockerfile") {
    docker build -t "${FULL_REGISTRY}/dese-mubot:${VERSION}" -t "${FULL_REGISTRY}/dese-mubot:latest" -f deploy/mubot-v2/Dockerfile ./deploy/mubot-v2
} else {
    Write-Host "⚠️  MuBot Dockerfile bulunamadı, basit Python image oluşturuluyor..." -ForegroundColor Yellow
    
    # Dockerfile oluştur (geçici)
    $dockerfileContent = @"
FROM python:3.11-slim
WORKDIR /app
COPY mubot-ingestion.py .
RUN pip install --no-cache-dir flask requests
EXPOSE 8080
CMD ["python", "mubot-ingestion.py"]
"@
    
    $tempDockerfile = "deploy/mubot-v2/Dockerfile.temp"
    $dockerfileContent | Out-File -FilePath $tempDockerfile -Encoding UTF8
    
    docker build -t "${FULL_REGISTRY}/dese-mubot:${VERSION}" -t "${FULL_REGISTRY}/dese-mubot:latest" -f $tempDockerfile ./deploy/mubot-v2
    
    # Geçici Dockerfile'ı sil
    Remove-Item $tempDockerfile -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ dese-mubot build başarılı" -ForegroundColor Green
    Write-Host "📤 dese-mubot push ediliyor..." -ForegroundColor Cyan
    docker push "${FULL_REGISTRY}/dese-mubot:${VERSION}"
    docker push "${FULL_REGISTRY}/dese-mubot:latest"
    Write-Host "✅ dese-mubot push başarılı" -ForegroundColor Green
} else {
    Write-Host "❌ Hata: dese-mubot build başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Tüm image'lar başarıyla build edildi ve push edildi!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Push Edilen Image'lar:" -ForegroundColor Yellow
Write-Host "  - ${FULL_REGISTRY}/dese-api:${VERSION}" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-api:latest" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-frontend:${VERSION}" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-frontend:latest" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-finbot:${VERSION}" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-finbot:latest" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-mubot:${VERSION}" -ForegroundColor White
Write-Host "  - ${FULL_REGISTRY}/dese-mubot:latest" -ForegroundColor White
Write-Host ""
Write-Host "📝 Sonraki Adımlar:" -ForegroundColor Yellow
Write-Host "1. Repository'deki image'ları kontrol edin:" -ForegroundColor White
Write-Host "   gcloud artifacts docker images list ${FULL_REGISTRY}" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Deployment YAML'larında image URL'lerini güncelleyin:" -ForegroundColor White
Write-Host "   image: ${FULL_REGISTRY}/dese-api:${VERSION}" -ForegroundColor Cyan
Write-Host ""

