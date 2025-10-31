# === DESE EA PLAN v5.0 - Deployment Script ===
# PowerShell Script for Windows
# Version: 5.0.0

# Suppress PSScriptAnalyzer warnings for deployment script patterns
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '', Justification = 'Write-Host required for colored output in deployment script')]
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSUseSingularNouns', '', Justification = 'Plural nouns are acceptable for function naming')]
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', '', Justification = 'SkipBuild and DryRun are used conditionally within deployment functions')]
param(
    [ValidateSet("docker-compose", "kubernetes", "helm")]
    [string]$Method = "docker-compose",
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging",
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false
)

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ℹ️  $Message" -ForegroundColor Cyan
}

# Prerequisites check
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    $allGood = $true

    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Success "Docker found: $dockerVersion"
    } catch {
        Write-Error-Custom "Docker not found. Please install Docker Desktop."
        $allGood = $false
    }

    # Check kubectl (if Kubernetes method)
    if ($Method -eq "kubernetes" -or $Method -eq "helm") {
        try {
            $kubectlVersion = kubectl version --client --short 2>&1
            Write-Success "kubectl found: $kubectlVersion"
        } catch {
            Write-Error-Custom "kubectl not found. Please install kubectl."
            $allGood = $false
        }

        # Check Kubernetes connection
        try {
            $null = kubectl cluster-info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Kubernetes cluster connection OK"
            } else {
                Write-Warning-Custom "Kubernetes cluster connection failed. Is Docker Desktop Kubernetes enabled?"
                $allGood = $false
            }
        } catch {
            Write-Warning-Custom "Could not connect to Kubernetes cluster."
            $allGood = $false
        }
    }

    # Check Helm (if Helm method)
    if ($Method -eq "helm") {
        try {
            $helmVersion = helm version --client --short
            Write-Success "Helm found: $helmVersion"
        } catch {
            Write-Error-Custom "Helm not found. Please install Helm."
            $allGood = $false
        }
    }

    return $allGood
}

# Docker Compose deployment
function Deploy-DockerCompose {
    Write-Info "Deploying with Docker Compose..."

    if ($DryRun) {
        Write-Info "[DRY RUN] Would run: docker-compose up -d --build"
        return
    }

    if (-not $SkipBuild) {
        Write-Info "Building Docker images..."
        docker-compose build
    }

    Write-Info "Starting services..."
    docker-compose up -d

    Write-Info "Waiting for services to be ready..."
    Start-Sleep -Seconds 10

    Write-Info "Checking service status..."
    docker-compose ps

    Write-Success "Docker Compose deployment complete!"
    Write-Info "Services:"
    Write-Info "  - App: http://localhost:3000"
    Write-Info "  - Grafana: http://localhost:3001"
    Write-Info "  - Prometheus: http://localhost:9090"
}

# Kubernetes deployment
function Deploy-Kubernetes {
    Write-Info "Deploying to Kubernetes (environment: $Environment)..."

    $namespace = if ($Environment -eq "production") { "dese-ea-plan-v5" } else { "dese-ea-plan-v5-staging" }

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy to namespace: $namespace"
        Write-Info "[DRY RUN] Would apply: k8s/*.yaml"
        return
    }

    # Create namespace if not exists
    Write-Info "Creating namespace: $namespace"
    kubectl create namespace $namespace --dry-run=client -o yaml | kubectl apply -f -

    # Apply resources in order
    Write-Info "Applying Kubernetes resources..."
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml -n $namespace
    kubectl apply -f k8s/secret.yaml -n $namespace
    kubectl apply -f k8s/serviceaccount.yaml -n $namespace
    kubectl apply -f k8s/deployment.yaml -n $namespace
    kubectl apply -f k8s/service.yaml -n $namespace
    kubectl apply -f k8s/ingress.yaml -n $namespace

    Write-Info "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/dese-ea-plan-v5 -n $namespace

    Write-Info "Deployment status:"
    kubectl get pods -n $namespace
    kubectl get svc -n $namespace

    Write-Success "Kubernetes deployment complete!"
}

# Helm deployment
function Deploy-Helm {
    Write-Info "Deploying with Helm (environment: $Environment)..."

    $namespace = if ($Environment -eq "production") { "dese-ea-plan-v5" } else { "dese-ea-plan-v5-staging" }
    $releaseName = "dese-ea-plan-v5"

    if ($DryRun) {
        Write-Info "[DRY RUN] Would deploy Helm chart to namespace: $namespace"
        Write-Info "[DRY RUN] Would run: helm install $releaseName ./helm/dese-ea-plan-v5 -n $namespace"
        return
    }

    Write-Info "Installing/Upgrading Helm chart..."
    helm upgrade --install $releaseName ./helm/dese-ea-plan-v5 `
        --namespace $namespace `
        --create-namespace `
        --wait `
        --timeout 5m

    Write-Info "Deployment status:"
    helm list -n $namespace
    kubectl get pods -n $namespace

    Write-Success "Helm deployment complete!"
}

# Health check
function Test-Health {
    Write-Info "Running health checks..."

    if ($Method -eq "docker-compose") {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Health check passed!"
                Write-Info $response.Content
            } else {
                Write-Warning-Custom "Health check returned status: $($response.StatusCode)"
            }
        } catch {
            Write-Warning-Custom "Health check failed: $_"
        }
    } else {
        $namespace = if ($Environment -eq "production") { "dese-ea-plan-v5" } else { "dese-ea-plan-v5-staging" }
        Write-Info "Checking Kubernetes pods..."
        kubectl get pods -n $namespace
    }
}

# Main execution
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESE EA PLAN v5.0 - Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Prerequisites)) {
    Write-Error-Custom "Prerequisites check failed. Please fix the issues above."
    exit 1
}

Write-Host ""
Write-Info "Method: $Method"
Write-Info "Environment: $Environment"
Write-Host ""

try {
    switch ($Method) {
        "docker-compose" { Deploy-DockerCompose }
        "kubernetes" { Deploy-Kubernetes }
        "helm" { Deploy-Helm }
    }

    Write-Host ""
    Test-Health

    Write-Host ""
    Write-Success "Deployment completed successfully!"

} catch {
    Write-Error-Custom "Deployment failed: $_"
    exit 1
}

