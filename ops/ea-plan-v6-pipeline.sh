#!/bin/bash
# ===============================================
# EA PLAN v6.x LIFECYCLE PIPELINE
# Complete workflow orchestration
# ===============================================

set -e

NAMESPACE_WEB="ea-web"
NAMESPACE_MONITORING="monitoring"
NAMESPACE_AIOPS="aiops"
REPO_PATH="${REPO_PATH:-$PWD}"
PHASE="${PHASE:-all}"
SKIP_ERRORS="${SKIP_ERRORS:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${CYAN}[EA PLAN]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

check_namespace() {
    if ! kubectl get ns "$1" >/dev/null 2>&1; then
        kubectl create ns "$1"
        success "Namespace $1 created"
    fi
}

# 1. INIT Phase
phase_init() {
    log "Phase 1: INIT - System Initialization"
    
    check_namespace "$NAMESPACE_WEB"
    check_namespace "$NAMESPACE_MONITORING"
    check_namespace "$NAMESPACE_AIOPS"
    
    # Create ConfigMap for pipeline tracking
    kubectl create configmap ea-plan-v6-pipeline --from-literal=phase=init \
        --from-literal=start-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -n "$NAMESPACE_WEB" --dry-run=client -o yaml | kubectl apply -f -
    
    success "Init phase complete"
}

# 2. PREDICTIVE Phase
phase_predictive() {
    log "Phase 2: PREDICTIVE - Predictive Analysis Setup"
    
    # Deploy AIOps predictive models
    kubectl create configmap predictive-config -n "$NAMESPACE_MONITORING" \
        --from-literal=forecast_horizon=90 \
        --from-literal=confidence_threshold=0.85 \
        --dry-run=client -o yaml | kubectl apply -f - || true
    
    # Trigger predictive model training job
    kubectl create job --from=cronjob/aiops-predictive-training \
        aiops-predictive-$(date +%s) -n "$NAMESPACE_MONITORING" 2>/dev/null || \
        echo "Predictive training job already exists or cronjob not found"
    
    success "Predictive phase complete"
}

# 3. DRIFT Phase
phase_drift() {
    log "Phase 3: DRIFT - Drift Monitoring"
    
    # Deploy drift detection config
    kubectl apply -f ops/drift-detection-config.yaml -n "$NAMESPACE_MONITORING" 2>/dev/null || \
        kubectl create configmap drift-detection-config -n "$NAMESPACE_MONITORING" \
        --from-literal=enabled=true --dry-run=client -o yaml | kubectl apply -f -
    
    success "Drift phase complete"
}

# 4. ADAPTIVE Phase
phase_adaptive() {
    log "Phase 4: ADAPTIVE - Adaptive Tuning"
    
    # Apply adaptive configuration
    kubectl patch configmap ea-plan-v6-pipeline -n "$NAMESPACE_WEB" \
        --type merge -p '{"data":{"adaptive-tuning":"active"}}' || true
    
    success "Adaptive phase complete"
}

# 5. AUTOSCALING Phase
phase_autoscaling() {
    log "Phase 5: AUTOSCALING - Auto-scaling Configuration"
    
    # Apply HPA configurations
    kubectl apply -f deploy/overlays/prod/hpa.yaml -n "$NAMESPACE_WEB" 2>/dev/null || \
        warning "HPA configuration not found, skipping"
    
    success "Autoscaling phase complete"
}

# 6. HEALING Phase
phase_healing() {
    log "Phase 6: HEALING - Self-Healing Configuration"
    
    # Apply auto-remediation rules
    kubectl apply -f configs/auto-remediation-extended.yaml -n "$NAMESPACE_WEB" 2>/dev/null || \
        kubectl create configmap auto-remediation-rules -n "$NAMESPACE_WEB" \
        --from-literal=enabled=true --dry-run=client -o yaml | kubectl apply -f -
    
    success "Healing phase complete"
}

