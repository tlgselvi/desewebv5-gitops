# ===============================================
# Build and Push Frontend Docker Images
# Similar to build-push-finbot-mubot.ps1
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🏗️  Building Frontend Docker Images...`n" -ForegroundColor Cyan

$REGISTRY = "ghcr.io/cptsystems"

# 1️⃣ Build Frontend (frontend/)
Write-Host "=== 1. Building frontend/ ===" -ForegroundColor Yellow
Set-Location frontend

docker build -t "$REGISTRY/frontend:latest" .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

docker tag "$REGISTRY/frontend:latest" "$REGISTRY/frontend:v6.x"
Set-Location ..
Write-Host ""

# 2️⃣ Build Dese Web (dese-web/)
Write-Host "=== 2. Building dese-web/ ===" -ForegroundColor Yellow
Set-Location dese-web

docker build -t "$REGISTRY/dese-web:latest" .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dese Web image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Dese Web build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

docker tag "$REGISTRY/dese-web:latest" "$REGISTRY/dese-web:v6.x"
Set-Location ..
Write-Host ""

# 3️⃣ Login to GitHub Container Registry
Write-Host "=== 3. Login to GitHub Container Registry ===" -ForegroundColor Yellow
Write-Host "Checking if already logged in..." -ForegroundColor Gray
$loginCheck = docker pull "$REGISTRY/frontend:latest" 2>&1 | Select-String -Pattern "unauthorized|denied"
if ($loginCheck) {
    Write-Host "Please login to GitHub Container Registry:" -ForegroundColor Yellow
    Write-Host "  echo $env:GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin" -ForegroundColor Cyan
    Write-Host "Press Enter after login..." -ForegroundColor Yellow
    Read-Host
} else {
    Write-Host "✅ Already logged in" -ForegroundColor Green
}
Write-Host ""

# 4️⃣ Push Images
Write-Host "=== 4. Pushing Images ===" -ForegroundColor Yellow

Write-Host "Pushing frontend:latest..." -ForegroundColor Gray
docker push "$REGISTRY/frontend:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend:latest pushed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend push failed" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing frontend:v6.x..." -ForegroundColor Gray
docker push "$REGISTRY/frontend:v6.x"

Write-Host "Pushing dese-web:latest..." -ForegroundColor Gray
docker push "$REGISTRY/dese-web:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dese Web:latest pushed" -ForegroundColor Green
} else {
    Write-Host "❌ Dese Web push failed" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing dese-web:v6.x..." -ForegroundColor Gray
docker push "$REGISTRY/dese-web:v6.x"

Write-Host ""
Write-Host "✅ All frontend images built and pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Images:" -ForegroundColor Cyan
Write-Host "  $REGISTRY/frontend:latest" -ForegroundColor White
Write-Host "  $REGISTRY/frontend:v6.x" -ForegroundColor White
Write-Host "  $REGISTRY/dese-web:latest" -ForegroundColor White
Write-Host "  $REGISTRY/dese-web:v6.x" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next step: Run deployment script:" -ForegroundColor Yellow
Write-Host "  ./ops/deploy-frontends.ps1" -ForegroundColor Cyan
Write-Host ""

