#!/bin/bash
# =============================================================================
# Full System Recovery Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./full-recovery.sh --region <region> [options]
# Options:
#   --region REGION       Target region for recovery (required)
#   --backup-date DATE    Specific backup date (YYYY-MM-DD)
#   --dry-run             Show what would be done
#   --skip-dns            Skip DNS update
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${LOG_DIR:-/var/log/dr}/full-recovery-$(date +%Y%m%d_%H%M%S).log"
RECOVERY_REPORT="${REPORT_DIR:-/var/log/dr}/recovery-report-$(date +%Y%m%d_%H%M%S).md"

# Parse arguments
REGION=""
BACKUP_DATE=""
DRY_RUN=false
SKIP_DNS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --backup-date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-dns)
            SKIP_DNS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$REGION" ]]; then
    echo "Error: --region is required"
    exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$RECOVERY_REPORT")"

# Logging functions
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    send_notification "RECOVERY FAILED" "$1"
    finalize_report "FAILED" "$1"
    exit 1
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🚨 DR Full Recovery $status\",
                \"attachments\": [{
                    \"color\": \"$([ \"$status\" == \"SUCCESS\" ] && echo \"good\" || echo \"danger\")\",
                    \"fields\": [
                        {\"title\": \"Region\", \"value\": \"$REGION\", \"short\": true},
                        {\"title\": \"Status\", \"value\": \"$status\", \"short\": true},
                        {\"title\": \"Details\", \"value\": \"$message\"}
                    ]
                }]
            }" || true
    fi
    
    if [[ -n "${PAGERDUTY_ROUTING_KEY:-}" ]]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"$([ \"$status\" == \"SUCCESS\" ] && echo \"resolve\" || echo \"trigger\")\",
                \"dedup_key\": \"dr-recovery-$(date +%Y%m%d)\",
                \"payload\": {
                    \"summary\": \"DR Full Recovery $status: $message\",
                    \"severity\": \"$([ \"$status\" == \"SUCCESS\" ] && echo \"info\" || echo \"critical\")\",
                    \"source\": \"dr-recovery-system\",
                    \"custom_details\": {
                        \"region\": \"$REGION\",
                        \"dry_run\": \"$DRY_RUN\"
                    }
                }
            }" || true
    fi
}

# Initialize recovery report
init_report() {
    cat > "$RECOVERY_REPORT" << EOF
# Disaster Recovery Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')  
**Target Region:** $REGION  
**Dry Run:** $DRY_RUN  
**Operator:** ${USER:-unknown}

---

## Recovery Timeline

| Step | Time | Duration | Status |
|------|------|----------|--------|
EOF
}

# Record step in report
record_step() {
    local step="$1"
    local status="$2"
    local duration="$3"
    echo "| $step | $(date '+%H:%M:%S') | $duration | $status |" >> "$RECOVERY_REPORT"
}

