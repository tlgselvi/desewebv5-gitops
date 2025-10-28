#!/bin/bash
# EA Plan v6.0 - Infrastructure Setup Script
# This script sets up the complete infrastructure for EA Plan v6.0

set -euo pipefail

# Configuration
NAMESPACE_PREFIX="ea-plan-v6"
REGISTRY_URL="ghcr.io/your-org"
KUBECONFIG_PATH="${KUBECONFIG_PATH:-~/.kube/config}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
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
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE_PREFIX}-dev
  labels:
    name: ${NAMESPACE_PREFIX}-dev
    environment: development
    version: "6.0"
---
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE_PREFIX}-staging
  labels:
    name: ${NAMESPACE_PREFIX}-staging
    environment: staging
    version: "6.0"
---
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE_PREFIX}-prod
  labels:
    name: ${NAMESPACE_PREFIX}-prod
    environment: production
    version: "6.0"
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-prod
  labels:
    name: monitoring-prod
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
  labels:
    name: argocd
    environment: platform
EOF
    
    log_success "Namespaces created successfully"
}

# Install ArgoCD
install_argocd() {
    log_info "Installing ArgoCD..."
    
    # Create ArgoCD namespace if not exists
    kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
    
    # Install ArgoCD
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    
    # Wait for ArgoCD to be ready
    log_info "Waiting for ArgoCD to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
    
    # Get ArgoCD admin password
    ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
    
    log_success "ArgoCD installed successfully"
    log_info "ArgoCD admin password: ${ARGOCD_PASSWORD}"
    log_info "Access ArgoCD UI: kubectl port-forward svc/argocd-server -n argocd 8080:443"
}

# Install Prometheus Stack
install_prometheus() {
    log_info "Installing Prometheus monitoring stack..."
    
    # Add Prometheus Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Create Prometheus values file
    cat > prometheus-values.yaml <<EOF
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false
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

alertmanager:
  enabled: true
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi

kubeStateMetrics:
  enabled: true

nodeExporter:
  enabled: true
EOF
    
    # Install Prometheus stack
    helm install prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring-prod \
        --create-namespace \
        --values prometheus-values.yaml \
        --wait
    
    log_success "Prometheus monitoring stack installed"
}

# Install Kong Gateway
install_kong() {
    log_info "Installing Kong API Gateway..."
    
    # Add Kong Helm repository
    helm repo add kong https://charts.konghq.com
    helm repo update
    
    # Create Kong values file
    cat > kong-values.yaml <<EOF
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
    
    # Install Kong
    helm install kong kong/kong \
        --namespace ${NAMESPACE_PREFIX}-prod \
        --values kong-values.yaml \
        --wait
    
    log_success "Kong API Gateway installed"
}

# Install Kafka
install_kafka() {
    log_info "Installing Kafka event streaming..."
    
    # Add Strimzi Helm repository
    helm repo add strimzi https://strimzi.io/charts/
    helm repo update
    
    # Install Strimzi Kafka Operator
    helm install strimzi strimzi/strimzi-kafka-operator \
        --namespace ${NAMESPACE_PREFIX}-prod \
        --wait
    
    # Create Kafka cluster
    kubectl apply -f - <<EOF
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: ea-plan-v6-kafka
  namespace: ${NAMESPACE_PREFIX}-prod
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
  namespace: ${NAMESPACE_PREFIX}-prod
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000  # 7 days
    segment.ms: 86400000     # 1 day
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: anomalies-topic
  namespace: ${NAMESPACE_PREFIX}-prod
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 2592000000  # 30 days
    segment.ms: 86400000      # 1 day
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: alerts-topic
  namespace: ${NAMESPACE_PREFIX}-prod
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 1209600000  # 14 days
    segment.ms: 86400000      # 1 day
EOF
    
    log_success "Kafka event streaming installed"
}