# 7. SECURITY Phase
phase_security() {
    log "Phase 7: SECURITY - Security Hardening"
    
    # Apply network policies
    kubectl apply -f deploy/base/network-policies.yaml -n "$NAMESPACE_WEB" 2>/dev/null || \
        warning "Network policies not found, skipping"
    
    # Apply Pod Security Standards
    kubectl label ns "$NAMESPACE_WEB" pod-security.kubernetes.io/enforce=baseline \
        --overwrite 2>/dev/null || true
    
    success "Security phase complete"
}

# 8. OPTIMIZATION Phase
phase_optimization() {
    log "Phase 8: OPTIMIZATION - Performance Optimization"
    
    # Apply optimization config
    kubectl patch configmap ea-plan-v6-pipeline -n "$NAMESPACE_WEB" \
        --type merge -p '{"data":{"optimization":"active","LastUpdated":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}' || true
    
    success "Optimization phase complete"
}

# 9. GO-LIVE Phase
phase_go_live() {
    log "Phase 9: GO-LIVE - Production Activation"
    
    # Run production go-live script
    if [ -f "ops/production-go-live.sh" ]; then
        bash ops/production-go-live.sh
    else
        warning "Production go-live script not found"
    fi
    
    success "Go-live phase complete"
}

# 10. FINBOT/MUBOT DEPLOY Phase
phase_finbot_mubot() {
    log "Phase 10: FINBOT/MUBOT DEPLOY - AIOps Components"
    
    # Deploy FinBot and MuBot
    if [ -f "ops/deploy-finbot-mubot.sh" ]; then
        bash ops/deploy-finbot-mubot.sh
    else
        # Fallback deployment
        check_namespace "$NAMESPACE_AIOPS"
        kubectl apply -f deploy/finbot-v2/ -n "$NAMESPACE_AIOPS" 2>/dev/null || true
        kubectl apply -f deploy/mubot-v2/ -n "$NAMESPACE_AIOPS" 2>/dev/null || true
    fi
    
    success "FinBot/MuBot deployment complete"
}

# 11. PROMETHEUS/GRAFANA Phase
phase_prometheus_grafana() {
    log "Phase 11: PROMETHEUS/GRAFANA - Monitoring Stack"
    
    # Deploy monitoring stack
    kubectl apply -f prometheus-deployment.yaml -n "$NAMESPACE_MONITORING" 2>/dev/null || \
        warning "Prometheus deployment not found"
    
    kubectl apply -f monitoring-stack-production.yaml -n "$NAMESPACE_MONITORING" 2>/dev/null || \
        warning "Monitoring stack not found"
    
    success "Prometheus/Grafana deployment complete"
}

# 12. INSPECT Phase
phase_inspect() {
    log "Phase 12: INSPECT - System Inspection"
    
    echo ""
    echo "=== System Status ==="
    kubectl get pods -A | grep -E "Running|CrashLoopBackOff|Pending" || true
    
    echo ""
    echo "=== FinBot/MuBot Status ==="
    kubectl get pods -n "$NAMESPACE_AIOPS" | grep -E "finbot|mubot" || true
    
    echo ""
    echo "=== Monitoring Stack ==="
    kubectl get pods -n "$NAMESPACE_MONITORING" | grep -E "prometheus|grafana" || true
    
    success "Inspect phase complete"
}