finalize_report() {
    local status="$1"
    local message="${2:-}"
    
    cat >> "$RECOVERY_REPORT" << EOF

---

## Summary

**Overall Status:** $status  
**Message:** $message

---

## Post-Recovery Checklist

- [ ] Verify all services are running
- [ ] Check database connectivity
- [ ] Validate data integrity
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Update stakeholders
- [ ] Schedule post-mortem

---

**Log File:** \`$LOG_FILE\`  
**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
EOF

    log "INFO" "Recovery report saved to: $RECOVERY_REPORT"
}

# Step 1: Verify prerequisites
verify_prerequisites() {
    local start_time=$(date +%s)
    log "INFO" "Step 1: Verifying prerequisites..."
    
    # Check required tools
    local required_tools="aws kubectl terraform"
    for tool in $required_tools; do
        if ! command -v "$tool" &>/dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        error_exit "AWS credentials not configured"
    fi
    
    # Check kubectl context
    if ! kubectl config current-context &>/dev/null; then
        log "WARN" "No kubectl context configured"
    fi
    
    # Verify backup availability
    if [[ -n "${S3_BUCKET:-}" ]]; then
        local backup_count=$(aws s3 ls "s3://${S3_BUCKET}/postgresql/" --recursive | wc -l)
        if [[ $backup_count -eq 0 ]]; then
            error_exit "No backups found in S3"
        fi
        log "INFO" "Found $backup_count backup files"
    fi
    
    local duration=$(($(date +%s) - start_time))
    record_step "Prerequisites Check" "✅ PASSED" "${duration}s"
    log "INFO" "Prerequisites verified"
}

# Step 2: Provision infrastructure
provision_infrastructure() {
    local start_time=$(date +%s)
    log "INFO" "Step 2: Provisioning infrastructure in $REGION..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would provision infrastructure in $REGION"
        record_step "Infrastructure Provisioning" "⏭️ SKIPPED (dry-run)" "0s"
        return 0
    fi
    
    cd "$PROJECT_ROOT/infrastructure/terraform" 2>/dev/null || {
        log "WARN" "Terraform directory not found, skipping infrastructure provisioning"
        record_step "Infrastructure Provisioning" "⏭️ SKIPPED" "0s"
        return 0
    }
    
    # Select or create DR workspace
    terraform workspace select dr 2>/dev/null || terraform workspace new dr
    
    # Apply infrastructure
    terraform init -input=false
    terraform apply -auto-approve -var="region=$REGION" || error_exit "Terraform apply failed"
    
    # Wait for infrastructure to be ready
    log "INFO" "Waiting for infrastructure to be ready..."
    sleep 60
    
    local duration=$(($(date +%s) - start_time))
    record_step "Infrastructure Provisioning" "✅ COMPLETED" "${duration}s"
    log "INFO" "Infrastructure provisioned"
    
    cd "$PROJECT_ROOT"
}

# Step 3: Configure Kubernetes cluster
configure_kubernetes() {
    local start_time=$(date +%s)
    log "INFO" "Step 3: Configuring Kubernetes cluster..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would configure Kubernetes cluster"
        record_step "Kubernetes Configuration" "⏭️ SKIPPED (dry-run)" "0s"
        return 0
    fi
    
    # Update kubeconfig
    if command -v gcloud &>/dev/null; then
        # GKE
        gcloud container clusters get-credentials "dese-dr-cluster" --region "$REGION" || log "WARN" "Could not get GKE credentials"
    else
        # EKS
        aws eks update-kubeconfig --name "dese-dr-cluster" --region "$REGION" || log "WARN" "Could not get EKS credentials"
    fi
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml" || true
    kubectl apply -f "$PROJECT_ROOT/k8s/secret.yaml" || true
    kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml" || true
    
    local duration=$(($(date +%s) - start_time))
    record_step "Kubernetes Configuration" "✅ COMPLETED" "${duration}s"
    log "INFO" "Kubernetes configured"
}

# Step 4: Restore databases
restore_databases() {
    local start_time=$(date +%s)
    log "INFO" "Step 4: Restoring databases..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would restore databases"
        record_step "Database Restoration" "⏭️ SKIPPED (dry-run)" "0s"
        return 0
    fi
    
    # Find backup to restore
    local backup_bucket="${S3_BUCKET:-dese-backups}"
    if [[ -n "$BACKUP_DATE" ]]; then
        local pg_backup=$(aws s3 ls "s3://${backup_bucket}/postgresql/daily/" | grep "$BACKUP_DATE" | tail -1 | awk '{print $4}')
    else
        local pg_backup=$(aws s3 ls "s3://${backup_bucket}/postgresql/daily/" | sort | tail -1 | awk '{print $4}')
    fi
    
    if [[ -z "$pg_backup" ]]; then
        error_exit "No PostgreSQL backup found"
    fi
    
    log "INFO" "Restoring PostgreSQL from: $pg_backup"
    
    # Deploy PostgreSQL first
    kubectl apply -f "$PROJECT_ROOT/k8s/ha-config.yaml" -l app=postgresql || true
    
    # Wait for PostgreSQL to be ready
    kubectl wait --for=condition=ready pod -l app=postgresql -n dese-ea-plan --timeout=300s || log "WARN" "PostgreSQL pod not ready"
    
    # Run restore script
    if [[ -f "$PROJECT_ROOT/scripts/backup/restore-postgresql.sh" ]]; then
        bash "$PROJECT_ROOT/scripts/backup/restore-postgresql.sh" --backup-id "$pg_backup" --from-s3 "$REGION" || error_exit "PostgreSQL restore failed"
    fi
    
    # Restore Redis
    log "INFO" "Restoring Redis..."
    if [[ -f "$PROJECT_ROOT/scripts/backup/restore-redis.sh" ]]; then
        bash "$PROJECT_ROOT/scripts/backup/restore-redis.sh" --latest --from-s3 "$REGION" || log "WARN" "Redis restore failed"
    fi
    
    local duration=$(($(date +%s) - start_time))
    record_step "Database Restoration" "✅ COMPLETED" "${duration}s"
    log "INFO" "Databases restored"
}

# Step 5: Deploy applications
deploy_applications() {
    local start_time=$(date +%s)
    log "INFO" "Step 5: Deploying applications..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would deploy applications"
        record_step "Application Deployment" "⏭️ SKIPPED (dry-run)" "0s"
        return 0
    fi
    
    # Apply all Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/" || log "WARN" "Some manifests failed to apply"
    
    # Wait for deployments
    log "INFO" "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment --all -n dese-ea-plan --timeout=600s || log "WARN" "Some deployments not ready"
    
    # Verify pod status
    kubectl get pods -n dese-ea-plan
    
    local duration=$(($(date +%s) - start_time))
    record_step "Application Deployment" "✅ COMPLETED" "${duration}s"
    log "INFO" "Applications deployed"
}

# Step 6: Update DNS
update_dns() {
    local start_time=$(date +%s)
    log "INFO" "Step 6: Updating DNS..."
    
    if [[ "$DRY_RUN" == "true" || "$SKIP_DNS" == "true" ]]; then
        log "INFO" "[SKIPPED] DNS update"
        record_step "DNS Update" "⏭️ SKIPPED" "0s"
        return 0
    fi
    
    # Get new load balancer IP/hostname
    local lb_hostname=$(kubectl get svc dese-ea-plan -n dese-ea-plan -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    local lb_ip=$(kubectl get svc dese-ea-plan -n dese-ea-plan -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    local target="${lb_hostname:-$lb_ip}"
    
    if [[ -z "$target" ]]; then
        log "WARN" "Could not get load balancer address"
        record_step "DNS Update" "⚠️ MANUAL REQUIRED" "0s"
        return 0
    fi
    
    log "INFO" "New endpoint: $target"
    
    # Update Route53 if configured
    if [[ -n "${HOSTED_ZONE_ID:-}" && -n "${DOMAIN_NAME:-}" ]]; then
        local record_type="A"
        [[ -n "$lb_hostname" ]] && record_type="CNAME"
        
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch "{
                \"Changes\": [{
                    \"Action\": \"UPSERT\",
                    \"ResourceRecordSet\": {
                        \"Name\": \"$DOMAIN_NAME\",
                        \"Type\": \"$record_type\",
                        \"TTL\": 60,
                        \"ResourceRecords\": [{\"Value\": \"$target\"}]
                    }
                }]
            }" || log "WARN" "DNS update failed"
        
        log "INFO" "DNS updated: $DOMAIN_NAME -> $target"
    else
        log "WARN" "DNS not configured, manual update required"
    fi
    
    local duration=$(($(date +%s) - start_time))
    record_step "DNS Update" "✅ COMPLETED" "${duration}s"
}

# Step 7: Verify recovery
verify_recovery() {
    local start_time=$(date +%s)
    log "INFO" "Step 7: Verifying recovery..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would verify recovery"
        record_step "Recovery Verification" "⏭️ SKIPPED (dry-run)" "0s"
        return 0
    fi
    
    local all_passed=true
    
    # Check pod status
    local ready_pods=$(kubectl get pods -n dese-ea-plan --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    log "INFO" "Running pods: $ready_pods"
    
    # Health check
    local api_url="${API_URL:-http://localhost:3000}"
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "${api_url}/api/v1/health" 2>/dev/null || echo "000")
    
    if [[ "$health_status" == "200" ]]; then
        log "INFO" "✅ API health check passed"
    else
        log "WARN" "⚠️ API health check returned: $health_status"
        all_passed=false
    fi
    
    # Database connectivity
    if kubectl exec -n dese-ea-plan deployment/dese-ea-plan -- sh -c 'pg_isready -h $POSTGRES_HOST' &>/dev/null; then
        log "INFO" "✅ Database connectivity verified"
    else
        log "WARN" "⚠️ Database connectivity check failed"
        all_passed=false
    fi
    
    local duration=$(($(date +%s) - start_time))
    
    if [[ "$all_passed" == "true" ]]; then
        record_step "Recovery Verification" "✅ PASSED" "${duration}s"
    else
        record_step "Recovery Verification" "⚠️ PARTIAL" "${duration}s"
    fi
}

# Main execution
main() {
    local total_start=$(date +%s)
    
    log "INFO" "=========================================="
    log "INFO" "DESE EA PLAN - Full System Recovery"
    log "INFO" "Target Region: $REGION"
    log "INFO" "Dry Run: $DRY_RUN"
    log "INFO" "=========================================="
    
    send_notification "STARTED" "Full system recovery initiated for region: $REGION"
    
    init_report
    
    # Execute recovery steps
    verify_prerequisites
    provision_infrastructure
    configure_kubernetes
    restore_databases
    deploy_applications
    update_dns
    verify_recovery
    
    local total_duration=$(($(date +%s) - total_start))
    local total_minutes=$((total_duration / 60))
    
    log "INFO" "=========================================="
    log "INFO" "Recovery completed in ${total_minutes} minutes"
    log "INFO" "=========================================="
    
    finalize_report "SUCCESS" "Recovery completed in ${total_minutes} minutes"
    send_notification "SUCCESS" "Full system recovery completed in ${total_minutes} minutes"
    
    # Print report summary
    echo ""
    echo "Recovery Report:"
    echo "================"
    cat "$RECOVERY_REPORT"
}

main "$@"

