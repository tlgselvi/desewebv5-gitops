#!/bin/bash
# ops/watchdog.sh
# Continuous health monitoring and auto-restart for EA Plan v5.8.0

set -euo pipefail

# Configuration
OPS_SERVER_URL="http://localhost:8000/api/v1/health"
FRONTEND_URL="http://localhost:3000/api/aiops/health"
LOG_FILE="logs/watchdog.log"
FAILURE_COUNT=0
MAX_FAILURES=2
CHECK_INTERVAL=300  # 5 minutes

# Create logs directory if it doesn't exist
mkdir -p logs

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Health check function
check_health() {
    local service_name="$1"
    local url="$2"
    
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        log_message "✅ $service_name health check PASSED"
        return 0
    else
        log_message "❌ $service_name health check FAILED"
        return 1
    fi
}

# Restart ops server function
restart_ops_server() {
    log_message "🔄 Restarting ops server..."
    
    # Kill existing ops server process
    pkill -f "tsx src/ops-server.ts" || true
    sleep 2
    
    # Start ops server in background
    cd "$(dirname "$0")/.."
    nohup npm run start:ops > logs/ops-server.log 2>&1 &
    
    log_message "✅ Ops server restarted (PID: $!)"
}

# Main watchdog loop
main() {
    log_message "🚀 Starting EA Plan v5.8.0 Watchdog Monitor"
    log_message "📊 Monitoring: Ops Server ($OPS_SERVER_URL), Frontend ($FRONTEND_URL)"
    log_message "⏰ Check interval: ${CHECK_INTERVAL}s, Max failures: $MAX_FAILURES"
    
    while true; do
        local ops_healthy=false
        local frontend_healthy=false
        
        # Check ops server
        if check_health "Ops Server" "$OPS_SERVER_URL"; then
            ops_healthy=true
        fi
        
        # Check frontend proxy
        if check_health "Frontend Proxy" "$FRONTEND_URL"; then
            frontend_healthy=true
        fi
        
        # Handle failures
        if ! $ops_healthy || ! $frontend_healthy; then
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            log_message "⚠️  Health check failure #$FAILURE_COUNT"
            
            if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
                log_message "🚨 CRITICAL: $MAX_FAILURES consecutive failures detected!"
                
                if ! $ops_healthy; then
                    restart_ops_server
                fi
                
                # Reset failure count after restart
                FAILURE_COUNT=0
                
                # Send alert (placeholder for PagerDuty/Slack integration)
                log_message "📢 ALERT: System recovery actions initiated"
            fi
        else
            # Reset failure count on success
            if [ $FAILURE_COUNT -gt 0 ]; then
                log_message "✅ System recovered, resetting failure count"
                FAILURE_COUNT=0
            fi
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Signal handling
cleanup() {
    log_message "🛑 Watchdog monitor shutting down"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start the watchdog
main
