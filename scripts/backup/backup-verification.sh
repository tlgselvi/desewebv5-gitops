#!/bin/bash
# =============================================================================
# Backup Verification Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./backup-verification.sh [postgresql|redis|all]
# Verifies backup integrity and performs test restore
# =============================================================================

set -euo pipefail

# Configuration
VERIFY_TYPE="${1:-all}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups}"
S3_BUCKET="${S3_BUCKET:-dese-backups}"
VERIFY_DB_NAME="backup_verify_$(date +%s)"
REPORT_FILE="${REPORT_DIR:-/var/log/backup}/verification-report-$(date +%Y%m%d).md"

# Logging
LOG_FILE="${LOG_DIR:-/var/log/backup}/backup-verification.log"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$REPORT_FILE")"

log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    send_alert "VERIFICATION FAILED" "$1"
    exit 1
}

send_alert() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🔍 Backup Verification $status: $message\"}" || true
    fi
}

init_report() {
    cat > "$REPORT_FILE" << EOF
# Backup Verification Report
**Date:** $(date '+%Y-%m-%d %H:%M:%S')  
**Environment:** ${ENVIRONMENT:-production}  
**Verification Type:** $VERIFY_TYPE

---

## Summary

| Component | Status | Details |
|-----------|--------|---------|
EOF
}

add_to_report() {
    local component="$1"
    local status="$2"
    local details="$3"
    
    echo "| $component | $status | $details |" >> "$REPORT_FILE"
}