# Install PostgreSQL
install_postgresql() {
    log_info "Installing PostgreSQL database..."
    
    # Add Bitnami Helm repository
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    # Create PostgreSQL values file
    cat > postgresql-values.yaml <<EOF
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
    
    # Install PostgreSQL
    helm install postgresql bitnami/postgresql \
        --namespace ${NAMESPACE_PREFIX}-prod \
        --values postgresql-values.yaml \
        --wait
    
    log_success "PostgreSQL database installed"
}

# Install Redis
install_redis() {
    log_info "Installing Redis cache..."
    
    # Create Redis values file
    cat > redis-values.yaml <<EOF
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
    
    # Install Redis
    helm install redis bitnami/redis \
        --namespace ${NAMESPACE_PREFIX}-prod \
        --values redis-values.yaml \
        --wait
    
    log_success "Redis cache installed"
}

# Install InfluxDB
install_influxdb() {
    log_info "Installing InfluxDB time-series database..."
    
    # Add InfluxData Helm repository
    helm repo add influxdata https://helm.influxdata.com/
    helm repo update
    
    # Create InfluxDB values file
    cat > influxdb-values.yaml <<EOF
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
    
    # Install InfluxDB
    helm install influxdb influxdata/influxdb2 \
        --namespace ${NAMESPACE_PREFIX}-prod \
        --values influxdb-values.yaml \
        --wait
    
    log_success "InfluxDB time-series database installed"
}

# Setup ArgoCD Applications
setup_argocd_applications() {
    log_info "Setting up ArgoCD applications..."
    
    # Create ArgoCD application for microservices
    kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ea-plan-v6-microservices
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ea-plan-v6-manifests
    targetRevision: HEAD
    path: microservices
  destination:
    server: https://kubernetes.default.svc
    namespace: ${NAMESPACE_PREFIX}-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ea-plan-v6-monitoring
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ea-plan-v6-manifests
    targetRevision: HEAD
    path: monitoring
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
EOF
    
    log_success "ArgoCD applications configured"
}

# Validate installation
validate_installation() {
    log_info "Validating installation..."
    
    # Check namespaces
    kubectl get namespaces | grep -E "(ea-plan-v6|monitoring|argocd)"
    
    # Check ArgoCD
    kubectl get pods -n argocd
    
    # Check Prometheus
    kubectl get pods -n monitoring-prod
    
    # Check Kong
    kubectl get pods -n ${NAMESPACE_PREFIX}-prod | grep kong
    
    # Check Kafka
    kubectl get pods -n ${NAMESPACE_PREFIX}-prod | grep kafka
    
    # Check databases
    kubectl get pods -n ${NAMESPACE_PREFIX}-prod | grep -E "(postgresql|redis|influxdb)"
    
    log_success "Installation validation completed"
}

# Main execution
main() {
    log_info "Starting EA Plan v6.0 Infrastructure Setup"
    log_info "=============================================="
    
    check_prerequisites
    create_namespaces
    install_argocd
    install_prometheus
    install_kong
    install_kafka
    install_postgresql
    install_redis
    install_influxdb
    setup_argocd_applications
    validate_installation
    
    log_success "EA Plan v6.0 Infrastructure Setup Completed!"
    log_info "=============================================="
    log_info "Next steps:"
    log_info "1. Deploy microservices using ArgoCD"
    log_info "2. Configure Kong API Gateway routes"
    log_info "3. Setup monitoring dashboards"
    log_info "4. Deploy ML service with TensorFlow model"
    log_info "5. Execute performance testing"
    
    # Display access information
    log_info "Access Information:"
    log_info "ArgoCD UI: kubectl port-forward svc/argocd-server -n argocd 8080:443"
    log_info "Grafana: kubectl port-forward svc/prometheus-grafana -n monitoring-prod 3000:80"
    log_info "Kong Admin: kubectl port-forward svc/kong-kong-admin -n ${NAMESPACE_PREFIX}-prod 8001:8001"
}

# Run main function
main "$@"