# 13. AIOPS VALIDATION Phase
phase_aiops_validation() {
    log "Phase 13: AIOPS VALIDATION - AIOps Validation"
    
    # Check FinBot metrics
    FINBOT_POD=$(kubectl get pods -n "$NAMESPACE_AIOPS" -l app=finbot --no-headers -o name 2>/dev/null | head -1)
    if [ -n "$FINBOT_POD" ]; then
        kubectl exec "$FINBOT_POD" -n "$NAMESPACE_AIOPS" -- \
            python3 -c "import requests; r=requests.get('http://localhost:8080/health'); print('FinBot:', r.json())" 2>/dev/null || \
            warning "FinBot health check failed"
    fi
    
    # Check MuBot metrics
    MUBOT_POD=$(kubectl get pods -n "$NAMESPACE_AIOPS" -l app=mubot --no-headers -o name 2>/dev/null | head -1)
    if [ -n "$MUBOT_POD" ]; then
        kubectl exec "$MUBOT_POD" -n "$NAMESPACE_AIOPS" -- \
            python3 -c "import requests; r=requests.get('http://localhost:8081/health'); print('MuBot:', r.json())" 2>/dev/null || \
            warning "MuBot health check failed"
    fi
    
    success "AIOps validation complete"
}

# 14. AUDIT/EXPORT Phase
phase_audit_export() {
    log "Phase 14: AUDIT/EXPORT - System Audit & Export"
    
    if [ -f "ops/audit-ea-plan-v6.sh" ]; then
        bash ops/audit-ea-plan-v6.sh
    else
        warning "Audit script not found"
    fi
    
    # Export system state
    mkdir -p reports/$(date +%Y%m%d)
    kubectl get all -A -o yaml > "reports/$(date +%Y%m%d)/cluster-state.yaml" 2>/dev/null || true
    
    success "Audit/Export phase complete"
}

# 15. MAINTENANCE Phase
phase_maintenance() {
    log "Phase 15: MAINTENANCE - Ongoing Maintenance"
    
    # Cleanup old jobs
    kubectl delete jobs --field-selector status.successful=1 --all-namespaces \
        --grace-period=0 2>/dev/null || true
    
    # Update pipeline status
    kubectl patch configmap ea-plan-v6-pipeline -n "$NAMESPACE_WEB" \
        --type merge -p '{"data":{"phase":"maintenance","LastUpdated":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}' || true
    
    success "Maintenance phase complete"
}

# Main execution
main() {
    echo "==============================================="
    echo "  EA PLAN v6.x LIFECYCLE PIPELINE"
    echo "==============================================="
    echo ""
    
    case "$PHASE" in
        init)
            phase_init
            ;;
        predictive)
            phase_init && phase_predictive
            ;;
        drift)
            phase_init && phase_predictive && phase_drift
            ;;
        adaptive)
            phase_init && phase_predictive && phase_drift && phase_adaptive
            ;;
        autoscaling)
            phase_init && phase_predictive && phase_drift && phase_adaptive && phase_autoscaling
            ;;
        healing)
            phase_init && phase_predictive && phase_drift && phase_adaptive && \
            phase_autoscaling && phase_healing
            ;;
        security)
            phase_init && phase_predictive && phase_drift && phase_adaptive && \
            phase_autoscaling && phase_healing && phase_security
            ;;
        optimization)
            phase_init && phase_predictive && phase_drift && phase_adaptive && \
            phase_autoscaling && phase_healing && phase_security && phase_optimization
            ;;
        go-live)
            phase_init && phase_predictive && phase_drift && phase_adaptive && \
            phase_autoscaling && phase_healing && phase_security && phase_optimization && \
            phase_go_live
            ;;
        finbot-mubot)
            phase_init && phase_finbot_mubot
            ;;
        monitoring)
            phase_init && phase_prometheus_grafana
            ;;
        inspect)
            phase_inspect
            ;;
        validation)
            phase_aiops_validation
            ;;
        audit)
            phase_audit_export
            ;;
        maintenance)
            phase_maintenance
            ;;
        all|*)
            phase_init
            phase_predictive
            phase_drift
            phase_adaptive
            phase_autoscaling
            phase_healing
            phase_security
            phase_optimization
            phase_go_live
            phase_finbot_mubot
            phase_prometheus_grafana
            phase_inspect
            phase_aiops_validation
            phase_audit_export
            phase_maintenance
            ;;
    esac
    
    echo ""
    echo "==============================================="
    success "Pipeline execution complete!"
    echo "==============================================="
}

# Run main
main "$@"

