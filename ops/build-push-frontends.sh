#!/bin/bash
# ===============================================
# Build and Push Frontend Docker Images
# Similar to build-push-finbot-mubot.sh
# ===============================================

set -e

echo "🏗️  Building Frontend Docker Images..."
echo ""

REGISTRY="ghcr.io/cptsystems"

# 1️⃣ Build Frontend (frontend/)
echo "=== 1. Building frontend/ ==="
cd frontend

docker build -t "$REGISTRY/frontend:latest" .
docker tag "$REGISTRY/frontend:latest" "$REGISTRY/frontend:v6.x"
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Frontend image built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi
echo ""

# 2️⃣ Build Dese Web (dese-web/)
echo "=== 2. Building dese-web/ ==="
cd dese-web

docker build -t "$REGISTRY/dese-web:latest" .
docker tag "$REGISTRY/dese-web:latest" "$REGISTRY/dese-web:v6.x"
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Dese Web image built successfully"
else
    echo "❌ Dese Web build failed"
    exit 1
fi
echo ""

# 3️⃣ Login to GitHub Container Registry
echo "=== 3. Login to GitHub Container Registry ==="
echo "Checking if already logged in..."
if ! docker pull "$REGISTRY/frontend:latest" &>/dev/null; then
    echo "Please login to GitHub Container Registry:"
    echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    read -p "Press Enter after login..."
else
    echo "✅ Already logged in"
fi
echo ""

# 4️⃣ Push Images
echo "=== 4. Pushing Images ==="

echo "Pushing frontend:latest..."
docker push "$REGISTRY/frontend:latest"
docker push "$REGISTRY/frontend:v6.x"

echo "Pushing dese-web:latest..."
docker push "$REGISTRY/dese-web:latest"
docker push "$REGISTRY/dese-web:v6.x"

echo ""
echo "✅ All frontend images built and pushed successfully!"
echo ""
echo "📦 Images:"
echo "  $REGISTRY/frontend:latest"
echo "  $REGISTRY/frontend:v6.x"
echo "  $REGISTRY/dese-web:latest"
echo "  $REGISTRY/dese-web:v6.x"
echo ""
echo "🚀 Next step: Run deployment script:"
echo "  ./ops/deploy-frontends.sh"
echo ""

