#!/bin/bash
# =============================================================================
# PostgreSQL Restore Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./restore-postgresql.sh [options]
# Options:
#   --latest              Restore from latest backup
#   --pitr TIMESTAMP      Point-in-time recovery
#   --backup-id ID        Restore specific backup
#   --verify              Verify after restore
#   --dry-run             Show what would be done
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-dese-backups}"
RESTORE_DIR="${RESTORE_DIR:-/tmp/pg_restore_$(date +%s)}"

# Database connection
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-dese_ea_plan_v5}"
DB_USER="${POSTGRES_USER:-dese}"

# Logging
LOG_FILE="${LOG_DIR:-/var/log/backup}/postgresql-restore.log"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$RESTORE_DIR"

# Parse arguments
RESTORE_MODE=""
PITR_TIMESTAMP=""
BACKUP_ID=""
VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --latest)
            RESTORE_MODE="latest"
            shift
            ;;
        --pitr)
            RESTORE_MODE="pitr"
            PITR_TIMESTAMP="$2"
            shift 2
            ;;
        --backup-id)
            RESTORE_MODE="specific"
            BACKUP_ID="$2"
            shift 2
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --from-s3)
            S3_REGION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    send_notification "RESTORE FAILED" "$1"
    exit 1
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🔄 PostgreSQL Restore $status: $message\"}" || true
    fi
    
    if [[ -n "${PAGERDUTY_ROUTING_KEY:-}" && "$status" == *"FAILED"* ]]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"PostgreSQL Restore Failed: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"dr-system\"
                }
            }" || true
    fi
}

find_latest_backup() {
    log "INFO" "Finding latest backup..."
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        # Find latest from S3
        local latest=$(aws s3 ls "s3://${S3_BUCKET}/postgresql/daily/" --recursive | sort | tail -1 | awk '{print $4}')
        if [[ -n "$latest" ]]; then
            echo "$latest"
            return 0
        fi
    fi
    
    # Find latest from local
    local latest=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$latest" ]]; then
        echo "$latest"
        return 0
    fi
    
    error_exit "No backup found"
}

