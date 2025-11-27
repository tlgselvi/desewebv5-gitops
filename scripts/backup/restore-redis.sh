#!/bin/bash
# =============================================================================
# Redis Restore Script
# DESE EA PLAN v7.0 - Disaster Recovery
# =============================================================================
# Usage: ./restore-redis.sh [options]
# Options:
#   --latest              Restore from latest RDB backup
#   --from-aof            Restore from AOF file
#   --backup-id ID        Restore specific backup
#   --verify              Verify after restore
#   --dry-run             Show what would be done
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
S3_BUCKET="${S3_BUCKET:-dese-backups}"
RESTORE_DIR="${RESTORE_DIR:-/tmp/redis_restore_$(date +%s)}"

# Redis connection
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_CLUSTER="${REDIS_CLUSTER:-false}"

# Logging
LOG_FILE="${LOG_DIR:-/var/log/backup}/redis-restore.log"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$RESTORE_DIR"

# Parse arguments
RESTORE_MODE=""
BACKUP_ID=""
VERIFY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --latest)
            RESTORE_MODE="latest"
            shift
            ;;
        --from-aof)
            RESTORE_MODE="aof"
            shift
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
            -d "{\"text\": \"🔴 Redis Restore $status: $message\"}" || true
    fi
}

redis_cli() {
    local host="${1:-$REDIS_HOST}"
    local port="${2:-$REDIS_PORT}"
    shift 2 || true
    
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis-cli -h "$host" -p "$port" -a "$REDIS_PASSWORD" --no-auth-warning "$@"
    else
        redis-cli -h "$host" -p "$port" "$@"
    fi
}

