#!/bin/bash
# EA Plan v6.0 Development Deployment Script

set -euo pipefail

echo "🚀 Starting EA Plan v6.0 Development Deployment"

# Configuration
NAMESPACE="ea-plan-v6-dev"
REGISTRY="ghcr.io/ea-plan-v6"
TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed"
        exit 1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Add labels
    kubectl label namespace $NAMESPACE \
        app=ea-plan-v6 \
        environment=development \
        version=6.0 \
        --overwrite
    
    log_success "Namespace created: $NAMESPACE"
}

# Deploy Kafka
deploy_kafka() {
    log_info "Deploying Kafka cluster..."
    
    # Install Strimzi operator if not exists
    if ! kubectl get crd kafkas.kafka.strimzi.io &> /dev/null; then
        log_info "Installing Strimzi Kafka operator..."
        kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
        kubectl wait --for=condition=Ready pod -l name=strimzi-cluster-operator -n kafka --timeout=300s
    fi
    
    # Deploy Kafka cluster
    kubectl apply -f kafka/kafka-cluster-dev.yaml -n $NAMESPACE
    
    # Wait for Kafka to be ready
    log_info "Waiting for Kafka cluster to be ready..."
    kubectl wait --for=condition=Ready kafka/ea-plan-v6-kafka-dev -n $NAMESPACE --timeout=600s
    
    # Create topics
    kubectl apply -f kafka/topics.yaml -n $NAMESPACE
    
    log_success "Kafka cluster deployed"
}

# Deploy Redis
deploy_redis() {
    log_info "Deploying Redis..."
    
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    helm upgrade --install redis bitnami/redis \
        --namespace $NAMESPACE \
        --set auth.enabled=false \
        --set master.persistence.enabled=false \
        --set replica.replicaCount=1 \
        --wait
    
    log_success "Redis deployed"
}

# Deploy PostgreSQL
deploy_postgres() {
    log_info "Deploying PostgreSQL..."
    
    helm upgrade --install postgres bitnami/postgresql \
        --namespace $NAMESPACE \
        --set auth.postgresPassword=ea_plan_v6_password \
        --set auth.database=ea_plan_v6 \
        --set primary.persistence.enabled=false \
        --wait
    
    log_success "PostgreSQL deployed"
}

# Deploy services
deploy_services() {
    log_info "Deploying microservices..."
    
    # Deploy Auth Service
    helm upgrade --install auth-service ./auth-service/helm \
        --namespace $NAMESPACE \
        --set image.repository=$REGISTRY/auth-service \
        --set image.tag=$TAG \
        --set redis.enabled=false \
        --wait
    
    # Deploy Metrics Service
    helm upgrade --install metrics-service ./metrics-service/helm \
        --namespace $NAMESPACE \
        --set image.repository=$REGISTRY/metrics-service \
        --set image.tag=$TAG \
        --set redis.enabled=false \
        --wait
    
    # Deploy Events Service
    helm upgrade --install events-service ./events-service/helm \
        --namespace $NAMESPACE \
        --set image.repository=$REGISTRY/events-service \
        --set image.tag=$TAG \
        --set redis.enabled=false \
        --wait
    
    # Deploy Alerts Service
    helm upgrade --install alerts-service ./alerts-service/helm \
        --namespace $NAMESPACE \
        --set image.repository=$REGISTRY/alerts-service \
        --set image.tag=$TAG \
        --set redis.enabled=false \
        --wait
    
    # Deploy ML Service
    helm upgrade --install ml-service ./ml-service/helm \
        --namespace $NAMESPACE \
        --set image.repository=$REGISTRY/ml-service \
        --set image.tag=$TAG \
        --set redis.enabled=false \
        --wait
    
    log_success "All microservices deployed"
}

