#!/bin/bash
# ===============================================
# EA Plan v6.x Auto Deploy Trigger
# Git-based automatic deployment trigger
# ===============================================

set -e

REPO_PATH="${REPO_PATH:-$PWD}"
BRANCH="${BRANCH:-main}"
AUTO_COMMIT="${AUTO_COMMIT:-true}"

log() {
    echo "[AUTO-DEPLOY] $1"
}

# Check for changes that require deployment
check_changes() {
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || git ls-files --others --exclude-standard)
    
    if echo "$CHANGED_FILES" | grep -qE "(finbot|mubot|deploy|ops)"; then
        return 0
    fi
    return 1
}

# Trigger deployment via GitHub Actions
trigger_deployment() {
    local phase="${1:-all}"
    
    log "Triggering auto-deployment (phase: $phase)..."
    
    if command -v gh &> /dev/null; then
        gh workflow run ea-plan-v6-auto-deploy.yml \
            -f phase="$phase" \
            -R "$(git remote get-url origin | sed 's/.*github.com[/:]\([^.]*\).*/\1/')" || \
            log "GitHub CLI not available, manual trigger required"
    else
        log "GitHub CLI not installed. Run: gh workflow run ea-plan-v6-auto-deploy.yml"
    fi
}

# Auto-commit and push changes
auto_commit() {
    if [ "$AUTO_COMMIT" != "true" ]; then
        return 0
    fi
    
    if git diff --quiet && git diff --cached --quiet; then
        log "No changes to commit"
        return 0
    fi
    
    git add -A
    git commit -m "chore: auto-deploy trigger [deploy]" || log "No changes to commit"
    git push origin "$BRANCH" || log "Push failed"
}

# Main execution
main() {
    log "Starting auto-deploy trigger..."
    
    cd "$REPO_PATH" || exit 1
    
    if check_changes; then
        log "Changes detected, triggering deployment..."
        trigger_deployment "all"
        
        if [ "$AUTO_COMMIT" = "true" ]; then
            auto_commit
        fi
    else
        log "No deployment-required changes detected"
    fi
    
    log "Auto-deploy trigger complete"
}

main "$@"

