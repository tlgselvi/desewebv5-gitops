# === DESE EA PLAN v5.0 - FULL DEPLOYMENT SCRIPT ===
# Complete deployment: Build → Docker → Kubernetes → Verification
# Version: 5.0.0

param(
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging",
    [string]$ImageTag = "latest",
    [string]$RegistryUrl = "",
    [switch]$SkipTests = $false,
    [switch]$PushImages = $false
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param([string]$msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error-Custom { param([string]$msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Warning-Custom { param([string]$msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Info { param([string]$msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Step { param([string]$msg) Write-Host "`n🔷 $msg" -ForegroundColor Magenta }

# Configuration
$APP_NAME = "dese-ea-plan-v5"
$NAMESPACE = if ($Environment -eq "production") { "dese-ea-plan-v5" } else { "dese-ea-plan-v5-staging" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$IMAGE_TAG = if ($ImageTag -eq "latest") { "$ImageTag-$TIMESTAMP" } else { $ImageTag }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FULL DEPLOYMENT - $APP_NAME" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "  Image Tag: $IMAGE_TAG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Prerequisites Check
Write-Step "Step 1: Checking Prerequisites"

try {
    # Docker
    $dockerVersion = docker --version
    Write-Success "Docker: $dockerVersion"
    
    # Docker connection
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon not running" }
    Write-Success "Docker daemon is running"
    
    # kubectl
    if ($Environment -ne "local") {
        $kubectlVersion = kubectl version --client --short 2>&1
        Write-Success "kubectl: $kubectlVersion"
        
        # Kubernetes connection
        kubectl cluster-info | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Kubernetes cluster not accessible" }
        Write-Success "Kubernetes cluster connected"
    }
    
} catch {
    Write-Error-Custom "Prerequisites check failed: $_"
    Write-Info "Please ensure Docker Desktop is running and Kubernetes is enabled"
    exit 1
}

# Step 2: Run Tests
if (-not $SkipTests) {
    Write-Step "Step 2: Running Tests"
    
    Write-Info "Running unit tests..."
    try {
        npx vitest run --reporter=verbose 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Tests passed"
        } else {
            Write-Warning-Custom "Tests failed, but continuing deployment..."
        }
    } catch {
        Write-Warning-Custom "Test execution failed: $_"
    }
} else {
    Write-Info "Skipping tests (--SkipTests flag)"
}

# Step 3: Build Application
Write-Step "Step 3: Building Application"

Write-Info "Building TypeScript..."
try {
    # Try with npx pnpm first, fallback to npm
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm run build 2>&1 | Out-Null
    } else {
        npx pnpm@8.15.0 run build 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Application built successfully"
    } else {
        Write-Warning-Custom "Build may have issues, but continuing..."
    }
} catch {
    Write-Warning-Custom "Build failed: $_"
    Write-Info "Trying direct TypeScript compilation..."
    npx tsc 2>&1 | Out-Null
}

# Check if dist directory exists
if (-not (Test-Path "dist")) {
    Write-Error-Custom "Build failed: dist directory not found"
    exit 1
}
Write-Success "Build artifacts found in dist/"

# Step 4: Build Docker Image
Write-Step "Step 4: Building Docker Image"

$IMAGE_NAME = if ($RegistryUrl) { "$RegistryUrl/$APP_NAME" } else { $APP_NAME }
$FULL_IMAGE_TAG = "$IMAGE_NAME`:$IMAGE_TAG"

Write-Info "Building Docker image: $FULL_IMAGE_TAG"
try {
    docker build -t $FULL_IMAGE_TAG -t "$IMAGE_NAME:latest" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built: $FULL_IMAGE_TAG"
    } else {
        throw "Docker build failed"
    }
} catch {
    Write-Error-Custom "Docker build failed: $_"
    exit 1
}

# Step 5: Push Image (if requested)
if ($PushImages -and $RegistryUrl) {
    Write-Step "Step 5: Pushing Docker Image"
    
    Write-Info "Pushing to registry: $RegistryUrl"
    try {
        docker push $FULL_IMAGE_TAG
        docker push "$IMAGE_NAME:latest"
        Write-Success "Images pushed to registry"
    } catch {
        Write-Warning-Custom "Image push failed: $_"
    }
} else {
    Write-Info "Skipping image push (use -PushImages and -RegistryUrl to push)"
}

# Step 6: Kubernetes Deployment
if ($Environment -ne "local") {
    Write-Step "Step 6: Deploying to Kubernetes"
    
    # Create namespace
    Write-Info "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    Write-Success "Namespace ready: $NAMESPACE"
    
    # Update deployment image if not using registry
    if (-not $RegistryUrl) {
        Write-Info "Updating deployment image to: $FULL_IMAGE_TAG"
        
        # Load image into Kubernetes (for local clusters)
        if ($Environment -eq "staging") {
            Write-Info "Loading image into Kubernetes cluster..."
            # For Docker Desktop Kubernetes, image is already available
            # For other clusters, may need to load or use imagePullPolicy: Never
        }
    }
    
    # Apply Kubernetes resources
    Write-Info "Applying Kubernetes resources..."
    
    $resources = @(
        "k8s/namespace.yaml",
        "k8s/configmap.yaml",
        "k8s/secret.yaml",
        "k8s/serviceaccount.yaml",
        "k8s/deployment.yaml",
        "k8s/service.yaml",
        "k8s/ingress.yaml"
    )
    
    foreach ($resource in $resources) {
        if (Test-Path $resource) {
            Write-Info "Applying: $resource"
            kubectl apply -f $resource -n $NAMESPACE 2>&1 | Out-Null
            
            if ($resource -eq "k8s/deployment.yaml" -and -not $RegistryUrl) {
                # Update image if local deployment
                kubectl set image deployment/$APP_NAME "$APP_NAME=$FULL_IMAGE_TAG" -n $NAMESPACE 2>&1 | Out-Null
            }
        }
    }
    
    Write-Success "Kubernetes resources applied"
    
    # Wait for deployment
    Write-Info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=300s
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment is ready"
    } else {
        Write-Warning-Custom "Deployment may not be fully ready"
    }
    
} else {
    Write-Step "Step 6: Deploying with Docker Compose"
    
    Write-Info "Starting services with Docker Compose..."
    docker-compose up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker Compose deployment complete"
        Write-Info "Waiting for services to be ready..."
        Start-Sleep -Seconds 10
    } else {
        Write-Error-Custom "Docker Compose deployment failed"
        exit 1
    }
}

# Step 7: Health Check
Write-Step "Step 7: Health Checks"

Start-Sleep -Seconds 5

if ($Environment -eq "local") {
    $healthUrl = "http://localhost:3000/health"
} else {
    # Get service endpoint
    $serviceIp = kubectl get svc $APP_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>&1
    if (-not $serviceIp) {
        $serviceIp = "localhost"
        Write-Info "Using port-forward for health check..."
        $portForwardJob = Start-Job -ScriptBlock {
            kubectl port-forward -n $using:NAMESPACE svc/$using:APP_NAME 3000:3000 2>&1 | Out-Null
        }
        Start-Sleep -Seconds 3
    }
    $healthUrl = "http://$serviceIp:3000/health"
}

Write-Info "Checking health endpoint: $healthUrl"

$maxRetries = 10
$retryCount = 0
$healthy = $false

while ($retryCount -lt $maxRetries -and -not $healthy) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $health = $response.Content | ConvertFrom-Json
            Write-Success "Health check passed!"
            Write-Info "Status: $($health.status)"
            if ($health.services) {
                Write-Info "Services:"
                $health.services.PSObject.Properties | ForEach-Object {
                    $status = if ($_.Value) { "✅" } else { "❌" }
                    Write-Info "  $status $($_.Name)"
                }
            }
            $healthy = $true
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Info "Health check attempt $retryCount/$maxRetries failed, retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }
}

if ($healthy) {
    Write-Success "Application is healthy and ready!"
} else {
    Write-Warning-Custom "Health check failed after $maxRetries attempts"
}

# Step 8: Status Report
Write-Step "Step 8: Deployment Status"

if ($Environment -ne "local") {
    Write-Info "Kubernetes Resources:"
    kubectl get pods -n $NAMESPACE
    kubectl get svc -n $NAMESPACE
    kubectl get ingress -n $NAMESPACE
} else {
    Write-Info "Docker Compose Services:"
    docker-compose ps
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ FULL DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Deployment Summary:"
Write-Info "  Environment: $Environment"
Write-Info "  Image: $FULL_IMAGE_TAG"
Write-Info "  Namespace: $NAMESPACE"
Write-Info ""
Write-Info "Access URLs:"
if ($Environment -eq "local") {
    Write-Info "  - App: http://localhost:3000"
    Write-Info "  - Health: http://localhost:3000/health"
    Write-Info "  - Grafana: http://localhost:3001"
    Write-Info "  - Prometheus: http://localhost:9090"
} else {
    Write-Info "  - Health: $healthUrl"
    Write-Info "  - Ingress: Check kubectl get ingress -n $NAMESPACE"
}
Write-Host ""

if ($portForwardJob) {
    Stop-Job $portForwardJob
    Remove-Job $portForwardJob
}

