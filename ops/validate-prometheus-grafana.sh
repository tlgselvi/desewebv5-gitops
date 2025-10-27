#!/bin/bash
# Prometheus & Grafana Validation

set -e

MONITORING_NAMESPACE="monitoring"
PORT_FORWARD_TIMEOUT=10

echo "========================================="
echo "Prometheus & Grafana Validation"
echo "========================================="
echo ""

# Check if Prometheus service exists
echo "1️⃣ Checking Prometheus Service..."
echo "---------------------------"
PROMETHEUS_SERVICE=$(kubectl get svc -n $MONITORING_NAMESPACE | grep prometheus | head -1 | awk '{print $1}')
if [ -z "$PROMETHEUS_SERVICE" ]; then
    echo "✗ Prometheus service not found"
    exit 1
else
    echo "✓ Found Prometheus service: $PROMETHEUS_SERVICE"
fi
echo ""

# Forward port in background
echo "2️⃣ Setting up port forwarding..."
echo "---------------------------"
kubectl port-forward svc/$PROMETHEUS_SERVICE -n $MONITORING_NAMESPACE 9090:9090 > /dev/null 2>&1 &
PORT_FORWARD_PID=$!
sleep 5
echo "✓ Port forwarding started (PID: $PORT_FORWARD_PID)"
echo ""

# Wait for Prometheus to be ready
echo "3️⃣ Testing Prometheus Health..."
echo "---------------------------"
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo "✓ Prometheus is healthy"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Waiting for Prometheus... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    fi
done
echo ""

# Check targets
echo "4️⃣ Checking Prometheus Targets..."
echo "---------------------------"
if command -v jq &> /dev/null; then
    curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
else
    curl -s http://localhost:9090/api/v1/targets
fi
echo ""

# Check for backend metrics
echo "5️⃣ Checking for CPT Metrics..."
echo "---------------------------"
TARGETS=$(curl -s http://localhost:9090/api/v1/targets | grep -o "cpt-ajan-backend" | wc -l || echo "0")
if [ "$TARGETS" -gt 0 ]; then
    echo "✓ Found $TARGETS cpt-ajan-backend targets"
else
    echo "✗ No cpt-ajan-backend targets found"
fi
echo ""

# Check metrics
echo "6️⃣ Checking for Custom Metrics..."
echo "---------------------------"
echo "Searching for cpt_user_action_total:"
curl -s http://localhost:9090/api/v1/query?query=cpt_user_action_total | grep -q "cpt_user_action_total" && echo "✓ Metric exists" || echo "✗ Metric not found"
echo ""

# Cleanup
echo "Cleaning up port forwarding..."
kill $PORT_FORWARD_PID 2>/dev/null || true
echo ""

# Grafana
echo "========================================="
echo "Grafana Validation"
echo "========================================="
echo ""

echo "To access Grafana dashboard:"
echo "1. kubectl port-forward svc/grafana -n $MONITORING_NAMESPACE 3000:3000"
echo "2. Open http://localhost:3000"
echo "3. Look for 'Dese EA Plan v5.6' dashboard"
echo ""

