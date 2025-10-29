#!/bin/bash
# ===============================================
# EA Plan v6.x Watch and Auto Deploy
# File watcher that triggers deployment on changes
# ===============================================

set -e

WATCH_DIRS="${WATCH_DIRS:-ops deploy finbot mubot}"
DEPLOY_INTERVAL="${DEPLOY_INTERVAL:-30}" # seconds

log() {
    echo "[WATCH-DEPLOY] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

run_deploy() {
    log "Changes detected, running deployment..."
    bash ops/ea-plan-v6-pipeline.sh
}

if ! command -v fswatch &> /dev/null; then
    log "fswatch not installed. Install: brew install fswatch (macOS) or apt-get install fswatch (Linux)"
    log "Falling back to polling mode..."
    
    # Polling mode
    while true; do
        LAST_MODIFIED=$(find $WATCH_DIRS -type f -mmin -1 2>/dev/null | head -1)
        if [ -n "$LAST_MODIFIED" ]; then
            run_deploy
            sleep $DEPLOY_INTERVAL
        else
            sleep 10
        fi
    done
else
    # fswatch mode
    log "Watching directories: $WATCH_DIRS"
    log "Deployment interval: ${DEPLOY_INTERVAL}s"
    
    fswatch -o $WATCH_DIRS | while read f; do
        run_deploy
        sleep $DEPLOY_INTERVAL
    done
fi

