#!/bin/bash
# Rollback Procedure Script - Dese EA Plan v6.8.0
# Phase-5 Sprint 3: Task 3.3
# Automated rollback procedure for production deployments

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-dese-ea-plan-v5-prod}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-dese-ea-plan-v5}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-https://api.dese.ai/health}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-300}" # 5 minutes

# Function to print messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Unable to connect to Kubernetes cluster."
        exit 1
    fi
}

# Function to check deployment health
check_health() {
    local url=$1
    local max_attempts=10
    local attempt=0
    
    print_info "Checking health at $url"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_info "Health check passed"
            return 0
        fi
        
        attempt=$((attempt + 1))
        print_warn "Health check failed (attempt $attempt/$max_attempts), retrying..."
        sleep 5
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to get current deployment revision
get_current_revision() {
    kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" \
        | grep -E "^\s*[0-9]+\s" \
        | head -1 \
        | awk '{print $1}'
}

# Function to get previous deployment revision
get_previous_revision() {
    kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" \
        | grep -E "^\s*[0-9]+\s" \
        | head -2 \
        | tail -1 \
        | awk '{print $1}'
}

# Function to rollback to previous revision
rollback_to_previous() {
    print_info "Rolling back to previous revision..."
    
    if kubectl rollout undo deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"; then
        print_info "Rollback command executed successfully"
        
        # Wait for rollout to complete
        print_info "Waiting for rollout to complete..."
        if kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout="${ROLLBACK_TIMEOUT}s"; then
            print_info "Rollback completed successfully"
            return 0
        else
            print_error "Rollback timeout or failed"
            return 1
        fi
    else
        print_error "Failed to execute rollback command"
        return 1
    fi
}

# Function to rollback to specific revision
rollback_to_revision() {
    local revision=$1
    
    print_info "Rolling back to revision $revision..."
    
    if kubectl rollout undo deployment/"$DEPLOYMENT_NAME" --to-revision="$revision" -n "$NAMESPACE"; then
        print_info "Rollback command executed successfully"
        
        # Wait for rollout to complete
        print_info "Waiting for rollout to complete..."
        if kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout="${ROLLBACK_TIMEOUT}s"; then
            print_info "Rollback completed successfully"
            return 0
        else
            print_error "Rollback timeout or failed"
            return 1
        fi
    else
        print_error "Failed to execute rollback command"
        return 1
    fi
}

# Function to show deployment history
show_history() {
    print_info "Deployment history:"
    kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"
}

# Function to verify rollback
verify_rollback() {
    print_info "Verifying rollback..."
    
    # Check deployment status
    if kubectl get deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | grep -q "True"; then
        print_info "Deployment is available"
    else
        print_error "Deployment is not available"
        return 1
    fi
    
    # Check pod status
    local ready_pods=$(kubectl get pods -l app="$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o "True" | wc -l)
    local total_pods=$(kubectl get pods -l app="$DEPLOYMENT_NAME" -n "$NAMESPACE" --no-headers | wc -l)
    
    print_info "Ready pods: $ready_pods/$total_pods"
    
    if [ "$ready_pods" -eq "$total_pods" ]; then
        print_info "All pods are ready"
    else
        print_warn "Not all pods are ready"
    fi
    
    # Health check
    if check_health "$HEALTH_CHECK_URL"; then
        print_info "Health check passed"
        return 0
    else
        print_error "Health check failed"
        return 1
    fi
}

# Main function
main() {
    print_info "=== Rollback Procedure ==="
    print_info "Deployment: $DEPLOYMENT_NAME"
    print_info "Namespace: $NAMESPACE"
    print_info "Health Check URL: $HEALTH_CHECK_URL"
    echo ""
    
    # Check prerequisites
    check_kubectl
    
    # Parse arguments
    case "${1:-}" in
        --revision|-r)
            if [ -z "${2:-}" ]; then
                print_error "Revision number required"
                exit 1
            fi
            rollback_to_revision "$2"
            ;;
        --previous|-p)
            rollback_to_previous
            ;;
        --history|-h)
            show_history
            exit 0
            ;;
        --help|--usage|-h)
            cat <<EOF
Usage: $0 [OPTIONS]

Options:
    --revision, -r REVISION    Rollback to specific revision number
    --previous, -p             Rollback to previous revision (default)
    --history, -h              Show deployment history
    --help                     Show this help message

Environment Variables:
    NAMESPACE                  Kubernetes namespace (default: dese-ea-plan-v5-prod)
    DEPLOYMENT_NAME            Deployment name (default: dese-ea-plan-v5)
    HEALTH_CHECK_URL           Health check URL (default: https://api.dese.ai/health)
    ROLLBACK_TIMEOUT           Rollback timeout in seconds (default: 300)

Examples:
    $0 --previous              # Rollback to previous revision
    $0 --revision 5             # Rollback to revision 5
    $0 --history                # Show deployment history
EOF
            exit 0
            ;;
        *)
            print_info "No option specified, rolling back to previous revision..."
            rollback_to_previous
            ;;
    esac
    
    # Verify rollback
    if verify_rollback; then
        print_info "=== Rollback Verification Complete ==="
        print_info "Rollback successful!"
        
        # Show current status
        echo ""
        print_info "Current deployment status:"
        kubectl get deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"
        echo ""
        kubectl get pods -l app="$DEPLOYMENT_NAME" -n "$NAMESPACE"
    else
        print_error "=== Rollback Verification Failed ==="
        print_error "Rollback may have failed. Please check manually."
        exit 1
    fi
}

# Run main function
main "$@"

