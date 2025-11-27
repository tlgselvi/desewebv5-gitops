#!/bin/bash
# PostgreSQL Automated Backup Script
# DESE EA PLAN v7.0
#
# Usage: ./pg-backup.sh [full|incremental|wal]
# Cron: 0 2 * * * /path/to/pg-backup.sh full

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-full}"
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
S3_BUCKET="${S3_BUCKET:-s3://dese-backups/postgresql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/pg-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}✓ $1${NC}"
}

log_error() {
    log "${RED}✗ $1${NC}"
}

log_info() {
    log "${YELLOW}ℹ $1${NC}"
}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Function: Full backup using pg_basebackup
full_backup() {
    log_info "Starting full backup..."
    
    BACKUP_FILE="$BACKUP_DIR/base_$DATE.tar.gz"
    
    pg_basebackup \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -D "$BACKUP_DIR/temp_$DATE" \
        -Ft \
        -z \
        -P \
        --checkpoint=fast \
        --wal-method=fetch
    
    # Compress
    tar -czf "$BACKUP_FILE" -C "$BACKUP_DIR" "temp_$DATE"
    rm -rf "$BACKUP_DIR/temp_$DATE"
    
    # Upload to S3
    if command -v aws &> /dev/null; then
        log_info "Uploading to S3..."
        aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/full/base_$DATE.tar.gz"
        log_success "Uploaded to S3: $S3_BUCKET/full/base_$DATE.tar.gz"
    fi
    
    # Record backup metadata
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Full backup completed: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Prometheus metrics
    echo "backup_last_success_timestamp $(date +%s)" > /tmp/backup_metrics.prom
    echo "backup_last_size_bytes $(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")" >> /tmp/backup_metrics.prom
    echo "backup_last_status 1" >> /tmp/backup_metrics.prom
}

# Function: Incremental backup using pg_dump
incremental_backup() {
    log_info "Starting incremental backup..."
    
    BACKUP_FILE="$BACKUP_DIR/incremental_$DATE.sql.gz"
    
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        --format=custom \
        --compress=9 \
        --file="$BACKUP_FILE" \
        dese_ea_plan_v5
    
    # Upload to S3
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/incremental/dump_$DATE.sql.gz"
    fi
    
    log_success "Incremental backup completed: $BACKUP_FILE"
}

# Function: WAL archive
wal_backup() {
    log_info "Archiving WAL files..."
    
    WAL_DIR="/var/lib/postgresql/data/pg_wal"
    
    if [ -d "$WAL_DIR" ]; then
        for wal_file in "$WAL_DIR"/*; do
            if [ -f "$wal_file" ]; then
                filename=$(basename "$wal_file")
                if command -v aws &> /dev/null; then
                    aws s3 cp "$wal_file" "$S3_BUCKET/wal/$filename"
                fi
            fi
        done
        log_success "WAL files archived"
    else
        log_error "WAL directory not found: $WAL_DIR"
    fi
}

# Function: Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete
    
    # S3 cleanup
    if command -v aws &> /dev/null; then
        aws s3 ls "$S3_BUCKET/full/" | while read -r line; do
            createDate=$(echo "$line" | awk '{print $1}')
            createDateSec=$(date -d "$createDate" +%s 2>/dev/null || echo 0)
            olderThanSec=$(date -d "$RETENTION_DAYS days ago" +%s)
            
            if [ "$createDateSec" -lt "$olderThanSec" ] && [ "$createDateSec" -ne 0 ]; then
                fileName=$(echo "$line" | awk '{print $4}')
                aws s3 rm "$S3_BUCKET/full/$fileName"
                log_info "Deleted old backup: $fileName"
            fi
        done
    fi
    
    log_success "Cleanup completed"
}

# Function: Verify backup
verify_backup() {
    log_info "Verifying latest backup..."
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup files found"
        return 1
    fi
    
    # Test archive integrity
    if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
        log_success "Backup archive is valid: $LATEST_BACKUP"
        return 0
    else
        log_error "Backup archive is corrupted: $LATEST_BACKUP"
        return 1
    fi
}

# Function: Send notification
send_notification() {
    STATUS=$1
    MESSAGE=$2
    
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"[$STATUS] PostgreSQL Backup: $MESSAGE\"}"
    fi
}

# Main execution
main() {
    log "=========================================="
    log "PostgreSQL Backup - Type: $BACKUP_TYPE"
    log "=========================================="
    
    case $BACKUP_TYPE in
        full)
            if full_backup; then
                cleanup_old_backups
                verify_backup
                send_notification "SUCCESS" "Full backup completed successfully"
            else
                send_notification "FAILURE" "Full backup failed"
                exit 1
            fi
            ;;
        incremental)
            if incremental_backup; then
                send_notification "SUCCESS" "Incremental backup completed"
            else
                send_notification "FAILURE" "Incremental backup failed"
                exit 1
            fi
            ;;
        wal)
            wal_backup
            ;;
        verify)
            verify_backup
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 [full|incremental|wal|verify|cleanup]"
            exit 1
            ;;
    esac
    
    log "=========================================="
    log "Backup process completed"
    log "=========================================="
}

main "$@"

