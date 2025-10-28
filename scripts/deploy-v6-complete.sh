#!/bin/bash
# EA Plan v6.0 - Complete Deployment Orchestration Script
# This script orchestrates the complete deployment of EA Plan v6.0

set -euo pipefail

# Configuration
NAMESPACE_PREFIX="ea-plan-v6"
REGISTRY_URL="ghcr.io/your-org"
KUBECONFIG_PATH="${KUBECONFIG_PATH:-~/.kube/config}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-prod}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_debug() {
    if [[ "$LOG_LEVEL" == "debug" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Progress tracking
TOTAL_STEPS=10
CURRENT_STEP=0

update_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local progress=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo -e "${CYAN}[PROGRESS]${NC} $CURRENT_STEP/$TOTAL_STEPS ($progress%) - $1"
}

# Error handling
handle_error() {
    log_error "Deployment failed at step $CURRENT_STEP: $1"
    log_error "Rolling back changes..."
    rollback_deployment
    exit 1
}

trap 'handle_error "Unexpected error occurred"' ERR

# Rollback function
rollback_deployment() {
    log_warning "Starting rollback process..."
    
    # Rollback microservices
    kubectl rollout undo deployment/user-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} || true
    kubectl rollout undo deployment/aiops-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} || true
    kubectl rollout undo deployment/metrics-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} || true
    kubectl rollout undo deployment/ml-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} || true
    
    log_warning "Rollback completed"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install helm first."
        exit 1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check cluster resources
    local nodes=$(kubectl get nodes --no-headers | wc -l)
    if [ "$nodes" -lt 3 ]; then
        log_warning "Cluster has only $nodes nodes. Recommended minimum is 3 nodes for production."
    fi
    
    log_success "Prerequisites check passed"
    update_progress "Prerequisites validated"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_step "Deploying infrastructure components..."
    
    # Create namespaces
    kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
  labels:
    name: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    environment: ${DEPLOYMENT_ENV}
    version: "6.0"
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-${DEPLOYMENT_ENV}
  labels:
    name: monitoring-${DEPLOYMENT_ENV}
    environment: ${DEPLOYMENT_ENV}
EOF
    
    # Install ArgoCD
    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    
    # Wait for ArgoCD
    kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
    
    # Install Prometheus stack
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring-${DEPLOYMENT_ENV} \
        --create-namespace \
        --values <(cat <<EOF
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
EOF
) \
        --wait
    
    log_success "Infrastructure deployed successfully"
    update_progress "Infrastructure components deployed"
}

# Deploy data layer
deploy_data_layer() {
    log_step "Deploying data layer components..."
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add strimzi https://strimzi.io/charts/
    helm repo update
    
    # Install PostgreSQL
    helm install postgresql bitnami/postgresql \
        --namespace ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} \
        --values <(cat <<EOF
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
EOF
) \
        --wait
    
    # Install Redis
    helm install redis bitnami/redis \
        --namespace ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} \
        --values <(cat <<EOF
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
EOF
) \
        --wait
    
    # Install InfluxDB
    helm repo add influxdata https://helm.influxdata.com/
    helm repo update
    
    helm install influxdb influxdata/influxdb2 \
        --namespace ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} \
        --values <(cat <<EOF
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
EOF
) \
        --wait
    
    log_success "Data layer deployed successfully"
    update_progress "Data layer components deployed"
}

# Deploy Kafka
deploy_kafka() {
    log_step "Deploying Kafka event streaming..."
    
    # Install Strimzi Kafka Operator
    helm install strimzi strimzi/strimzi-kafka-operator \
        --namespace ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} \
        --wait
    
    # Create Kafka cluster
    kubectl apply -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: ea-plan-v6-kafka
  namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
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
EOF
    
    # Create Kafka topics
    kubectl apply -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: metrics-topic
  namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
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
  namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
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
  namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 1209600000
    segment.ms: 86400000
EOF
    
    # Wait for Kafka to be ready
    kubectl wait --for=condition=ready --timeout=600s kafka/ea-plan-v6-kafka -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    
    log_success "Kafka event streaming deployed successfully"
    update_progress "Kafka event streaming deployed"
}

# Deploy Kong API Gateway
deploy_kong_gateway() {
    log_step "Deploying Kong API Gateway..."
    
    # Add Kong Helm repository
    helm repo add kong https://charts.konghq.com
    helm repo update
    
    # Install Kong
    helm install kong kong/kong \
        --namespace ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} \
        --values <(cat <<EOF
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
EOF
) \
        --wait
    
    log_success "Kong API Gateway deployed successfully"
    update_progress "Kong API Gateway deployed"
}

