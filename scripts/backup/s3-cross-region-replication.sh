#!/bin/bash
# =============================================================================
# S3 Cross-Region Replication Setup & Sync Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./s3-cross-region-replication.sh [setup|sync|verify]
# =============================================================================

set -euo pipefail

# Configuration
ACTION="${1:-sync}"
PRIMARY_BUCKET="${S3_PRIMARY_BUCKET:-dese-backups-eu-west-1}"
REPLICA_BUCKET="${S3_REPLICA_BUCKET:-dese-backups-us-east-1}"
PRIMARY_REGION="${S3_PRIMARY_REGION:-eu-west-1}"
REPLICA_REGION="${S3_REPLICA_REGION:-us-east-1}"

# MinIO configuration (for local/hybrid setup)
MINIO_PRIMARY="${MINIO_PRIMARY_ENDPOINT:-}"
MINIO_REPLICA="${MINIO_REPLICA_ENDPOINT:-}"

# Logging
LOG_FILE="${LOG_DIR:-/var/log/backup}/s3-replication.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Setup AWS S3 Cross-Region Replication
setup_aws_replication() {
    log "INFO" "Setting up AWS S3 Cross-Region Replication..."
    
    # Enable versioning on both buckets (required for CRR)
    log "INFO" "Enabling versioning on primary bucket..."
    aws s3api put-bucket-versioning \
        --bucket "$PRIMARY_BUCKET" \
        --versioning-configuration Status=Enabled \
        --region "$PRIMARY_REGION"
    
    log "INFO" "Enabling versioning on replica bucket..."
    aws s3api put-bucket-versioning \
        --bucket "$REPLICA_BUCKET" \
        --versioning-configuration Status=Enabled \
        --region "$REPLICA_REGION"
    
    # Create IAM role for replication
    local role_name="dese-s3-replication-role"
    local trust_policy='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "s3.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'
    
    # Check if role exists
    if ! aws iam get-role --role-name "$role_name" 2>/dev/null; then
        log "INFO" "Creating IAM replication role..."
        aws iam create-role \
            --role-name "$role_name" \
            --assume-role-policy-document "$trust_policy"
    fi
    
    # Attach replication policy
    local replication_policy="{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
            {
                \"Effect\": \"Allow\",
                \"Action\": [
                    \"s3:GetReplicationConfiguration\",
                    \"s3:ListBucket\"
                ],
                \"Resource\": \"arn:aws:s3:::${PRIMARY_BUCKET}\"
            },
            {
                \"Effect\": \"Allow\",
                \"Action\": [
                    \"s3:GetObjectVersionForReplication\",
                    \"s3:GetObjectVersionAcl\",
                    \"s3:GetObjectVersionTagging\"
                ],
                \"Resource\": \"arn:aws:s3:::${PRIMARY_BUCKET}/*\"
            },
            {
                \"Effect\": \"Allow\",
                \"Action\": [
                    \"s3:ReplicateObject\",
                    \"s3:ReplicateDelete\",
                    \"s3:ReplicateTags\"
                ],
                \"Resource\": \"arn:aws:s3:::${REPLICA_BUCKET}/*\"
            }
        ]
    }"
    
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "s3-replication-policy" \
        --policy-document "$replication_policy"
    
    # Get role ARN
    local role_arn=$(aws iam get-role --role-name "$role_name" --query 'Role.Arn' --output text)
    
    # Configure replication rule
    local replication_config="{
        \"Role\": \"${role_arn}\",
        \"Rules\": [
            {
                \"ID\": \"dese-backup-replication\",
                \"Status\": \"Enabled\",
                \"Priority\": 1,
                \"DeleteMarkerReplication\": { \"Status\": \"Enabled\" },
                \"Filter\": {},
                \"Destination\": {
                    \"Bucket\": \"arn:aws:s3:::${REPLICA_BUCKET}\",
                    \"StorageClass\": \"STANDARD_IA\",
                    \"ReplicationTime\": {
                        \"Status\": \"Enabled\",
                        \"Time\": { \"Minutes\": 15 }
                    },
                    \"Metrics\": {
                        \"Status\": \"Enabled\",
                        \"EventThreshold\": { \"Minutes\": 15 }
                    }
                }
            }
        ]
    }"
    
    log "INFO" "Configuring replication rules..."
    aws s3api put-bucket-replication \
        --bucket "$PRIMARY_BUCKET" \
        --replication-configuration "$replication_config" \
        --region "$PRIMARY_REGION"
    
    log "INFO" "AWS S3 CRR setup completed!"
}

