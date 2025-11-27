#!/bin/bash
# Database Failover Script
# DESE EA PLAN v7.0
#
# Usage: ./db-failover.sh [check|failover|status]

set -euo pipefail

# Configuration
PRIMARY_HOST="${PRIMARY_HOST:-db-primary}"
REPLICA_HOST="${REPLICA_HOST:-db-replica-1}"
DB_PORT="${DB_PORT:-5432}"
PGBOUNCER_HOST="${PGBOUNCER_HOST:-pgbouncer}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

notify() {
    MESSAGE=$1
    log "$MESSAGE"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🔄 DB Failover: $MESSAGE\"}"
    fi
}

check_primary() {
    log "${YELLOW}Checking primary status...${NC}"
    
    if pg_isready -h "$PRIMARY_HOST" -p "$DB_PORT" -q; then
        log "${GREEN}✓ Primary is healthy${NC}"
        return 0
    else
        log "${RED}✗ Primary is NOT responding${NC}"
        return 1
    fi
}

check_replica() {
    log "${YELLOW}Checking replica status...${NC}"
    
    if pg_isready -h "$REPLICA_HOST" -p "$DB_PORT" -q; then
        log "${GREEN}✓ Replica is healthy${NC}"
        
        # Check replication lag
        LAG=$(psql -h "$REPLICA_HOST" -p "$DB_PORT" -U postgres -t -c \
            "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INT;")
        
        log "Replication lag: ${LAG}s"
        return 0
    else
        log "${RED}✗ Replica is NOT responding${NC}"
        return 1
    fi
}

promote_replica() {
    log "${YELLOW}Promoting replica to primary...${NC}"
    
    # Stop accepting new connections on old primary
    log "Pausing PgBouncer..."
    psql -h "$PGBOUNCER_HOST" -p 6432 -U pgbouncer pgbouncer -c "PAUSE;"
    
    # Promote replica
    log "Executing pg_ctl promote..."
    ssh "$REPLICA_HOST" "pg_ctl promote -D /var/lib/postgresql/data" || \
    psql -h "$REPLICA_HOST" -p "$DB_PORT" -U postgres -c "SELECT pg_promote();"
    
    # Wait for promotion
    sleep 5
    
    # Verify promotion
    IS_REPLICA=$(psql -h "$REPLICA_HOST" -p "$DB_PORT" -U postgres -t -c \
        "SELECT pg_is_in_recovery();")
    
    if [ "$IS_REPLICA" = " f" ]; then
        log "${GREEN}✓ Replica promoted successfully${NC}"
    else
        log "${RED}✗ Promotion failed${NC}"
        return 1
    fi
    
    # Update PgBouncer
    log "Updating PgBouncer configuration..."
    # In production, update pgbouncer.ini or use DNS update
    
    # Resume connections
    log "Resuming PgBouncer..."
    psql -h "$PGBOUNCER_HOST" -p 6432 -U pgbouncer pgbouncer -c "RESUME;"
    
    notify "Failover completed. New primary: $REPLICA_HOST"
}

show_status() {
    echo "=== Database Cluster Status ==="
    echo ""
    
    echo "Primary ($PRIMARY_HOST):"
    if check_primary; then
        psql -h "$PRIMARY_HOST" -p "$DB_PORT" -U postgres -c \
            "SELECT pg_is_in_recovery() as is_replica, 
                    pg_current_wal_lsn() as current_lsn,
                    (SELECT count(*) FROM pg_stat_replication) as replicas;"
    fi
    
    echo ""
    echo "Replica ($REPLICA_HOST):"
    if check_replica; then
        psql -h "$REPLICA_HOST" -p "$DB_PORT" -U postgres -c \
            "SELECT pg_is_in_recovery() as is_replica,
                    pg_last_wal_receive_lsn() as received_lsn,
                    pg_last_wal_replay_lsn() as replay_lsn,
                    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::INT as lag_seconds;"
    fi
}

perform_failover() {
    notify "Starting database failover..."
    
    # Pre-flight checks
    log "=== Pre-flight Checks ==="
    
    if check_primary; then
        log "${YELLOW}⚠ Primary is still running. Are you sure you want to failover?${NC}"
        read -p "Type 'yes' to continue: " confirm
        if [ "$confirm" != "yes" ]; then
            log "Failover cancelled"
            exit 0
        fi
    fi
    
    if ! check_replica; then
        log "${RED}✗ Replica is not healthy. Cannot failover.${NC}"
        exit 1
    fi
    
    # Execute failover
    log "=== Executing Failover ==="
    promote_replica
    
    # Post-failover verification
    log "=== Post-Failover Verification ==="
    show_status
}

# Main
case "${1:-status}" in
    check)
        check_primary
        check_replica
        ;;
    failover)
        perform_failover
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [check|failover|status]"
        exit 1
        ;;
esac

