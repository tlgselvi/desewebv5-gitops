#!/usr/bin/env pwsh
# EA Plan v6.0 Development Deployment Script (PowerShell)

param(
    [string]$Namespace = "ea-plan-v6-dev",
    [string]$Registry = "ghcr.io/ea-plan-v6",
    [string]$Tag = "latest"
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$NC = "`e[0m" # No Color

# Helper functions
function Write-Info {
    param([string]$Message)
    Write-Host "${Blue}[INFO]${NC} $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "${Green}[SUCCESS]${NC} $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[WARNING]${NC} $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${NC} $Message"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check kubectl
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Error "kubectl is not installed"
        exit 1
    }
    
    # Check helm
    if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
        Write-Error "helm is not installed"
        exit 1
    }
    
    # Check docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "docker is not installed"
        exit 1
    }
    
    # Check cluster connectivity
    try {
        kubectl cluster-info | Out-Null
    }
    catch {
        Write-Error "Cannot connect to Kubernetes cluster"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Create namespace
function New-Namespace {
    Write-Info "Creating namespace: $Namespace"
    
    kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
    
    # Add labels
    kubectl label namespace $Namespace `
        app=ea-plan-v6 `
        environment=development `
        version=6.0 `
        --overwrite
    
    Write-Success "Namespace created: $Namespace"
}

# Deploy Kafka
function Deploy-Kafka {
    Write-Info "Deploying Kafka cluster..."
    
    # Install Strimzi operator if not exists
    try {
        kubectl get crd kafkas.kafka.strimzi.io | Out-Null
    }
    catch {
        Write-Info "Installing Strimzi Kafka operator..."
        kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
        kubectl wait --for=condition=Ready pod -l name=strimzi-cluster-operator -n kafka --timeout=300s
    }
    
    # Deploy Kafka cluster
    kubectl apply -f kafka/kafka-cluster-dev.yaml -n $Namespace
    
    # Wait for Kafka to be ready
    Write-Info "Waiting for Kafka cluster to be ready..."
    kubectl wait --for=condition=Ready kafka/ea-plan-v6-kafka-dev -n $Namespace --timeout=600s
    
    # Create topics
    kubectl apply -f kafka/topics.yaml -n $Namespace
    
    Write-Success "Kafka cluster deployed"
}

# Deploy Redis
function Deploy-Redis {
    Write-Info "Deploying Redis..."
    
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    helm upgrade --install redis bitnami/redis `
        --namespace $Namespace `
        --set auth.enabled=false `
        --set master.persistence.enabled=false `
        --set replica.replicaCount=1 `
        --wait
    
    Write-Success "Redis deployed"
}

# Deploy PostgreSQL
function Deploy-PostgreSQL {
    Write-Info "Deploying PostgreSQL..."
    
    helm upgrade --install postgres bitnami/postgresql `
        --namespace $Namespace `
        --set auth.postgresPassword=ea_plan_v6_password `
        --set auth.database=ea_plan_v6 `
        --set primary.persistence.enabled=false `
        --wait
    
    Write-Success "PostgreSQL deployed"
}

# Deploy services
function Deploy-Services {
    Write-Info "Deploying microservices..."
    
    # Deploy Auth Service
    helm upgrade --install auth-service ./auth-service/helm `
        --namespace $Namespace `
        --set image.repository="$Registry/auth-service" `
        --set image.tag=$Tag `
        --set redis.enabled=false `
        --wait
    
    # Deploy Metrics Service
    helm upgrade --install metrics-service ./metrics-service/helm `
        --namespace $Namespace `
        --set image.repository="$Registry/metrics-service" `
        --set image.tag=$Tag `
        --set redis.enabled=false `
        --wait
    
    # Deploy Events Service
    helm upgrade --install events-service ./events-service/helm `
        --namespace $Namespace `
        --set image.repository="$Registry/events-service" `
        --set image.tag=$Tag `
        --set redis.enabled=false `
        --wait
    
    # Deploy Alerts Service
    helm upgrade --install alerts-service ./alerts-service/helm `
        --namespace $Namespace `
        --set image.repository="$Registry/alerts-service" `
        --set image.tag=$Tag `
        --set redis.enabled=false `
        --wait
    
    # Deploy ML Service
    helm upgrade --install ml-service ./ml-service/helm `
        --namespace $Namespace `
        --set image.repository="$Registry/ml-service" `
        --set image.tag=$Tag `
        --set redis.enabled=false `
        --wait
    
    Write-Success "All microservices deployed"
}

# Deploy monitoring
function Deploy-Monitoring {
    Write-Info "Deploying monitoring stack..."
    
    # Deploy Prometheus
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack `
        --namespace $Namespace `
        --set grafana.adminPassword=admin `
        --set prometheus.prometheusSpec.retention=7d `
        --wait
    
    Write-Success "Monitoring stack deployed"
}

# Run smoke tests
function Test-SmokeTests {
    Write-Info "Running smoke tests..."
    
    # Wait for all pods to be ready
    Write-Info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=Ready pod -l app=auth-service -n $Namespace --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=metrics-service -n $Namespace --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=events-service -n $Namespace --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=alerts-service -n $Namespace --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=ml-service -n $Namespace --timeout=300s
    
    # Test Auth Service
    Write-Info "Testing Auth Service..."
    $AuthPod = kubectl get pod -l app=auth-service -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $AuthPod -n $Namespace -- curl -f http://localhost:3001/health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Auth Service health check failed"
        exit 1
    }
    
    # Test Metrics Service
    Write-Info "Testing Metrics Service..."
    $MetricsPod = kubectl get pod -l app=metrics-service -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $MetricsPod -n $Namespace -- curl -f http://localhost:3002/health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Metrics Service health check failed"
        exit 1
    }
    
    # Test Events Service
    Write-Info "Testing Events Service..."
    $EventsPod = kubectl get pod -l app=events-service -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $EventsPod -n $Namespace -- curl -f http://localhost:3003/health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Events Service health check failed"
        exit 1
    }
    
    # Test Alerts Service
    Write-Info "Testing Alerts Service..."
    $AlertsPod = kubectl get pod -l app=alerts-service -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $AlertsPod -n $Namespace -- curl -f http://localhost:3004/health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Alerts Service health check failed"
        exit 1
    }
    
    # Test ML Service
    Write-Info "Testing ML Service..."
    $MLPod = kubectl get pod -l app=ml-service -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $MLPod -n $Namespace -- curl -f http://localhost:3005/health
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ML Service health check failed"
        exit 1
    }
    
    # Test Kafka connectivity
    Write-Info "Testing Kafka connectivity..."
    $KafkaPod = kubectl get pod -l strimzi.io/name=ea-plan-v6-kafka-dev -n $Namespace -o jsonpath='{.items[0].metadata.name}'
    kubectl exec $KafkaPod -n $Namespace -- kafka-topics.sh --bootstrap-server localhost:9092 --list
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kafka connectivity test failed"
        exit 1
    }
    
    Write-Success "All smoke tests passed!"
}

# Generate test data
function New-TestData {
    Write-Info "Generating test data..."
    
    # Get service URLs
    $AuthService = kubectl get svc auth-service -n $Namespace -o jsonpath='{.spec.clusterIP}'
    $MetricsService = kubectl get svc metrics-service -n $Namespace -o jsonpath='{.spec.clusterIP}'
    $EventsService = kubectl get svc events-service -n $Namespace -o jsonpath='{.spec.clusterIP}'
    $MLService = kubectl get svc ml-service -n $Namespace -o jsonpath='{.spec.clusterIP}'
    
    # Create test user
    Write-Info "Creating test user..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- `
        curl -X POST "http://$AuthService:3001/api/v1/auth/register" `
        -H "Content-Type: application/json" `
        -d '{"username":"testuser","email":"test@ea-plan-v6.local","password":"password123","role":"admin"}'
    
    # Send test metrics
    Write-Info "Sending test metrics..."
    $Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- `
        curl -X POST "http://$MetricsService:3002/api/v1/metrics" `
        -H "Content-Type: application/json" `
        -d "{\"metrics\":[{\"timestamp\":$Timestamp,\"service\":\"test-service\",\"metric\":\"cpu_usage\",\"value\":75.5},{\"timestamp\":$Timestamp,\"service\":\"test-service\",\"metric\":\"memory_usage\",\"value\":60.2}]}"
    
    # Send test events
    Write-Info "Sending test events..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- `
        curl -X POST "http://$EventsService:3003/api/v1/events" `
        -H "Content-Type: application/json" `
        -d '{"events":[{"type":"deployment","source":"ci-cd","data":{"service":"test-service","version":"1.0.0"}}]}'
    
    # Test anomaly detection
    Write-Info "Testing anomaly detection..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- `
        curl -X POST "http://$MLService:3005/api/v1/ml/detect" `
        -H "Content-Type: application/json" `
        -d "{\"timestamp\":$Timestamp,\"service\":\"test-service\",\"metric\":\"cpu_usage\",\"value\":150.0}"
    
    Write-Success "Test data generated"
}

# Display deployment info
function Show-DeploymentInfo {
    Write-Info "Deployment completed successfully!"
    Write-Host ""
    Write-Host "📊 Deployment Information:"
    Write-Host "  Namespace: $Namespace"
    Write-Host "  Registry: $Registry"
    Write-Host "  Tag: $Tag"
    Write-Host ""
    Write-Host "🔗 Service URLs:"
    Write-Host "  Auth Service: http://$(kubectl get svc auth-service -n $Namespace -o jsonpath='{.spec.clusterIP}'):3001"
    Write-Host "  Metrics Service: http://$(kubectl get svc metrics-service -n $Namespace -o jsonpath='{.spec.clusterIP}'):3002"
    Write-Host "  Events Service: http://$(kubectl get svc events-service -n $Namespace -o jsonpath='{.spec.clusterIP}'):3003"
    Write-Host "  Alerts Service: http://$(kubectl get svc alerts-service -n $Namespace -o jsonpath='{.spec.clusterIP}'):3004"
    Write-Host "  ML Service: http://$(kubectl get svc ml-service -n $Namespace -o jsonpath='{.spec.clusterIP}'):3005"
    Write-Host ""
    Write-Host "📈 Monitoring:"
    Write-Host "  Grafana: http://$(kubectl get svc prometheus-grafana -n $Namespace -o jsonpath='{.spec.clusterIP}'):80"
    Write-Host "  Prometheus: http://$(kubectl get svc prometheus-kube-prometheus-prometheus -n $Namespace -o jsonpath='{.spec.clusterIP}'):9090"
    Write-Host ""
    Write-Host "🔧 Useful Commands:"
    Write-Host "  kubectl get pods -n $Namespace"
    Write-Host "  kubectl get svc -n $Namespace"
    Write-Host "  kubectl logs -f deployment/auth-service -n $Namespace"
    Write-Host "  kubectl port-forward svc/auth-service 3001:3001 -n $Namespace"
    Write-Host ""
}

# Main execution
function Main {
    Test-Prerequisites
    New-Namespace
    Deploy-Kafka
    Deploy-Redis
    Deploy-PostgreSQL
    Deploy-Services
    Deploy-Monitoring
    Test-SmokeTests
    New-TestData
    Show-DeploymentInfo
    
    Write-Success "🎉 EA Plan v6.0 Development Deployment Complete!"
}

# Run main function
Main
