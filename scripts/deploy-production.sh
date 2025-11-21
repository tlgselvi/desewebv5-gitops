#!/bin/bash
# Production Deployment Script - Dese EA Plan v6.8.2
# Usage: ./scripts/deploy-production.sh [backend|frontend|all]

set -e

VERSION="v6.8.2"
REGISTRY="europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images"
NAMESPACE="default"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed"
        exit 1
    fi
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud is not installed"
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Authenticate with Google Cloud
authenticate_gcloud() {
    log_info "Authenticating with Google Cloud..."
    gcloud auth configure-docker europe-west3-docker.pkg.dev
    log_success "Google Cloud authentication successful"
}

# Build and push backend image
deploy_backend() {
    log_info "Building backend Docker image..."
    docker build -t ${REGISTRY}/dese-api:${VERSION} .
    
    log_info "Pushing backend image to registry..."
    docker push ${REGISTRY}/dese-api:${VERSION}
    
    log_info "Applying backend deployment..."
    kubectl apply -f k8s/deployment-api.yaml
    
    log_info "Waiting for backend rollout..."
    kubectl rollout status deployment/dese-api-deployment -n ${NAMESPACE} --timeout=5m
    
    log_success "Backend deployment completed"
}

# Build and push frontend image
deploy_frontend() {
    log_info "Building frontend Docker image..."
    cd frontend
    docker build -t ${REGISTRY}/dese-frontend:${VERSION} .
    
    log_info "Pushing frontend image to registry..."
    docker push ${REGISTRY}/dese-frontend:${VERSION}
    cd ..
    
    log_info "Applying frontend deployment..."
    kubectl apply -f k8s/04-dese-frontend-deployment.yaml
    
    log_info "Waiting for frontend rollout..."
    kubectl rollout status deployment/dese-frontend-deployment --timeout=5m
    
    log_success "Frontend deployment completed"
}

# Check secrets
check_secrets() {
    log_info "Checking Kubernetes secrets..."
    
    if ! kubectl get secret dese-db-secret -n ${NAMESPACE} &> /dev/null; then
        log_warning "dese-db-secret not found. Please create it:"
        echo "kubectl create secret generic dese-db-secret --from-literal=DATABASE_URL='postgresql://...'"
        exit 1
    fi
    
    if ! kubectl get secret dese-redis-secret -n ${NAMESPACE} &> /dev/null; then
        log_warning "dese-redis-secret not found. Please create it:"
        echo "kubectl create secret generic dese-redis-secret --from-literal=REDIS_URL='redis://...'"
        exit 1
    fi
    
    log_success "All secrets are present"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Backend health check
    log_info "Checking backend health..."
    if curl -f -s https://api.poolfab.com.tr/health > /dev/null; then
        log_success "Backend is healthy"
    else
        log_warning "Backend health check failed"
    fi
    
    # Frontend health check
    log_info "Checking frontend health..."
    if curl -f -s https://app.poolfab.com.tr/ > /dev/null; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check failed"
    fi
}

# Main
main() {
    DEPLOY_TARGET=${1:-all}
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Dese EA Plan Production Deployment"
    echo "Version: ${VERSION}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    check_prerequisites
    authenticate_gcloud
    check_secrets
    
    case $DEPLOY_TARGET in
        backend)
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        all)
            deploy_backend
            deploy_frontend
            ;;
        *)
            log_error "Invalid deployment target: $DEPLOY_TARGET"
            echo "Usage: $0 [backend|frontend|all]"
            exit 1
            ;;
    esac
    
    health_check
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Deployment completed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"

