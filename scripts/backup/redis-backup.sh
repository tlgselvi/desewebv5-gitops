#!/bin/bash
# Redis Backup Script
# DESE EA PLAN v7.0

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
S3_BUCKET="${S3_BUCKET:-s3://dese-backups/redis}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
DATE=$(date +%Y%m%d_%H%M%S)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

mkdir -p "$BACKUP_DIR"

# Build redis-cli command
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CLI="$REDIS_CLI -a $REDIS_PASSWORD"
fi

# Trigger BGSAVE
log "Triggering BGSAVE..."
$REDIS_CLI BGSAVE

# Wait for BGSAVE to complete
log "Waiting for BGSAVE to complete..."
while [ "$($REDIS_CLI LASTSAVE)" == "$($REDIS_CLI LASTSAVE)" ]; do
    sleep 1
done

# Copy RDB file
log "Copying RDB file..."
REDIS_DATA_DIR=$($REDIS_CLI CONFIG GET dir | tail -1)
RDB_FILE=$($REDIS_CLI CONFIG GET dbfilename | tail -1)

cp "$REDIS_DATA_DIR/$RDB_FILE" "$BACKUP_DIR/dump_$DATE.rdb"

# Compress
log "Compressing backup..."
gzip "$BACKUP_DIR/dump_$DATE.rdb"

# Upload to S3
if command -v aws &> /dev/null; then
    log "Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/dump_$DATE.rdb.gz" "$S3_BUCKET/dump_$DATE.rdb.gz"
fi

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -type f -mtime +7 -delete

log "Redis backup completed: $BACKUP_DIR/dump_$DATE.rdb.gz"
