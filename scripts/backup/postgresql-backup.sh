#!/bin/bash
# =============================================================================
# PostgreSQL Automated Backup Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./postgresql-backup.sh [daily|weekly|manual]
# Requirements: pg_dump, AWS CLI or MinIO mc client
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-dese-backups}"
S3_REGION="${S3_REGION:-eu-west-1}"
RETENTION_DAYS_DAILY=7
RETENTION_DAYS_WEEKLY=30
RETENTION_DAYS_MONTHLY=365

# Database connection
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-dese_ea_plan_v5}"
DB_USER="${POSTGRES_USER:-dese}"

# Logging
LOG_FILE="${LOG_DIR:-/var/log/backup}/postgresql-backup.log"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    send_alert "FAILED" "$1"
    exit 1
}

send_alert() {
    local status="$1"
    local message="$2"
    
    # Slack notification (if configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🗄️ PostgreSQL Backup $status: $message\"}" || true
    fi
    
    # PagerDuty (for critical failures)
    if [[ "$status" == "FAILED" && -n "${PAGERDUTY_ROUTING_KEY:-}" ]]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"PostgreSQL Backup Failed: $message\",
                    \"severity\": \"critical\",
                    \"source\": \"backup-system\"
                }
            }" || true
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    command -v pg_dump >/dev/null 2>&1 || error_exit "pg_dump not found"
    command -v gzip >/dev/null 2>&1 || error_exit "gzip not found"
    
    # Check S3/MinIO connectivity
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        command -v aws >/dev/null 2>&1 || error_exit "AWS CLI not found"
    elif [[ -n "${MINIO_ENDPOINT:-}" ]]; then
        command -v mc >/dev/null 2>&1 || error_exit "MinIO client not found"
    fi
    
    # Test database connectivity
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" || \
        error_exit "Cannot connect to PostgreSQL"
    
    log "INFO" "Prerequisites check passed"
}

# Perform backup
perform_backup() {
    local backup_name="postgresql_${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}"
    local backup_file="${BACKUP_DIR}/${backup_name}.sql.gz"
    local checksum_file="${BACKUP_DIR}/${backup_name}.sha256"
    
    log "INFO" "Starting $BACKUP_TYPE backup: $backup_name"
    
    # Calculate database size before backup
    local db_size=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
    log "INFO" "Database size: $db_size"
    
    # Perform backup with pg_dump
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        2>> "$LOG_FILE" | gzip > "$backup_file" || error_exit "pg_dump failed"
    
    # Generate checksum
    sha256sum "$backup_file" > "$checksum_file"
    
    # Get backup size
    local backup_size=$(ls -lh "$backup_file" | awk '{print $5}')
    log "INFO" "Backup completed: $backup_file ($backup_size)"
    
    # Upload to S3/MinIO
    upload_to_storage "$backup_file" "$checksum_file"
    
    # Cleanup old local backups
    cleanup_local_backups
    
    # Send success notification
    send_alert "SUCCESS" "Database: $DB_NAME, Size: $backup_size, Type: $BACKUP_TYPE"
    
    echo "$backup_file"
}

upload_to_storage() {
    local backup_file="$1"
    local checksum_file="$2"
    local s3_path="s3://${S3_BUCKET}/postgresql/${BACKUP_TYPE}/$(basename "$backup_file")"
    
    log "INFO" "Uploading to remote storage..."
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        # AWS S3
        aws s3 cp "$backup_file" "$s3_path" --storage-class STANDARD_IA || \
            error_exit "S3 upload failed"
        aws s3 cp "$checksum_file" "${s3_path%.sql.gz}.sha256" || true
    elif [[ -n "${MINIO_ENDPOINT:-}" ]]; then
        # MinIO
        mc cp "$backup_file" "minio/${S3_BUCKET}/postgresql/${BACKUP_TYPE}/" || \
            error_exit "MinIO upload failed"
        mc cp "$checksum_file" "minio/${S3_BUCKET}/postgresql/${BACKUP_TYPE}/" || true
    else
        log "WARN" "No remote storage configured, skipping upload"
    fi
    
    log "INFO" "Upload completed"
}

cleanup_local_backups() {
    log "INFO" "Cleaning up old local backups..."
    
    case "$BACKUP_TYPE" in
        daily)
            find "$BACKUP_DIR" -name "*_daily_*.sql.gz" -mtime +$RETENTION_DAYS_DAILY -delete
            ;;
        weekly)
            find "$BACKUP_DIR" -name "*_weekly_*.sql.gz" -mtime +$RETENTION_DAYS_WEEKLY -delete
            ;;
        monthly)
            find "$BACKUP_DIR" -name "*_monthly_*.sql.gz" -mtime +$RETENTION_DAYS_MONTHLY -delete
            ;;
    esac
    
    log "INFO" "Cleanup completed"
}

# WAL archiving (for Point-in-Time Recovery)
setup_wal_archiving() {
    log "INFO" "WAL archiving is configured at PostgreSQL level"
    log "INFO" "Archive command: archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'"
}

# Main execution
main() {
    log "INFO" "=========================================="
    log "INFO" "PostgreSQL Backup Started"
    log "INFO" "Type: $BACKUP_TYPE"
    log "INFO" "Database: $DB_NAME"
    log "INFO" "=========================================="
    
    check_prerequisites
    perform_backup
    
    log "INFO" "=========================================="
    log "INFO" "PostgreSQL Backup Completed Successfully"
    log "INFO" "=========================================="
}

main "$@"

