#!/usr/bin/env pwsh
# Production Deployment Script for v6.8.0
# Deploys dese-ea-plan-v5:6.8.0 to production using Docker Hub

param(
    [switch]$SkipLogin = $false,
    [switch]$SkipPush = $false,
    [switch]$SkipDeploy = $false,
    [string]$Namespace = "dese-ea-plan-v5"
)

$ErrorActionPreference = "Stop"
$IMAGE_NAME = "docker.io/deseh/dese-ea-plan-v5:6.8.0"
$LOCAL_IMAGE = "dese-ea-plan-v5:6.8.0"

Write-Host "=== Production Deployment v6.8.0 ===" -ForegroundColor Cyan
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Gray
Write-Host ""

# Step 1: Docker Hub Login
if (-not $SkipLogin) {
    Write-Host "[1/5] Docker Hub Login..." -ForegroundColor Yellow
    Write-Host "Please enter your Docker Hub credentials:" -ForegroundColor Gray
    docker login -u deseh
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker login failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Docker Hub login successful" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[1/5] Docker Hub Login... SKIPPED" -ForegroundColor Gray
    Write-Host ""
}

# Step 2: Verify local image exists
Write-Host "[2/5] Verifying local image..." -ForegroundColor Yellow
$imageExists = docker images $LOCAL_IMAGE --format "{{.Repository}}:{{.Tag}}" 2>$null
if (-not $imageExists) {
    Write-Host "❌ Local image $LOCAL_IMAGE not found" -ForegroundColor Red
    Write-Host "Please build the image first: docker build -t $LOCAL_IMAGE ." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Local image found: $LOCAL_IMAGE" -ForegroundColor Green
Write-Host ""

# Step 3: Tag image
Write-Host "[3/5] Tagging image for Docker Hub..." -ForegroundColor Yellow
docker tag $LOCAL_IMAGE $IMAGE_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Image tagging failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image tagged: $IMAGE_NAME" -ForegroundColor Green
Write-Host ""

# Step 4: Push image
if (-not $SkipPush) {
    Write-Host "[4/5] Pushing image to Docker Hub..." -ForegroundColor Yellow
    docker push $IMAGE_NAME
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Image push failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Image pushed successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[4/5] Image Push... SKIPPED" -ForegroundColor Gray
    Write-Host ""
}

# Step 5: Deploy to Kubernetes
if (-not $SkipDeploy) {
    Write-Host "[5/5] Deploying to Kubernetes..." -ForegroundColor Yellow
    
    # Check if namespace exists
    $nsExists = kubectl get namespace $Namespace -o name 2>$null
    if (-not $nsExists) {
        Write-Host "Creating namespace: $Namespace" -ForegroundColor Gray
        kubectl create namespace $Namespace
    }
    
    # Apply manifests
    Write-Host "Applying Kubernetes manifests..." -ForegroundColor Gray
    kubectl apply -f k8s/ -n $Namespace
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Kubernetes deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Kubernetes manifests applied" -ForegroundColor Green
    Write-Host ""
    
    # Wait for rollout
    Write-Host "Waiting for deployment rollout..." -ForegroundColor Yellow
    kubectl rollout status deployment/dese-ea-plan-v5 -n $Namespace --timeout=5m
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Deployment rollout timeout or failed" -ForegroundColor Yellow
        Write-Host "Check deployment status manually:" -ForegroundColor Gray
        Write-Host "  kubectl get pods -n $Namespace" -ForegroundColor Cyan
        Write-Host "  kubectl describe deployment/dese-ea-plan-v5 -n $Namespace" -ForegroundColor Cyan
    } else {
        Write-Host "✅ Deployment rollout successful" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[5/5] Kubernetes Deploy... SKIPPED" -ForegroundColor Gray
    Write-Host ""
}

# Step 6: Health Checks
Write-Host "=== Post-Deployment Verification ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pod Status:" -ForegroundColor Yellow
kubectl get pods -n $Namespace -l app=dese-ea-plan-v5

Write-Host ""
Write-Host "Service Status:" -ForegroundColor Yellow
kubectl get svc -n $Namespace -l app=dese-ea-plan-v5

Write-Host ""
Write-Host "Deployment Status:" -ForegroundColor Yellow
kubectl get deployment dese-ea-plan-v5 -n $Namespace

Write-Host ""
Write-Host "=== Health Check Commands ===" -ForegroundColor Cyan
Write-Host "Get service IP:" -ForegroundColor Gray
Write-Host "  kubectl get svc dese-ea-plan-v5 -n $Namespace -o jsonpath='{.spec.clusterIP}'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test health endpoint:" -ForegroundColor Gray
Write-Host "  kubectl port-forward svc/dese-ea-plan-v5 8080:80 -n $Namespace" -ForegroundColor Cyan
Write-Host "  curl http://localhost:8080/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "MCP Server Health Checks:" -ForegroundColor Gray
Write-Host "  curl http://localhost:8080/api/v1/mcp/finbot/health" -ForegroundColor Cyan
Write-Host "  curl http://localhost:8080/api/v1/mcp/mubot/health" -ForegroundColor Cyan
Write-Host "  curl http://localhost:8080/api/v1/mcp/dese/health" -ForegroundColor Cyan
Write-Host "  curl http://localhost:8080/api/v1/mcp/observability/health" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Deployment process completed!" -ForegroundColor Green