# Deploy monitoring
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    # Deploy Prometheus
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $NAMESPACE \
        --set grafana.adminPassword=admin \
        --set prometheus.prometheusSpec.retention=7d \
        --wait
    
    log_success "Monitoring stack deployed"
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Wait for all pods to be ready
    log_info "Waiting for all pods to be ready..."
    kubectl wait --for=condition=Ready pod -l app=auth-service -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=metrics-service -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=events-service -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=alerts-service -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=Ready pod -l app=ml-service -n $NAMESPACE --timeout=300s
    
    # Test Auth Service
    log_info "Testing Auth Service..."
    AUTH_POD=$(kubectl get pod -l app=auth-service -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $AUTH_POD -n $NAMESPACE -- curl -f http://localhost:3001/health || {
        log_error "Auth Service health check failed"
        return 1
    }
    
    # Test Metrics Service
    log_info "Testing Metrics Service..."
    METRICS_POD=$(kubectl get pod -l app=metrics-service -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $METRICS_POD -n $NAMESPACE -- curl -f http://localhost:3002/health || {
        log_error "Metrics Service health check failed"
        return 1
    }
    
    # Test Events Service
    log_info "Testing Events Service..."
    EVENTS_POD=$(kubectl get pod -l app=events-service -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $EVENTS_POD -n $NAMESPACE -- curl -f http://localhost:3003/health || {
        log_error "Events Service health check failed"
        return 1
    }
    
    # Test Alerts Service
    log_info "Testing Alerts Service..."
    ALERTS_POD=$(kubectl get pod -l app=alerts-service -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $ALERTS_POD -n $NAMESPACE -- curl -f http://localhost:3004/health || {
        log_error "Alerts Service health check failed"
        return 1
    }
    
    # Test ML Service
    log_info "Testing ML Service..."
    ML_POD=$(kubectl get pod -l app=ml-service -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $ML_POD -n $NAMESPACE -- curl -f http://localhost:3005/health || {
        log_error "ML Service health check failed"
        return 1
    }
    
    # Test Kafka connectivity
    log_info "Testing Kafka connectivity..."
    KAFKA_POD=$(kubectl get pod -l strimzi.io/name=ea-plan-v6-kafka-dev -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
    kubectl exec $KAFKA_POD -n $NAMESPACE -- kafka-topics.sh --bootstrap-server localhost:9092 --list || {
        log_error "Kafka connectivity test failed"
        return 1
    }
    
    log_success "All smoke tests passed!"
}

# Generate test data
generate_test_data() {
    log_info "Generating test data..."
    
    # Get service URLs
    AUTH_SERVICE=$(kubectl get svc auth-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    METRICS_SERVICE=$(kubectl get svc metrics-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    EVENTS_SERVICE=$(kubectl get svc events-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    ML_SERVICE=$(kubectl get svc ml-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    
    # Create test user
    log_info "Creating test user..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- \
        curl -X POST http://$AUTH_SERVICE:3001/api/v1/auth/register \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","email":"test@ea-plan-v6.local","password":"password123","role":"admin"}' || true
    
    # Send test metrics
    log_info "Sending test metrics..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- \
        curl -X POST http://$METRICS_SERVICE:3002/api/v1/metrics \
        -H "Content-Type: application/json" \
        -d '{"metrics":[{"timestamp":'$(date +%s000)',"service":"test-service","metric":"cpu_usage","value":75.5},{"timestamp":'$(date +%s000)',"service":"test-service","metric":"memory_usage","value":60.2}]}' || true
    
    # Send test events
    log_info "Sending test events..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- \
        curl -X POST http://$EVENTS_SERVICE:3003/api/v1/events \
        -H "Content-Type: application/json" \
        -d '{"events":[{"type":"deployment","source":"ci-cd","data":{"service":"test-service","version":"1.0.0"}}]}' || true
    
    # Test anomaly detection
    log_info "Testing anomaly detection..."
    kubectl run test-client --image=curlimages/curl --rm -i --restart=Never -- \
        curl -X POST http://$ML_SERVICE:3005/api/v1/ml/detect \
        -H "Content-Type: application/json" \
        -d '{"timestamp":'$(date +%s000)',"service":"test-service","metric":"cpu_usage","value":150.0}' || true
    
    log_success "Test data generated"
}

# Display deployment info
display_info() {
    log_info "Deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "  Namespace: $NAMESPACE"
    echo "  Registry: $REGISTRY"
    echo "  Tag: $TAG"
    echo ""
    echo "🔗 Service URLs:"
    echo "  Auth Service: http://$(kubectl get svc auth-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3001"
    echo "  Metrics Service: http://$(kubectl get svc metrics-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3002"
    echo "  Events Service: http://$(kubectl get svc events-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3003"
    echo "  Alerts Service: http://$(kubectl get svc alerts-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3004"
    echo "  ML Service: http://$(kubectl get svc ml-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3005"
    echo ""
    echo "📈 Monitoring:"
    echo "  Grafana: http://$(kubectl get svc prometheus-grafana -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):80"
    echo "  Prometheus: http://$(kubectl get svc prometheus-kube-prometheus-prometheus -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):9090"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  kubectl get pods -n $NAMESPACE"
    echo "  kubectl get svc -n $NAMESPACE"
    echo "  kubectl logs -f deployment/auth-service -n $NAMESPACE"
    echo "  kubectl port-forward svc/auth-service 3001:3001 -n $NAMESPACE"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    create_namespace
    deploy_kafka
    deploy_redis
    deploy_postgres
    deploy_services
    deploy_monitoring
    run_smoke_tests
    generate_test_data
    display_info
    
    log_success "🎉 EA Plan v6.0 Development Deployment Complete!"
}

# Run main function
main "$@"
