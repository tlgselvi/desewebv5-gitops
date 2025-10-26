#!/bin/bash
# Prometheus Metrics Exporter for Predictive Risk
# Exports risk scores to Prometheus-compatible format

# Read risk prediction
if [ ! -f "aiops/risk-prediction.json" ]; then
    echo "❌ Risk prediction file not found"
    exit 1
fi

RISK_SCORE=$(jq -r '.risk_score' aiops/risk-prediction.json)
ANOMALY_SCORE=$(jq -r '.anomaly_score' aiops/risk-prediction.json)
TIMESTAMP=$(date +%s)

# Generate Prometheus metrics
cat > aiops/metrics.prom << EOF
# HELP aiops_risk_score Predictive deployment risk score (0-1)
# TYPE aiops_risk_score gauge
aiops_risk_score ${RISK_SCORE}

# HELP aiops_anomaly_score IsolationForest anomaly score
# TYPE aiops_anomaly_score gauge
aiops_anomaly_score ${ANOMALY_SCORE}

# HELP aiops_model_version Model version hash
# TYPE aiops_model_version gauge
aiops_model_version{version="v1.0.0-isolation-forest"} 1

# HELP aiops_predictions_total Total predictions made
# TYPE aiops_predictions_total counter
aiops_predictions_total ${TIMESTAMP}
EOF

echo "📊 Prometheus metrics exported:"
cat aiops/metrics.prom

# Optional: Push to Pushgateway
if [ -n "$PUSHGATEWAY_URL" ]; then
    echo "📤 Pushing metrics to Pushgateway..."
    curl -X POST "$PUSHGATEWAY_URL/metrics/job/predictive-risk" \
         --data-binary @aiops/metrics.prom || echo "⚠️  Push failed"
fi