find_latest_backup() {
    local backup_type="${1:-rdb}"
    log "INFO" "Finding latest $backup_type backup..."
    
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
        local latest=$(aws s3 ls "s3://${S3_BUCKET}/redis/${backup_type}/" --recursive | sort | tail -1 | awk '{print $4}')
        if [[ -n "$latest" ]]; then
            echo "$latest"
            return 0
        fi
    fi
    
    local pattern="*.${backup_type}.gz"
    local latest=$(find "$BACKUP_DIR" -name "$pattern" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$latest" ]]; then
        echo "$latest"
        return 0
    fi
    
    error_exit "No $backup_type backup found"
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
    
    if [[ ! -s "$backup_file" ]]; then
        error_exit "Backup file is empty or missing"
    fi
    
    if ! gunzip -t "$backup_file" 2>/dev/null; then
        error_exit "Backup file is corrupted"
    fi
    
    # Verify RDB magic header
    local magic=$(gunzip -c "$backup_file" | head -c 5)
    if [[ "$magic" != "REDIS" ]]; then
        error_exit "Invalid RDB file format"
    fi
    
    log "INFO" "Backup verification passed"
}

stop_redis() {
    log "INFO" "Stopping Redis..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would stop Redis"
        return 0
    fi
    
    # Docker Compose
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose stop redis || true
    fi
    
    # Kubernetes
    if command -v kubectl &>/dev/null; then
        kubectl scale statefulset redis --replicas=0 -n dese-ea-plan 2>/dev/null || true
    fi
    
    # Standalone
    redis_cli "$REDIS_HOST" "$REDIS_PORT" SHUTDOWN NOSAVE 2>/dev/null || true
    
    sleep 3
    log "INFO" "Redis stopped"
}

restore_rdb() {
    local backup_file="$1"
    
    log "INFO" "Restoring from RDB backup..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would restore from: $backup_file"
        return 0
    fi
    
    # Get Redis data directory
    local redis_dir="${REDIS_DATA_DIR:-/data}"
    local rdb_filename="${REDIS_RDB_FILENAME:-dump.rdb}"
    
    # Decompress and copy RDB file
    gunzip -c "$backup_file" > "${RESTORE_DIR}/dump.rdb"
    
    # For Docker deployment
    if [[ -f "docker-compose.yml" ]]; then
        local container_name="${REDIS_CONTAINER:-redis}"
        
        # Copy RDB to volume
        docker cp "${RESTORE_DIR}/dump.rdb" "${container_name}:${redis_dir}/${rdb_filename}" 2>/dev/null || {
            # If container is stopped, copy to volume directly
            log "INFO" "Container stopped, copying to volume..."
            local volume_path=$(docker volume inspect redis_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "/var/lib/docker/volumes/redis_data/_data")
            sudo cp "${RESTORE_DIR}/dump.rdb" "${volume_path}/${rdb_filename}" 2>/dev/null || true
        }
    fi
    
    # For Kubernetes deployment
    if command -v kubectl &>/dev/null; then
        local pod=$(kubectl get pods -n dese-ea-plan -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [[ -n "$pod" ]]; then
            kubectl cp "${RESTORE_DIR}/dump.rdb" "dese-ea-plan/${pod}:${redis_dir}/${rdb_filename}"
        fi
    fi
    
    log "INFO" "RDB restore completed"
}

restore_cluster() {
    local backup_file="$1"
    
    log "INFO" "Restoring Redis Cluster..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would restore cluster from: $backup_file"
        return 0
    fi
    
    # Extract cluster backup
    local cluster_dir="${RESTORE_DIR}/cluster"
    mkdir -p "$cluster_dir"
    tar -xzf "$backup_file" -C "$cluster_dir"
    
    # Restore each node
    for rdb_file in "$cluster_dir"/*.rdb; do
        local node_name=$(basename "$rdb_file" .rdb | cut -d'_' -f1)
        log "INFO" "Restoring node: $node_name"
        
        # Copy RDB to node's data directory
        docker cp "$rdb_file" "${node_name}:/data/dump.rdb" 2>/dev/null || true
    done
    
    log "INFO" "Cluster restore completed"
}

start_redis() {
    log "INFO" "Starting Redis..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would start Redis"
        return 0
    fi
    
    # Docker Compose
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose start redis || docker-compose up -d redis
    fi
    
    # Kubernetes
    if command -v kubectl &>/dev/null; then
        kubectl scale statefulset redis --replicas=1 -n dese-ea-plan 2>/dev/null || true
    fi
    
    # Wait for Redis to be ready
    local max_wait=60
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if redis_cli "$REDIS_HOST" "$REDIS_PORT" PING 2>/dev/null | grep -q "PONG"; then
            log "INFO" "Redis is ready"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done
    
    log "WARN" "Redis did not become ready within ${max_wait}s"
}

verify_restore() {
    log "INFO" "Verifying restore..."
    
    # Check connectivity
    local pong=$(redis_cli "$REDIS_HOST" "$REDIS_PORT" PING 2>/dev/null || echo "")
    if [[ "$pong" != "PONG" ]]; then
        log "ERROR" "Redis connectivity failed"
        return 1
    fi
    
    # Get key count
    local key_count=$(redis_cli "$REDIS_HOST" "$REDIS_PORT" DBSIZE 2>/dev/null | grep -oE '[0-9]+' || echo "0")
    log "INFO" "Redis has $key_count keys"
    
    # Memory info
    local memory=$(redis_cli "$REDIS_HOST" "$REDIS_PORT" INFO memory 2>/dev/null | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
    log "INFO" "Memory usage: $memory"
    
    if [[ $key_count -gt 0 ]]; then
        log "INFO" "✅ Restore verification passed"
    else
        log "WARN" "⚠️ No keys found after restore"
    fi
}

cleanup() {
    log "INFO" "Cleaning up..."
    rm -rf "$RESTORE_DIR"
}

main() {
    log "INFO" "=========================================="
    log "INFO" "Redis Restore Started"
    log "INFO" "Mode: $RESTORE_MODE"
    log "INFO" "Cluster: $REDIS_CLUSTER"
    log "INFO" "Dry Run: $DRY_RUN"
    log "INFO" "=========================================="
    
    trap cleanup EXIT
    
    local backup_path
    
    case "$RESTORE_MODE" in
        latest)
            backup_path=$(find_latest_backup "rdb")
            ;;
        aof)
            backup_path=$(find_latest_backup "aof")
            ;;
        specific)
            backup_path="$BACKUP_ID"
            ;;
        *)
            echo "Usage: $0 [--latest|--from-aof|--backup-id ID] [--verify] [--dry-run]"
            exit 1
            ;;
    esac
    
    local local_file=$(download_backup "$backup_path")
    verify_backup "$local_file"
    stop_redis
    
    if [[ "$REDIS_CLUSTER" == "true" && "$backup_path" == *"cluster"* ]]; then
        restore_cluster "$local_file"
    else
        restore_rdb "$local_file"
    fi
    
    start_redis
    
    if [[ "$VERIFY" == "true" ]]; then
        verify_restore
    fi
    
    send_notification "SUCCESS" "Redis restored successfully"
    
    log "INFO" "=========================================="
    log "INFO" "Redis Restore Completed"
    log "INFO" "=========================================="
}

main "$@"