# Build and deploy microservices
deploy_microservices() {
    log_step "Building and deploying microservices..."
    
    # Build Docker images
    log_info "Building Docker images..."
    
    # Build User Service
    docker build -t ${REGISTRY_URL}/user-service:6.0 ./ea-plan-v6-microservices/user-service/
    docker push ${REGISTRY_URL}/user-service:6.0
    
    # Build AIOps Service
    docker build -t ${REGISTRY_URL}/aiops-service:6.0 ./ea-plan-v6-microservices/aiops-service/
    docker push ${REGISTRY_URL}/aiops-service:6.0
    
    # Build Metrics Service
    docker build -t ${REGISTRY_URL}/metrics-service:6.0 ./ea-plan-v6-microservices/metrics-service/
    docker push ${REGISTRY_URL}/metrics-service:6.0
    
    # Build ML Service
    docker build -t ${REGISTRY_URL}/ml-service:6.0 ./ea-plan-v6-microservices/ml-service/
    docker push ${REGISTRY_URL}/ml-service:6.0
    
    # Deploy microservices
    kubectl apply -f ./ea-plan-v6-microservices/k8s/microservices-deployment.yaml
    
    # Wait for deployments
    kubectl wait --for=condition=available --timeout=300s deployment/user-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    kubectl wait --for=condition=available --timeout=300s deployment/aiops-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    kubectl wait --for=condition=available --timeout=300s deployment/metrics-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    kubectl wait --for=condition=available --timeout=300s deployment/ml-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    
    log_success "Microservices deployed successfully"
    update_progress "Microservices deployed"
}

# Deploy Grafana plugin
deploy_grafana_plugin() {
    log_step "Deploying custom Grafana plugin..."
    
    # Build Grafana plugin
    cd ./ea-plan-v6-microservices/grafana-plugin/
    npm install
    npm run build
    
    # Create ConfigMap with plugin
    kubectl create configmap grafana-plugin-ea-plan-v6 \
        --from-file=dist/ \
        --namespace monitoring-${DEPLOYMENT_ENV} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Restart Grafana to load plugin
    kubectl rollout restart deployment/prometheus-grafana -n monitoring-${DEPLOYMENT_ENV}
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus-grafana -n monitoring-${DEPLOYMENT_ENV}
    
    cd - > /dev/null
    
    log_success "Grafana plugin deployed successfully"
    update_progress "Grafana plugin deployed"
}

# Deploy security policies
deploy_security_policies() {
    log_step "Deploying security policies..."
    
    # Install OPA Gatekeeper
    kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
    kubectl wait --for=condition=ready --timeout=300s pod -l control-plane=controller-manager -n gatekeeper-system
    
    # Install Kyverno
    kubectl apply -f https://github.com/kyverno/kyverno/releases/download/v1.10.0/install.yaml
    kubectl wait --for=condition=ready --timeout=300s pod -l app.kubernetes.io/name=kyverno -n kyverno
    
    # Apply security policies
    kubectl apply -f - <<EOF
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
          - ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
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
          - ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
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
EOF
    
    # Apply network policies
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ea-plan-v6-network-policy
  namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    - podSelector:
        matchLabels:
          app: kong-gateway
    ports:
    - protocol: TCP
      port: 3001
    - protocol: TCP
      port: 3002
    - protocol: TCP
      port: 3003
    - protocol: TCP
      port: 3004
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
    - protocol: TCP
      port: 9092
    - protocol: TCP
      port: 8086
  - to: []
    ports:
    - protocol: UDP
      port: 53
EOF
    
    log_success "Security policies deployed successfully"
    update_progress "Security policies deployed"
}

# Run performance tests
run_performance_tests() {
    log_step "Running performance tests..."
    
    # Install k6 for load testing
    if ! command -v k6 &> /dev/null; then
        log_info "Installing k6 for load testing..."
        curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
        sudo mv k6 /usr/local/bin/
    fi
    
    # Get Kong Gateway URL
    local kong_url=$(kubectl get svc kong-kong-proxy -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -z "$kong_url" ]; then
        kong_url="localhost"
        kubectl port-forward svc/kong-kong-proxy -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} 8080:80 &
        local port_forward_pid=$!
        sleep 5
    fi
    
    # Create k6 test script
    cat > k6-test.js <<EOF
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
  let response = http.get('http://${kong_url}:8080/api/v1/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
  sleep(1);
}
EOF
    
    # Run performance tests
    log_info "Running k6 performance tests..."
    k6 run k6-test.js
    
    # Cleanup
    rm k6-test.js
    if [ ! -z "$port_forward_pid" ]; then
        kill $port_forward_pid
    fi
    
    log_success "Performance tests completed successfully"
    update_progress "Performance tests completed"
}

