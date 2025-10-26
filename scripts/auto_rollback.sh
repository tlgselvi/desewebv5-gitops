#!/bin/bash
set -e

# Auto Rollback Script for Predictive Risk Mitigation - Hardened
# Executes rollback when risk_score > 0.8
# Includes daily rollback limit guardrails

echo "🔄 Auto Rollback Script - Starting (Hardened)"
echo "================================================="

# Configuration
APP_NAME="dese-ea-plan-v5"
NAMESPACE="dese-ea-plan-v5"
LOG_FILE="logs/rollback-history.log"
RISK_THRESHOLD=0.8
MAX_DAILY_ROLLBACKS="${MAX_DAILY_ROLLBACKS:-1}"

# Ensure log directory exists
mkdir -p logs
mkdir -p aiops

# Check daily rollback limit (safety guardrail)
TODAY=$(date +%F)
ROLLBACK_COUNT=$(grep -c "$TODAY" "$LOG_FILE" 2>/dev/null || echo "0")

echo "📊 Rollback Safety Check:"
echo "   Date: $TODAY"
echo "   Today's rollbacks: $ROLLBACK_COUNT"
echo "   Max allowed: $MAX_DAILY_ROLLBACKS"

if [ "$ROLLBACK_COUNT" -ge "$MAX_DAILY_ROLLBACKS" ]; then
    echo "❌ [ABORT] Daily rollback limit reached ($ROLLBACK_COUNT >= $MAX_DAILY_ROLLBACKS)"
    echo "⚠️ Manual intervention required."
    exit 1
fi

# Read risk prediction
if [ ! -f "aiops/risk-prediction.json" ]; then
    echo "❌ Risk prediction file not found"
    exit 1
fi

RISK_SCORE=$(jq -r '.risk_score' aiops/risk-prediction.json)
DECISION=$(jq -r '.decision' aiops/risk-prediction.json)

echo "📊 Risk Analysis:"
echo "   Risk Score: $RISK_SCORE"
echo "   Decision: $DECISION"
echo ""

if [ "$DECISION" != "rollback" ]; then
    echo "✅ Risk score below threshold, no rollback needed"
    exit 0
fi

echo "🚨 HIGH RISK DETECTED: Initiating rollback..."

# Get current revision
echo "📋 Fetching current ArgoCD application state..."
CURRENT_REV=$(argocd app get $APP_NAME -o json | jq -r '.status.sync.revision' || echo "unknown")
echo "   Current revision: $CURRENT_REV"

# Get rollback target (previous successful revision)
echo "📋 Fetching deployment history..."
HISTORY=$(argocd app history $APP_NAME -o json || echo "[]")
SUCCESSFUL_REVISIONS=$(echo $HISTORY | jq -r '.[] | select(.deployedAt != null) | .id' | head -2)

if [ -z "$SUCCESSFUL_REVISIONS" ]; then
    echo "❌ No successful revisions found for rollback"
    exit 1
fi

ROLLBACK_TARGET=$(echo $SUCCESSFUL_REVISIONS | awk '{print $2}')
if [ -z "$ROLLBACK_TARGET" ]; then
    ROLLBACK_TARGET=$(echo $SUCCESSFUL_REVISIONS | awk '{print $1}')
fi

echo "   Rollback target: $ROLLBACK_TARGET"

# Execute rollback
echo ""
echo "⏪ Executing rollback to revision: $ROLLBACK_TARGET"
argocd app rollback $APP_NAME $ROLLBACK_TARGET

if [ $? -eq 0 ]; then
    echo "✅ Rollback successful"
    
    # Log rollback event
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$TIMESTAMP] ROLLBACK: $APP_NAME -> $ROLLBACK_TARGET (Risk Score: $RISK_SCORE)" >> $LOG_FILE
    
    # Generate rollback summary
    cat > aiops/rollback-summary.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "application": "$APP_NAME",
  "namespace": "$NAMESPACE",
  "rollback_to": "$ROLLBACK_TARGET",
  "from_revision": "$CURRENT_REV",
  "risk_score": $RISK_SCORE,
  "trigger": "predictive_risk",
  "status": "success"
}
EOF
    
    echo "📄 Rollback summary: aiops/rollback-summary.json"
    
else
    echo "❌ Rollback failed"
    
    # Log failure
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$TIMESTAMP] ROLLBACK FAILED: $APP_NAME (Risk Score: $RISK_SCORE)" >> $LOG_FILE
    
    exit 1
fi

# Wait for rollout to complete
echo ""
echo "⏳ Waiting for rollback rollout to complete..."
kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=5m

if [ $? -eq 0 ]; then
    echo "✅ Rollback rollout completed"
else
    echo "⚠️  Rollback rollout timed out"
fi

echo ""
echo "✅ Auto rollback completed successfully"
exit 0