# Verify PostgreSQL backup
verify_postgresql_backup() {
    log "INFO" "Verifying PostgreSQL backup..."
    
    # Find latest backup
    local latest_backup=""
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/postgresql/daily/" --recursive | sort | tail -1 | awk '{print $4}')
        if [[ -n "$latest_backup" ]]; then
            local local_backup="/tmp/pg_verify_$(date +%s).sql.gz"
            aws s3 cp "s3://${S3_BUCKET}/${latest_backup}" "$local_backup"
        fi
    else
        latest_backup=$(find "${BACKUP_DIR}/postgresql" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
        local_backup="$latest_backup"
    fi
    
    if [[ -z "$latest_backup" || ! -f "${local_backup:-}" ]]; then
        log "ERROR" "No PostgreSQL backup found"
        add_to_report "PostgreSQL" "❌ FAILED" "No backup found"
        return 1
    fi
    
    log "INFO" "Found backup: $latest_backup"
    
    # Verify checksum if available
    local checksum_file="${local_backup%.sql.gz}.sha256"
    if [[ -f "$checksum_file" ]]; then
        log "INFO" "Verifying checksum..."
        if sha256sum -c "$checksum_file" 2>/dev/null; then
            log "INFO" "Checksum verification passed"
        else
            log "WARN" "Checksum verification failed"
        fi
    fi
    
    # Test decompression
    log "INFO" "Testing decompression..."
    if ! gunzip -t "$local_backup" 2>/dev/null; then
        log "ERROR" "Backup file is corrupted"
        add_to_report "PostgreSQL" "❌ FAILED" "Corrupted backup file"
        return 1
    fi
    
    # Perform test restore (optional, requires dedicated test database)
    if [[ "${PERFORM_TEST_RESTORE:-false}" == "true" ]]; then
        log "INFO" "Performing test restore..."
        
        # Create test database
        PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-dese}" -d postgres -c "CREATE DATABASE $VERIFY_DB_NAME;" || {
            log "WARN" "Could not create test database"
            add_to_report "PostgreSQL" "⚠️ PARTIAL" "Integrity OK, restore not tested"
            return 0
        }
        
        # Restore backup
        if gunzip -c "$local_backup" | PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-dese}" -d "$VERIFY_DB_NAME" 2>/dev/null; then
            log "INFO" "Test restore successful"
            
            # Verify data integrity
            local table_count=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-dese}" -d "$VERIFY_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
            log "INFO" "Restored $table_count tables"
            
            # Cleanup
            PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-dese}" -d postgres -c "DROP DATABASE $VERIFY_DB_NAME;"
            
            add_to_report "PostgreSQL" "✅ PASSED" "Full restore verified, $table_count tables"
        else
            log "ERROR" "Test restore failed"
            PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-dese}" -d postgres -c "DROP DATABASE IF EXISTS $VERIFY_DB_NAME;" 2>/dev/null || true
            add_to_report "PostgreSQL" "❌ FAILED" "Restore failed"
            return 1
        fi
    else
        log "INFO" "Skipping test restore (PERFORM_TEST_RESTORE not set)"
        
        # Basic content verification
        local sql_content=$(gunzip -c "$local_backup" 2>/dev/null | head -100)
        if echo "$sql_content" | grep -q "PostgreSQL database dump"; then
            log "INFO" "Backup content verified"
            local backup_size=$(ls -lh "$local_backup" | awk '{print $5}')
            add_to_report "PostgreSQL" "✅ PASSED" "Integrity OK, size: $backup_size"
        else
            log "WARN" "Unexpected backup content"
            add_to_report "PostgreSQL" "⚠️ PARTIAL" "Content check inconclusive"
        fi
    fi
    
    # Cleanup temp file
    [[ "$local_backup" == /tmp/* ]] && rm -f "$local_backup"
    
    return 0
}

# Verify Redis backup
verify_redis_backup() {
    log "INFO" "Verifying Redis backup..."
    
    # Find latest RDB backup
    local latest_backup=""
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        latest_backup=$(aws s3 ls "s3://${S3_BUCKET}/redis/rdb/" --recursive | sort | tail -1 | awk '{print $4}')
        if [[ -n "$latest_backup" ]]; then
            local local_backup="/tmp/redis_verify_$(date +%s).rdb.gz"
            aws s3 cp "s3://${S3_BUCKET}/${latest_backup}" "$local_backup"
        fi
    else
        latest_backup=$(find "${BACKUP_DIR}/redis" -name "*.rdb.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
        local_backup="$latest_backup"
    fi
    
    if [[ -z "$latest_backup" || ! -f "${local_backup:-}" ]]; then
        log "WARN" "No Redis RDB backup found"
        add_to_report "Redis RDB" "⚠️ NOT FOUND" "No backup available"
        return 0
    fi
    
    log "INFO" "Found backup: $latest_backup"
    
    # Test decompression
    log "INFO" "Testing decompression..."
    if ! gunzip -t "$local_backup" 2>/dev/null; then
        log "ERROR" "Backup file is corrupted"
        add_to_report "Redis RDB" "❌ FAILED" "Corrupted backup file"
        return 1
    fi
    
    # Verify RDB format
    log "INFO" "Verifying RDB format..."
    local rdb_magic=$(gunzip -c "$local_backup" | head -c 9 | cat -v)
    if [[ "$rdb_magic" == "REDIS"* ]]; then
        log "INFO" "RDB format verified"
        local backup_size=$(ls -lh "$local_backup" | awk '{print $5}')
        add_to_report "Redis RDB" "✅ PASSED" "Format OK, size: $backup_size"
    else
        log "ERROR" "Invalid RDB format"
        add_to_report "Redis RDB" "❌ FAILED" "Invalid format"
        return 1
    fi
    
    # Optional: Test restore to temporary Redis instance
    if [[ "${PERFORM_REDIS_RESTORE:-false}" == "true" ]]; then
        log "INFO" "Testing Redis restore..."
        
        local temp_dir="/tmp/redis_verify_$(date +%s)"
        mkdir -p "$temp_dir"
        gunzip -c "$local_backup" > "$temp_dir/dump.rdb"
        
        # Start temporary Redis instance
        redis-server --dir "$temp_dir" --dbfilename dump.rdb --port 6399 --daemonize yes
        sleep 3
        
        # Check if data loaded
        local key_count=$(redis-cli -p 6399 DBSIZE | grep -oE '[0-9]+')
        log "INFO" "Restored Redis has $key_count keys"
        
        # Shutdown test instance
        redis-cli -p 6399 SHUTDOWN NOSAVE || true
        rm -rf "$temp_dir"
        
        add_to_report "Redis RDB" "✅ PASSED" "Restore verified, $key_count keys"
    fi
    
    # Cleanup temp file
    [[ "$local_backup" == /tmp/* ]] && rm -f "$local_backup"
    
    return 0
}

# Verify S3 replication
verify_s3_replication() {
    log "INFO" "Verifying S3 replication..."
    
    if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
        log "WARN" "AWS not configured, skipping S3 replication check"
        add_to_report "S3 Replication" "⚠️ SKIPPED" "AWS not configured"
        return 0
    fi
    
    local primary_count=$(aws s3 ls "s3://${S3_BUCKET}/" --recursive | wc -l)
    local replica_bucket="${S3_REPLICA_BUCKET:-dese-backups-replica}"
    local replica_count=$(aws s3 ls "s3://${replica_bucket}/" --recursive 2>/dev/null | wc -l || echo "0")
    
    log "INFO" "Primary bucket: $primary_count objects"
    log "INFO" "Replica bucket: $replica_count objects"
    
    if [[ "$replica_count" -gt 0 && "$replica_count" -ge $((primary_count * 90 / 100)) ]]; then
        add_to_report "S3 Replication" "✅ PASSED" "Primary: $primary_count, Replica: $replica_count"
    elif [[ "$replica_count" -eq 0 ]]; then
        add_to_report "S3 Replication" "⚠️ NOT CONFIGURED" "Replica bucket empty or missing"
    else
        add_to_report "S3 Replication" "⚠️ PARTIAL" "Replication lag detected"
    fi
}

# Check backup age
check_backup_age() {
    log "INFO" "Checking backup freshness..."
    
    local max_age_hours="${MAX_BACKUP_AGE_HOURS:-24}"
    local max_age_seconds=$((max_age_hours * 3600))
    local current_time=$(date +%s)
    
    # Check PostgreSQL backup age
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        local pg_last=$(aws s3 ls "s3://${S3_BUCKET}/postgresql/daily/" --recursive | sort | tail -1 | awk '{print $1" "$2}')
        if [[ -n "$pg_last" ]]; then
            local pg_timestamp=$(date -d "$pg_last" +%s 2>/dev/null || echo "0")
            local pg_age=$((current_time - pg_timestamp))
            
            if [[ $pg_age -lt $max_age_seconds ]]; then
                add_to_report "PostgreSQL Age" "✅ FRESH" "Last backup: $(echo $((pg_age / 3600)))h ago"
            else
                add_to_report "PostgreSQL Age" "⚠️ STALE" "Last backup: $(echo $((pg_age / 3600)))h ago"
            fi
        fi
    fi
}

finalize_report() {
    cat >> "$REPORT_FILE" << EOF

---

## Recommendations

EOF

    # Add recommendations based on results
    if grep -q "FAILED" "$REPORT_FILE"; then
        echo "- 🚨 **Critical:** One or more backup verifications failed. Investigate immediately." >> "$REPORT_FILE"
    fi
    
    if grep -q "STALE" "$REPORT_FILE"; then
        echo "- ⚠️ **Warning:** Some backups are older than expected. Check backup schedules." >> "$REPORT_FILE"
    fi
    
    if grep -q "NOT FOUND\|NOT CONFIGURED" "$REPORT_FILE"; then
        echo "- ℹ️ **Info:** Some backup components are not configured. Review DR requirements." >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

---

## Verification Details

For detailed logs, see: \`$LOG_FILE\`

**Verified by:** Automated Backup Verification System  
**RTO Target:** < 4 hours  
**RPO Target:** < 1 hour
EOF

    log "INFO" "Report generated: $REPORT_FILE"
}

main() {
    log "INFO" "=========================================="
    log "INFO" "Backup Verification Started"
    log "INFO" "Type: $VERIFY_TYPE"
    log "INFO" "=========================================="
    
    init_report
    
    case "$VERIFY_TYPE" in
        postgresql)
            verify_postgresql_backup
            ;;
        redis)
            verify_redis_backup
            ;;
        s3)
            verify_s3_replication
            ;;
        all)
            verify_postgresql_backup
            verify_redis_backup
            verify_s3_replication
            check_backup_age
            ;;
        *)
            error_exit "Invalid verification type: $VERIFY_TYPE"
            ;;
    esac
    
    finalize_report
    
    # Send summary
    if grep -q "FAILED" "$REPORT_FILE"; then
        send_alert "COMPLETED WITH FAILURES" "Check report: $REPORT_FILE"
    else
        send_alert "COMPLETED SUCCESSFULLY" "All verifications passed"
    fi
    
    log "INFO" "=========================================="
    log "INFO" "Backup Verification Completed"
    log "INFO" "=========================================="
    
    # Print report
    cat "$REPORT_FILE"
}

main "$@"