# Validate deployment
validate_deployment() {
    log_step "Validating deployment..."
    
    # Check all pods are running
    local failed_pods=$(kubectl get pods -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} --field-selector=status.phase!=Running --no-headers | wc -l)
    if [ "$failed_pods" -gt 0 ]; then
        log_error "Some pods are not running:"
        kubectl get pods -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} --field-selector=status.phase!=Running
        return 1
    fi
    
    # Check services are accessible
    local services=("user-service" "aiops-service" "metrics-service" "ml-service")
    for service in "${services[@]}"; do
        if ! kubectl get svc $service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} &> /dev/null; then
            log_error "Service $service not found"
            return 1
        fi
    done
    
    # Check Kafka topics
    kubectl exec -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} ea-plan-v6-kafka-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --list | grep -E "(metrics-topic|anomalies-topic|alerts-topic)"
    
    # Check Prometheus targets
    local prometheus_pod=$(kubectl get pods -n monitoring-${DEPLOYMENT_ENV} -l app.kubernetes.io/name=prometheus --no-headers -o custom-columns=":metadata.name" | head -1)
    kubectl exec -n monitoring-${DEPLOYMENT_ENV} $prometheus_pod -- wget -qO- http://localhost:9090/api/v1/targets | grep -q "up.*true"
    
    log_success "Deployment validation completed successfully"
    update_progress "Deployment validation completed"
}

# Display deployment information
display_deployment_info() {
    log_step "Deployment Information"
    
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}EA Plan v6.0 Deployment Complete${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    echo -e "${GREEN}✅ Infrastructure:${NC}"
    echo -e "  • Kubernetes Cluster: $(kubectl cluster-info --request-timeout=5s | head -1)"
    echo -e "  • Namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}"
    echo -e "  • Environment: ${DEPLOYMENT_ENV}"
    
    echo -e "${GREEN}✅ Services:${NC}"
    echo -e "  • User Service: $(kubectl get svc user-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • AIOps Service: $(kubectl get svc aiops-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • Metrics Service: $(kubectl get svc metrics-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • ML Service: $(kubectl get svc ml-service -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    
    echo -e "${GREEN}✅ Data Layer:${NC}"
    echo -e "  • PostgreSQL: $(kubectl get svc postgresql -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • Redis: $(kubectl get svc redis-master -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • InfluxDB: $(kubectl get svc influxdb -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • Kafka: $(kubectl get svc ea-plan-v6-kafka-kafka-bootstrap -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    
    echo -e "${GREEN}✅ Monitoring:${NC}"
    echo -e "  • Prometheus: $(kubectl get svc prometheus-kube-prometheus-prometheus -n monitoring-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    echo -e "  • Grafana: $(kubectl get svc prometheus-grafana -n monitoring-${DEPLOYMENT_ENV} -o jsonpath='{.spec.clusterIP}')"
    
    echo -e "${GREEN}✅ Access Information:${NC}"
    echo -e "  • Kong Gateway: kubectl port-forward svc/kong-kong-proxy -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} 8080:80"
    echo -e "  • Kong Admin: kubectl port-forward svc/kong-kong-admin -n ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV} 8001:8001"
    echo -e "  • Grafana: kubectl port-forward svc/prometheus-grafana -n monitoring-${DEPLOYMENT_ENV} 3000:80"
    echo -e "  • ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
    
    echo -e "${GREEN}✅ Performance Targets:${NC}"
    echo -e "  • API Gateway: <10ms p95 latency"
    echo -e "  • Microservices: <50ms p95 latency"
    echo -e "  • ML Service: <500ms p95 latency"
    echo -e "  • Availability: >99.9%"
    
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}Deployment completed successfully!${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# Main execution
main() {
    log_info "Starting EA Plan v6.0 Complete Deployment"
    log_info "=========================================="
    log_info "Environment: ${DEPLOYMENT_ENV}"
    log_info "Namespace: ${NAMESPACE_PREFIX}-${DEPLOYMENT_ENV}"
    log_info "Registry: ${REGISTRY_URL}"
    log_info "=========================================="
    
    check_prerequisites
    deploy_infrastructure
    deploy_data_layer
    deploy_kafka
    deploy_kong_gateway
    deploy_microservices
    deploy_grafana_plugin
    deploy_security_policies
    run_performance_tests
    validate_deployment
    display_deployment_info
    
    log_success "EA Plan v6.0 Complete Deployment Successful!"
    log_info "=========================================="
    log_info "Next steps:"
    log_info "1. Configure Kong API Gateway routes"
    log_info "2. Setup Grafana dashboards"
    log_info "3. Configure alerting rules"
    log_info "4. Run integration tests"
    log_info "5. Monitor system performance"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        --registry)
            REGISTRY_URL="$2"
            shift 2
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV          Deployment environment (dev/staging/prod)"
            echo "  --registry URL     Docker registry URL"
            echo "  --log-level LEVEL Log level (debug/info/warning/error)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