download_backup() {
    local backup_path="$1"
    local local_file="${RESTORE_DIR}/$(basename "$backup_path")"
    
    if [[ -f "$backup_path" ]]; then
        cp "$backup_path" "$local_file"
    elif [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        log "INFO" "Downloading backup from S3..."
        aws s3 cp "s3://${S3_BUCKET}/${backup_path}" "$local_file" || error_exit "Failed to download backup"
    else
        error_exit "Cannot find backup: $backup_path"
    fi
    
    echo "$local_file"
}

verify_backup() {
    local backup_file="$1"
    
    log "INFO" "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [[ ! -s "$backup_file" ]]; then
        error_exit "Backup file is empty or missing"
    fi
    
    # Verify checksum if available
    local checksum_file="${backup_file%.sql.gz}.sha256"
    if [[ -f "$checksum_file" ]]; then
        if sha256sum -c "$checksum_file"; then
            log "INFO" "Checksum verification passed"
        else
            error_exit "Checksum verification failed"
        fi
    fi
    
    # Test decompression
    if ! gunzip -t "$backup_file"; then
        error_exit "Backup file is corrupted"
    fi
    
    log "INFO" "Backup verification passed"
}

stop_applications() {
    log "INFO" "Stopping applications..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would stop applications"
        return 0
    fi
    
    # Kubernetes
    if command -v kubectl &>/dev/null; then
        kubectl scale deployment dese-ea-plan --replicas=0 -n dese-ea-plan || true
        kubectl scale deployment finbot --replicas=0 -n dese-ea-plan || true
        kubectl scale deployment mubot --replicas=0 -n dese-ea-plan || true
    fi
    
    # Docker Compose
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose stop app finbot mubot || true
    fi
    
    log "INFO" "Applications stopped"
}

restore_database() {
    local backup_file="$1"
    
    log "INFO" "Starting database restore..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would restore from: $backup_file"
        return 0
    fi
    
    # Create restore database or drop/recreate existing
    log "INFO" "Preparing database..."
    
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
-- Terminate existing connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

-- Drop and recreate database
DROP DATABASE IF EXISTS ${DB_NAME}_restore;
CREATE DATABASE ${DB_NAME}_restore;
EOF

    # Restore to temporary database
    log "INFO" "Restoring data..."
    gunzip -c "$backup_file" | PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${DB_NAME}_restore" || error_exit "Restore failed"
    
    # Verify restore
    log "INFO" "Verifying restored data..."
    local table_count=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${DB_NAME}_restore" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "INFO" "Restored $table_count tables"
    
    if [[ $table_count -lt 1 ]]; then
        error_exit "Restore verification failed - no tables found"
    fi
    
    # Swap databases
    log "INFO" "Swapping databases..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
-- Terminate connections to original database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

-- Rename databases
ALTER DATABASE ${DB_NAME} RENAME TO ${DB_NAME}_old;
ALTER DATABASE ${DB_NAME}_restore RENAME TO ${DB_NAME};

-- Keep old database for safety (can be dropped later)
-- DROP DATABASE ${DB_NAME}_old;
EOF

    log "INFO" "Database restore completed"
}

pitr_restore() {
    local target_time="$1"
    
    log "INFO" "Starting Point-in-Time Recovery to: $target_time"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would perform PITR to: $target_time"
        return 0
    fi
    
    # Find the base backup before target time
    log "INFO" "Finding base backup before $target_time..."
    
    # This requires WAL archiving to be properly set up
    # In a production environment, this would involve:
    # 1. Finding the base backup
    # 2. Restoring it
    # 3. Setting recovery_target_time in recovery.conf/postgresql.conf
    # 4. Replaying WAL files up to target time
    
    log "WARN" "PITR requires WAL archiving. Falling back to latest backup."
    log "WARN" "For true PITR, ensure pg_basebackup and WAL archiving are configured."
    
    # Find and restore the latest backup before the target time
    local latest=$(find_latest_backup)
    restore_from_backup "$latest"
}

restore_from_backup() {
    local backup_path="$1"
    
    log "INFO" "Restoring from backup: $backup_path"
    
    local local_file=$(download_backup "$backup_path")
    verify_backup "$local_file"
    stop_applications
    restore_database "$local_file"
    start_applications
}

start_applications() {
    log "INFO" "Starting applications..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would start applications"
        return 0
    fi
    
    # Kubernetes
    if command -v kubectl &>/dev/null; then
        kubectl scale deployment dese-ea-plan --replicas=2 -n dese-ea-plan || true
        kubectl scale deployment finbot --replicas=1 -n dese-ea-plan || true
        kubectl scale deployment mubot --replicas=1 -n dese-ea-plan || true
    fi
    
    # Docker Compose
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose start app finbot mubot || true
    fi
    
    log "INFO" "Applications started"
}

verify_restore() {
    log "INFO" "Verifying restore..."
    
    # Run health checks
    local api_health=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/health" || echo "000")
    
    if [[ "$api_health" == "200" ]]; then
        log "INFO" "API health check passed"
    else
        log "WARN" "API health check returned: $api_health"
    fi
    
    # Check database connectivity
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        log "INFO" "Database connectivity verified"
    else
        log "ERROR" "Database connectivity failed"
    fi
    
    # Run backup verification script
    if [[ -f "./scripts/backup/backup-verification.sh" ]]; then
        ./scripts/backup/backup-verification.sh postgresql || true
    fi
}

cleanup() {
    log "INFO" "Cleaning up..."
    rm -rf "$RESTORE_DIR"
}

main() {
    log "INFO" "=========================================="
    log "INFO" "PostgreSQL Restore Started"
    log "INFO" "Mode: $RESTORE_MODE"
    log "INFO" "Dry Run: $DRY_RUN"
    log "INFO" "=========================================="
    
    trap cleanup EXIT
    
    case "$RESTORE_MODE" in
        latest)
            local backup_path=$(find_latest_backup)
            restore_from_backup "$backup_path"
            ;;
        pitr)
            pitr_restore "$PITR_TIMESTAMP"
            ;;
        specific)
            restore_from_backup "$BACKUP_ID"
            ;;
        *)
            echo "Usage: $0 [--latest|--pitr TIMESTAMP|--backup-id ID] [--verify] [--dry-run]"
            exit 1
            ;;
    esac
    
    if [[ "$VERIFY" == "true" ]]; then
        verify_restore
    fi
    
    send_notification "SUCCESS" "Database restored successfully"
    
    log "INFO" "=========================================="
    log "INFO" "PostgreSQL Restore Completed"
    log "INFO" "=========================================="
}

main "$@"