# Manual sync for MinIO or when CRR is not available
manual_sync() {
    log "INFO" "Starting manual S3 sync..."
    
    if [[ -n "$MINIO_PRIMARY" && -n "$MINIO_REPLICA" ]]; then
        # MinIO to MinIO sync
        log "INFO" "Syncing MinIO buckets..."
        mc mirror --overwrite --remove \
            "primary/${PRIMARY_BUCKET}" \
            "replica/${REPLICA_BUCKET}" || error_exit "MinIO sync failed"
    elif [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        # AWS S3 to S3 sync
        log "INFO" "Syncing AWS S3 buckets..."
        aws s3 sync \
            "s3://${PRIMARY_BUCKET}" \
            "s3://${REPLICA_BUCKET}" \
            --source-region "$PRIMARY_REGION" \
            --region "$REPLICA_REGION" \
            --storage-class STANDARD_IA || error_exit "S3 sync failed"
    else
        error_exit "No storage configuration found"
    fi
    
    log "INFO" "Manual sync completed"
}

# Verify replication
verify_replication() {
    log "INFO" "Verifying replication..."
    
    # Create test file
    local test_file="/tmp/replication-test-$(date +%s).txt"
    echo "Replication test: $(date)" > "$test_file"
    
    if [[ -n "$MINIO_PRIMARY" ]]; then
        # MinIO verification
        mc cp "$test_file" "primary/${PRIMARY_BUCKET}/replication-test/"
        sleep 10
        
        if mc ls "replica/${REPLICA_BUCKET}/replication-test/" | grep -q "$(basename "$test_file")"; then
            log "INFO" "✅ Replication verification PASSED"
            mc rm "primary/${PRIMARY_BUCKET}/replication-test/$(basename "$test_file")" || true
            mc rm "replica/${REPLICA_BUCKET}/replication-test/$(basename "$test_file")" || true
        else
            log "ERROR" "❌ Replication verification FAILED"
            return 1
        fi
    else
        # AWS verification
        aws s3 cp "$test_file" "s3://${PRIMARY_BUCKET}/replication-test/" --region "$PRIMARY_REGION"
        
        log "INFO" "Waiting for replication (up to 60 seconds)..."
        local max_wait=60
        local waited=0
        
        while [[ $waited -lt $max_wait ]]; do
            if aws s3 ls "s3://${REPLICA_BUCKET}/replication-test/$(basename "$test_file")" --region "$REPLICA_REGION" 2>/dev/null; then
                log "INFO" "✅ Replication verification PASSED (${waited}s)"
                aws s3 rm "s3://${PRIMARY_BUCKET}/replication-test/$(basename "$test_file")" --region "$PRIMARY_REGION" || true
                aws s3 rm "s3://${REPLICA_BUCKET}/replication-test/$(basename "$test_file")" --region "$REPLICA_REGION" || true
                rm -f "$test_file"
                return 0
            fi
            sleep 5
            waited=$((waited + 5))
        done
        
        log "ERROR" "❌ Replication verification FAILED (timeout)"
        rm -f "$test_file"
        return 1
    fi
    
    rm -f "$test_file"
}

# List replication status
show_status() {
    log "INFO" "Replication Status:"
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        log "INFO" "Primary bucket ($PRIMARY_BUCKET) contents:"
        aws s3 ls "s3://${PRIMARY_BUCKET}/" --summarize --region "$PRIMARY_REGION"
        
        log "INFO" "Replica bucket ($REPLICA_BUCKET) contents:"
        aws s3 ls "s3://${REPLICA_BUCKET}/" --summarize --region "$REPLICA_REGION"
        
        # Get replication metrics if available
        log "INFO" "Replication configuration:"
        aws s3api get-bucket-replication --bucket "$PRIMARY_BUCKET" --region "$PRIMARY_REGION" 2>/dev/null || \
            log "WARN" "No replication configuration found"
    fi
}

main() {
    log "INFO" "=========================================="
    log "INFO" "S3 Cross-Region Replication"
    log "INFO" "Action: $ACTION"
    log "INFO" "=========================================="
    
    case "$ACTION" in
        setup)
            setup_aws_replication
            ;;
        sync)
            manual_sync
            ;;
        verify)
            verify_replication
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 [setup|sync|verify|status]"
            exit 1
            ;;
    esac
    
    log "INFO" "=========================================="
    log "INFO" "Operation completed"
    log "INFO" "=========================================="
}

main "$@"

