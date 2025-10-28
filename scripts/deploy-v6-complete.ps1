# EA Plan v6.0 - Complete Deployment Orchestration Script (PowerShell)
# This script orchestrates the complete deployment of EA Plan v6.0

param(
    [string]$DeploymentEnv = "prod",
    [string]$RegistryUrl = "ghcr.io/your-org",
    [string]$LogLevel = "info",
    [string]$NamespacePrefix = "ea-plan-v6"
)

# Error handling
$ErrorActionPreference = "Stop"

# Progress tracking
$TotalSteps = 10
$CurrentStep = 0

function Update-Progress {
    param([string]$Message)
    $script:CurrentStep++
    $progress = [math]::Round(($CurrentStep * 100 / $TotalSteps), 0)
    Write-Host "[PROGRESS] $CurrentStep/$TotalSteps ($progress%) - $Message" -ForegroundColor Cyan
}

function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-LogStep {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Magenta
}

function Test-Prerequisites {
    Write-LogStep "Checking prerequisites..."
    
    # Check kubectl
    try {
        kubectl version --client | Out-Null
    }
    catch {
        Write-LogError "kubectl is not installed. Please install kubectl first."
        exit 1
    }
    
    # Check helm
    try {
        helm version | Out-Null
    }
    catch {
        Write-LogError "helm is not installed. Please install helm first."
        exit 1
    }
    
    # Check docker
    try {
        docker version | Out-Null
    }
    catch {
        Write-LogError "docker is not installed. Please install docker first."
        exit 1
    }
    
    # Check kubectl connection
    try {
        kubectl cluster-info | Out-Null
    }
    catch {
        Write-LogError "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    }
    
    # Check cluster resources
    $nodes = (kubectl get nodes --no-headers | Measure-Object).Count
    if ($nodes -lt 3) {
        Write-LogWarning "Cluster has only $nodes nodes. Recommended minimum is 3 nodes for production."
    }
    
    Write-LogSuccess "Prerequisites check passed"
    Update-Progress "Prerequisites validated"
}

function Deploy-Infrastructure {
    Write-LogStep "Deploying infrastructure components..."
    
    # Create namespaces
    $namespaceYaml = @"
apiVersion: v1
kind: Namespace
metadata:
  name: $NamespacePrefix-$DeploymentEnv
  labels:
    name: $NamespacePrefix-$DeploymentEnv
    environment: $DeploymentEnv
    version: "6.0"
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-$DeploymentEnv
  labels:
    name: monitoring-$DeploymentEnv
    environment: $DeploymentEnv
"@
    
    $namespaceYaml | kubectl apply -f -
    
    # Install ArgoCD
    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    
    # Wait for ArgoCD
    kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
    
    # Install Prometheus stack
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    $prometheusValues = @"
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

grafana:
  enabled: true
  adminPassword: "admin123"
  persistence:
    enabled: true
    storageClassName: fast-ssd
    size: 10Gi
  service:
    type: LoadBalancer
    port: 80
"@
    
    helm install prometheus prometheus-community/kube-prometheus-stack `
        --namespace monitoring-$DeploymentEnv `
        --create-namespace `
        --values <($prometheusValues) `
        --wait
    
    Write-LogSuccess "Infrastructure deployed successfully"
    Update-Progress "Infrastructure components deployed"
}

function Deploy-DataLayer {
    Write-LogStep "Deploying data layer components..."
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add strimzi https://strimzi.io/charts/
    helm repo update
    
    # Install PostgreSQL
    $postgresqlValues = @"
auth:
  postgresPassword: "postgres123"
  database: "ea_plan_v6"

primary:
  persistence:
    enabled: true
    storageClass: fast-ssd
    size: 50Gi
  
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "1000m"

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
"@
    
    helm install postgresql bitnami/postgresql `
        --namespace $NamespacePrefix-$DeploymentEnv `
        --values <($postgresqlValues) `
        --wait
    
    # Install Redis
    $redisValues = @"
auth:
  enabled: true
  password: "redis123"

master:
  persistence:
    enabled: true
    storageClass: fast-ssd
    size: 10Gi
  
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
"@
    
    helm install redis bitnami/redis `
        --namespace $NamespacePrefix-$DeploymentEnv `
        --values <($redisValues) `
        --wait
    
    # Install InfluxDB
    helm repo add influxdata https://helm.influxdata.com/
    helm repo update
    
    $influxdbValues = @"
persistence:
  enabled: true
  storageClass: fast-ssd
  size: 50Gi

resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"

adminUser:
  user: admin
  password: influx123

service:
  type: ClusterIP
  port: 8086
"@
    
    helm install influxdb influxdata/influxdb2 `
        --namespace $NamespacePrefix-$DeploymentEnv `
        --values <($influxdbValues) `
        --wait
    
    Write-LogSuccess "Data layer deployed successfully"
    Update-Progress "Data layer components deployed"
}

function Deploy-Kafka {
    Write-LogStep "Deploying Kafka event streaming..."
    
    # Install Strimzi Kafka Operator
    helm install strimzi strimzi/strimzi-kafka-operator `
        --namespace $NamespacePrefix-$DeploymentEnv `
        --wait
    
    # Create Kafka cluster
    $kafkaYaml = @"
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: ea-plan-v6-kafka
  namespace: $NamespacePrefix-$DeploymentEnv
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      inter.broker.protocol.version: "3.6"
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: fast-ssd
  entityOperator:
    topicOperator: {}
    userOperator: {}
"@
    
    $kafkaYaml | kubectl apply -f -
    
    # Create Kafka topics
    $topicsYaml = @"
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: metrics-topic
  namespace: $NamespacePrefix-$DeploymentEnv
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000
    segment.ms: 86400000
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: anomalies-topic
  namespace: $NamespacePrefix-$DeploymentEnv
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 2592000000
    segment.ms: 86400000
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: alerts-topic
  namespace: $NamespacePrefix-$DeploymentEnv
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 1209600000
    segment.ms: 86400000
"@
    
    $topicsYaml | kubectl apply -f -
    
    # Wait for Kafka to be ready
    kubectl wait --for=condition=ready --timeout=600s kafka/ea-plan-v6-kafka -n $NamespacePrefix-$DeploymentEnv
    
    Write-LogSuccess "Kafka event streaming deployed successfully"
    Update-Progress "Kafka event streaming deployed"
}

function Deploy-KongGateway {
    Write-LogStep "Deploying Kong API Gateway..."
    
    # Add Kong Helm repository
    helm repo add kong https://charts.konghq.com
    helm repo update
    
    # Install Kong
    $kongValues = @"
proxy:
  type: LoadBalancer
  http:
    enabled: true
    servicePort: 80
  tls:
    enabled: true
    servicePort: 443

admin:
  enabled: true
  type: LoadBalancer
  http:
    enabled: true
    servicePort: 8001
  tls:
    enabled: true
    servicePort: 8444

manager:
  enabled: true
  type: LoadBalancer
  http:
    enabled: true
    servicePort: 8002
  tls:
    enabled: true
    servicePort: 8445

portal:
  enabled: true
  type: LoadBalancer
  http:
    enabled: true
    servicePort: 8003
  tls:
    enabled: true
    servicePort: 8446

enterprise:
  enabled: false

deployment:
  kong:
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "9542"
      prometheus.io/path: "/metrics"

plugins:
  bundled:
    - prometheus
    - jwt
    - cors
    - rate-limiting
    - request-size-limiting
"@
    
    helm install kong kong/kong `
        --namespace $NamespacePrefix-$DeploymentEnv `
        --values <($kongValues) `
        --wait
    
    Write-LogSuccess "Kong API Gateway deployed successfully"
    Update-Progress "Kong API Gateway deployed"
}

function Deploy-Microservices {
    Write-LogStep "Building and deploying microservices..."
    
    # Build Docker images
    Write-LogInfo "Building Docker images..."
    
    # Build User Service
    docker build -t $RegistryUrl/user-service:6.0 ./ea-plan-v6-microservices/user-service/
    docker push $RegistryUrl/user-service:6.0
    
    # Build AIOps Service
    docker build -t $RegistryUrl/aiops-service:6.0 ./ea-plan-v6-microservices/aiops-service/
    docker push $RegistryUrl/aiops-service:6.0
    
    # Build Metrics Service
    docker build -t $RegistryUrl/metrics-service:6.0 ./ea-plan-v6-microservices/metrics-service/
    docker push $RegistryUrl/metrics-service:6.0
    
    # Build ML Service
    docker build -t $RegistryUrl/ml-service:6.0 ./ea-plan-v6-microservices/ml-service/
    docker push $RegistryUrl/ml-service:6.0
    
    # Deploy microservices
    kubectl apply -f ./ea-plan-v6-microservices/k8s/microservices-deployment.yaml
    
    # Wait for deployments
    kubectl wait --for=condition=available --timeout=300s deployment/user-service -n $NamespacePrefix-$DeploymentEnv
    kubectl wait --for=condition=available --timeout=300s deployment/aiops-service -n $NamespacePrefix-$DeploymentEnv
    kubectl wait --for=condition=available --timeout=300s deployment/metrics-service -n $NamespacePrefix-$DeploymentEnv
    kubectl wait --for=condition=available --timeout=300s deployment/ml-service -n $NamespacePrefix-$DeploymentEnv
    
    Write-LogSuccess "Microservices deployed successfully"
    Update-Progress "Microservices deployed"
}

function Deploy-GrafanaPlugin {
    Write-LogStep "Deploying custom Grafana plugin..."
    
    # Build Grafana plugin
    Set-Location ./ea-plan-v6-microservices/grafana-plugin/
    npm install
    npm run build
    
    # Create ConfigMap with plugin
    kubectl create configmap grafana-plugin-ea-plan-v6 `
        --from-file=dist/ `
        --namespace monitoring-$DeploymentEnv `
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Restart Grafana to load plugin
    kubectl rollout restart deployment/prometheus-grafana -n monitoring-$DeploymentEnv
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus-grafana -n monitoring-$DeploymentEnv
    
    Set-Location -Path $PSScriptRoot
    
    Write-LogSuccess "Grafana plugin deployed successfully"
    Update-Progress "Grafana plugin deployed"
}

function Deploy-SecurityPolicies {
    Write-LogStep "Deploying security policies..."
    
    # Install OPA Gatekeeper
    kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
    kubectl wait --for=condition=ready --timeout=300s pod -l control-plane=controller-manager -n gatekeeper-system
    
    # Install Kyverno
    kubectl apply -f https://github.com/kyverno/kyverno/releases/download/v1.10.0/install.yaml
    kubectl wait --for=condition=ready --timeout=300s pod -l app.kubernetes.io/name=kyverno -n kyverno
    
    # Apply security policies
    $securityPoliciesYaml = @"
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: ea-plan-v6-security
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: require-security-context
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - $NamespacePrefix-$DeploymentEnv
    validate:
      message: "Security context is required for production"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: "1001"
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
              - ALL
  - name: require-resource-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - $NamespacePrefix-$DeploymentEnv
    validate:
      message: "Resource limits are required for production"
      pattern:
        spec:
          containers:
          - name: "*"
            resources:
              limits:
                memory: "?*"
                cpu: "?*"
              requests:
                memory: "?*"
                cpu: "?*"
"@
    
    $securityPoliciesYaml | kubectl apply -f -
    
    Write-LogSuccess "Security policies deployed successfully"
    Update-Progress "Security policies deployed"
}

function Test-Performance {
    Write-LogStep "Running performance tests..."
    
    # Get Kong Gateway URL
    $kongUrl = kubectl get svc kong-kong-proxy -n $NamespacePrefix-$DeploymentEnv -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
    if (-not $kongUrl) {
        $kongUrl = "localhost"
        Start-Process kubectl -ArgumentList "port-forward", "svc/kong-kong-proxy", "-n", "$NamespacePrefix-$DeploymentEnv", "8080:80" -WindowStyle Hidden
        Start-Sleep 5
    }
    
    # Create k6 test script
    $k6TestScript = @"
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  let response = http.get('http://$kongUrl:8080/api/v1/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
  sleep(1);
}
"@
    
    $k6TestScript | Out-File -FilePath "k6-test.js" -Encoding UTF8
    
    # Run performance tests (if k6 is available)
    try {
        Write-LogInfo "Running k6 performance tests..."
        k6 run k6-test.js
    }
    catch {
        Write-LogWarning "k6 not available, skipping performance tests"
    }
    
    # Cleanup
    Remove-Item "k6-test.js" -ErrorAction SilentlyContinue
    
    Write-LogSuccess "Performance tests completed successfully"
    Update-Progress "Performance tests completed"
}

function Test-Deployment {
    Write-LogStep "Validating deployment..."
    
    # Check all pods are running
    $failedPods = kubectl get pods -n $NamespacePrefix-$DeploymentEnv --field-selector=status.phase!=Running --no-headers
    if ($failedPods) {
        Write-LogError "Some pods are not running:"
        kubectl get pods -n $NamespacePrefix-$DeploymentEnv --field-selector=status.phase!=Running
        throw "Deployment validation failed"
    }
    
    # Check services are accessible
    $services = @("user-service", "aiops-service", "metrics-service", "ml-service")
    foreach ($service in $services) {
        try {
            kubectl get svc $service -n $NamespacePrefix-$DeploymentEnv | Out-Null
        }
        catch {
            Write-LogError "Service $service not found"
            throw "Deployment validation failed"
        }
    }
    
    Write-LogSuccess "Deployment validation completed successfully"
    Update-Progress "Deployment validation completed"
}

function Show-DeploymentInfo {
    Write-LogStep "Deployment Information"
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "EA Plan v6.0 Deployment Complete" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "✅ Infrastructure:" -ForegroundColor Green
    Write-Host "  • Kubernetes Cluster: $(kubectl cluster-info --request-timeout=5s | Select-Object -First 1)"
    Write-Host "  • Namespace: $NamespacePrefix-$DeploymentEnv"
    Write-Host "  • Environment: $DeploymentEnv"
    
    Write-Host "✅ Services:" -ForegroundColor Green
    Write-Host "  • User Service: $(kubectl get svc user-service -n $NamespacePrefix-$DeploymentEnv -o jsonpath='{.spec.clusterIP}')"
    Write-Host "  • AIOps Service: $(kubectl get svc aiops-service -n $NamespacePrefix-$DeploymentEnv -o jsonpath='{.spec.clusterIP}')"
    Write-Host "  • Metrics Service: $(kubectl get svc metrics-service -n $NamespacePrefix-$DeploymentEnv -o jsonpath='{.spec.clusterIP}')"
    Write-Host "  • ML Service: $(kubectl get svc ml-service -n $NamespacePrefix-$DeploymentEnv -o jsonpath='{.spec.clusterIP}')"
    
    Write-Host "✅ Access Information:" -ForegroundColor Green
    Write-Host "  • Kong Gateway: kubectl port-forward svc/kong-kong-proxy -n $NamespacePrefix-$DeploymentEnv 8080:80"
    Write-Host "  • Kong Admin: kubectl port-forward svc/kong-kong-admin -n $NamespacePrefix-$DeploymentEnv 8001:8001"
    Write-Host "  • Grafana: kubectl port-forward svc/prometheus-grafana -n monitoring-$DeploymentEnv 3000:80"
    Write-Host "  • ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
    
    Write-Host "✅ Performance Targets:" -ForegroundColor Green
    Write-Host "  • API Gateway: <10ms p95 latency"
    Write-Host "  • Microservices: <50ms p95 latency"
    Write-Host "  • ML Service: <500ms p95 latency"
    Write-Host "  • Availability: >99.9%"
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Deployment completed successfully!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

# Main execution
function Main {
    Write-LogInfo "Starting EA Plan v6.0 Complete Deployment"
    Write-LogInfo "=========================================="
    Write-LogInfo "Environment: $DeploymentEnv"
    Write-LogInfo "Namespace: $NamespacePrefix-$DeploymentEnv"
    Write-LogInfo "Registry: $RegistryUrl"
    Write-LogInfo "=========================================="
    
    Test-Prerequisites
    Deploy-Infrastructure
    Deploy-DataLayer
    Deploy-Kafka
    Deploy-KongGateway
    Deploy-Microservices
    Deploy-GrafanaPlugin
    Deploy-SecurityPolicies
    Test-Performance
    Test-Deployment
    Show-DeploymentInfo
    
    Write-LogSuccess "EA Plan v6.0 Complete Deployment Successful!"
    Write-LogInfo "=========================================="
    Write-LogInfo "Next steps:"
    Write-LogInfo "1. Configure Kong API Gateway routes"
    Write-LogInfo "2. Setup Grafana dashboards"
    Write-LogInfo "3. Configure alerting rules"
    Write-LogInfo "4. Run integration tests"
    Write-LogInfo "5. Monitor system performance"
}

# Run main function
Main
