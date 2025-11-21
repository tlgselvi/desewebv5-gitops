# Production Deployment Script - Dese EA Plan v6.8.2
# Usage: .\scripts\deploy-production.ps1 [-Target backend|frontend|all]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "frontend", "all")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

$VERSION = "v6.8.2"
$REGISTRY = "europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images"
$NAMESPACE = "default"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $commands = @("kubectl", "docker", "gcloud")
    foreach ($cmd in $commands) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            Write-Error "$cmd is not installed"
            exit 1
        }
    }
    
    Write-Success "All prerequisites are installed"
}

# Authenticate with Google Cloud
function Invoke-GCloudAuth {
    Write-Info "Authenticating with Google Cloud..."
    gcloud auth configure-docker europe-west3-docker.pkg.dev
    Write-Success "Google Cloud authentication successful"
}

# Check secrets
function Test-Secrets {
    Write-Info "Checking Kubernetes secrets..."
    
    $secrets = @("dese-db-secret", "dese-redis-secret")
    foreach ($secret in $secrets) {
        $result = kubectl get secret $secret -n $NAMESPACE 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "$secret not found. Please create it:"
            Write-Host "kubectl create secret generic $secret --from-literal=KEY='value'"
            exit 1
        }
    }
    
    Write-Success "All secrets are present"
}

# Deploy backend
function Deploy-Backend {
    Write-Info "Building backend Docker image..."
    docker build -t "${REGISTRY}/dese-api:${VERSION}" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend image build failed"
        exit 1
    }
    
    Write-Info "Pushing backend image to registry..."
    docker push "${REGISTRY}/dese-api:${VERSION}"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend image push failed"
        exit 1
    }
    
    Write-Info "Applying backend deployment..."
    kubectl apply -f k8s/deployment-api.yaml
    
    Write-Info "Waiting for backend rollout..."
    kubectl rollout status deployment/dese-api-deployment -n $NAMESPACE --timeout=5m
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend rollout failed"
        exit 1
    }
    
    Write-Success "Backend deployment completed"
}

# Deploy frontend
function Deploy-Frontend {
    Write-Info "Building frontend Docker image..."
    Push-Location frontend
    docker build -t "${REGISTRY}/dese-frontend:${VERSION}" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend image build failed"
        Pop-Location
        exit 1
    }
    
    Write-Info "Pushing frontend image to registry..."
    docker push "${REGISTRY}/dese-frontend:${VERSION}"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend image push failed"
        Pop-Location
        exit 1
    }
    Pop-Location
    
    Write-Info "Applying frontend deployment..."
    kubectl apply -f k8s/04-dese-frontend-deployment.yaml
    
    Write-Info "Waiting for frontend rollout..."
    kubectl rollout status deployment/dese-frontend-deployment --timeout=5m
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend rollout failed"
        exit 1
    }
    
    Write-Success "Frontend deployment completed"
}

# Health check
function Test-Health {
    Write-Info "Performing health checks..."
    
    # Backend health check
    Write-Info "Checking backend health..."
    try {
        $response = Invoke-WebRequest -Uri "https://api.poolfab.com.tr/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is healthy"
        } else {
            Write-Warning "Backend health check returned status code: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "Backend health check failed: $_"
    }
    
    # Frontend health check
    Write-Info "Checking frontend health..."
    try {
        $response = Invoke-WebRequest -Uri "https://app.poolfab.com.tr/" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend is healthy"
        } else {
            Write-Warning "Frontend health check returned status code: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "Frontend health check failed: $_"
    }
}

# Main
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🚀 Dese EA Plan Production Deployment" -ForegroundColor Cyan
Write-Host "Version: $VERSION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Test-Prerequisites
Invoke-GCloudAuth
Test-Secrets

switch ($Target) {
    "backend" {
        Deploy-Backend
    }
    "frontend" {
        Deploy-Frontend
    }
    "all" {
        Deploy-Backend
        Deploy-Frontend
    }
}

Test-Health

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Success "Deployment completed successfully!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

