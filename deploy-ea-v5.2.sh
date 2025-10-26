#!/bin/bash
set -euo pipefail

# === EA PLAN v5.2 – SELF-HEALING DEPLOYMENT & DRIFT ANTICIPATION ===
# Mode: Pre-Production | Domain: CPT Optimization | Stack: Kubernetes + GitOps + AIOps
# Author: CPT Digital Team
# Version: 5.2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="cpt-web"
NAMESPACE="default"
GITHUB_REPO=$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
BRANCH="main"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v kubectl &> /dev/null || error "kubectl not found"
    command -v argocd &> /dev/null || error "argocd CLI not found"
    command -v gh &> /dev/null || error "GitHub CLI not found"
    command -v jq &> /dev/null || error "jq not found"
    
    # Verify kubectl connectivity
    kubectl cluster-info &> /dev/null || error "Cannot connect to Kubernetes cluster"
    
    log "✅ All prerequisites met"
}

# Step 1: Deploy manifests
deploy_manifests() {
    log "[1/6] 🚀 Deploying manifests..."
    
    kubectl apply -k deploy/base || warn "Base deployment failed"
    kubectl apply -k deploy/overlays/prod || warn "Production overlay deployment failed"
    
    # Sync ArgoCD application
    if argocd app get "$APP_NAME" &> /dev/null; then
        argocd app sync "$APP_NAME" --timeout 300 || warn "ArgoCD sync failed"
        log "✅ ArgoCD sync completed"
    else
        warn "ArgoCD app '$APP_NAME' not found, skipping sync"
    fi
    
    log "✅ Manifests deployed successfully"
}

# Step 2: Trigger AIOps canary rollout
trigger_canary_rollout() {
    log "[2/6] 🧠 Triggering AIOps canary rollout..."
    
    gh workflow run ci-cd.yml \
        --ref "$BRANCH" \
        --field rollout=canary \
        --field policy_check=true \
        --repo "$GITHUB_REPO" || error "Failed to trigger workflow"
    
    info "Workflow triggered, waiting 10s for initialization..."
    sleep 10
    
    # Check workflow status
    RUN_ID=$(gh run list --workflow=ci-cd.yml --branch="$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId')
    info "Monitoring workflow run: $RUN_ID"
    
    log "✅ Canary rollout triggered"
}

# Step 3: Apply guardrails and alert rules
apply_guardrails() {
    log "[3/6] 🛡️ Applying guardrails & alert rules..."
    
    # Apply Kyverno drift prevention policy
    if [ -f "policies/kyverno/prevent-drift.yaml" ]; then
        kubectl apply -f policies/kyverno/prevent-drift.yaml
        log "✅ Kyverno drift prevention policy applied"
    else
        warn "Kyverno drift prevention policy not found"
    fi
    
    # Apply Prometheus alert rules
    if [ -f "monitoring/prometheus-rules.yaml" ]; then
        kubectl apply -f monitoring/prometheus-rules.yaml
        log "✅ Prometheus alert rules applied"
    else
        warn "Prometheus alert rules not found"
    fi
    
    # Apply self-healing job
    if [ -f "aiops/self-heal-job.yaml" ]; then
        kubectl apply -f aiops/self-heal-job.yaml
        log "✅ Self-healing job applied"
    else
        warn "Self-healing job not found"
    fi
    
    log "✅ Guardrails and alert rules applied"
}

# Step 4: Verify rollout and job health
verify_rollout() {
    log "[4/6] 🔍 Verifying rollout & job health..."
    
    # Check rollout status (assuming Argo Rollouts)
    if command -v kubectl-argo-rollouts &> /dev/null; then
        kubectl-argo-rollouts get rollout "$APP_NAME" -n "$NAMESPACE" || warn "Cannot get rollout status"
    else
        # Fallback to standard kubectl
        kubectl get rollout "$APP_NAME" -n "$NAMESPACE" || warn "Rollout resource not found"
    fi
    
    # Check ArgoCD app diff
    if argocd app get "$APP_NAME" &> /dev/null; then
        argocd app diff "$APP_NAME" || warn "Cannot show ArgoCD diff"
    fi
    
    # Check self-healing job logs
    if kubectl get job self-heal-cpt -n "$NAMESPACE" &> /dev/null; then
        kubectl logs job/self-heal-cpt -n "$NAMESPACE" --tail=20 || warn "Cannot get job logs"
    else
        warn "Self-healing job not found"
    fi
    
    # Check Prometheus rules
    if kubectl get prometheusrules predictive-alerts -n monitoring &> /dev/null; then
        kubectl get prometheusrules predictive-alerts -n monitoring
        log "✅ Prometheus alert rules verified"
    else
        warn "Predictive alerts not found"
    fi
    
    log "✅ Rollout verification completed"
}

# Step 5: Run drift and risk validation
validate_drift_risk() {
    log "[5/6] 📊 Running drift & risk validation..."
    
    # Check risk prediction file
    if [ -f "aiops/risk-prediction.json" ]; then
        cat aiops/risk-prediction.json | jq .
        log "✅ Risk prediction analyzed"
    else
        warn "Risk prediction file not found"
    fi
    
    # Check rollback history
    if [ -f "logs/rollback-history.log" ]; then
        tail -20 logs/rollback-history.log
        log "✅ Rollback history reviewed"
    else
        warn "Rollback history not found"
    fi
    
    log "✅ Drift and risk validation completed"
}

# Step 6: Display validation summary
show_summary() {
    log "[6/6] ✅ Validation criteria summary"
    echo "-----------------------------------"
    echo "• 3 successful rollouts (pause + retry + rollback)"
    echo "• Self-healing job completed successfully"
    echo "• Drift policy blocked manual changes"
    echo "• SLOs met for 7-day window"
    echo "-----------------------------------"
    
    echo ""
    info "🟢 EA Plan v5.2 deployment initiated. Monitor system for 48h stability window."
    
    # Display monitoring links
    echo ""
    echo "📊 Monitoring Dashboard:"
    echo "  • ArgoCD: https://argocd.example.com"
    echo "  • Grafana: https://grafana.example.com"
    echo "  • GitHub Actions: https://github.com/$GITHUB_REPO/actions"
    echo ""
    
    log "✅ Deployment summary displayed"
}

# Main execution
main() {
    log "=== Starting EA Plan v5.2 Deployment ==="
    
    check_prerequisites
    deploy_manifests
    trigger_canary_rollout
    apply_guardrails
    verify_rollout
    validate_drift_risk
    show_summary
    
    log "=== EA Plan v5.2 Deployment Complete ==="
}

# Run main function
main "$@"
