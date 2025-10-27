#!/bin/bash
# Pre-Production Validation for v5.7.1

set -e

echo "========================================="
echo "v5.7.1 Pre-Production Validation"
echo "========================================="
echo ""

NAMESPACE="dese-ea-plan-v5"
TIMEOUT=120

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# 1. Redis Validation
echo "1️⃣ Validating Redis Configuration..."
echo "---------------------------"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=cpt-ajan-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$POD_NAME" ]; then
    kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli INFO keyspace > /dev/null 2>&1
    print_status $? "Redis connection OK"
    
    kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli CONFIG GET maxmemory-policy
    kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli CONFIG GET save
else
    echo "No backend pod found for Redis validation"
fi
echo ""

# 2. Security Scan
echo "2️⃣ Security Validation..."
echo "---------------------------"
echo "Run Trivy scan:"
echo "  trivy image --exit-code 1 --severity CRITICAL,HIGH \$IMAGE"
echo ""
echo "Run Cosign verification:"
echo "  cosign verify --key \$COSIGN_PUB \$IMAGE"
echo ""

# 3. Load Test
echo "3️⃣ Load Test Validation..."
echo "---------------------------"
echo "Run load test:"
echo "  k6 run ops/loadtest_feedback_thresholds.k6.js"
echo ""

# 4. Prometheus Metrics
echo "4️⃣ Prometheus Metrics Validation..."
echo "---------------------------"
echo "Check metrics:"
echo "  curl http://localhost:3000/metrics/aiops | grep aiops_feedback_total"
echo "  curl http://localhost:3000/metrics/aiops | grep aiops_remediation_events_total"
echo ""

# 5. ArgoCD Status
echo "5️⃣ ArgoCD Validation..."
echo "---------------------------"
argocd app get cpt-ajan 2>/dev/null || echo "ArgoCD not accessible"
echo ""

# Summary
echo "========================================="
echo "Validation Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run security scans (Trivy/Cosign)"
echo "2. Execute load test (k6)"
echo "3. Verify all gates PASS"
echo "4. Proceed to canary deployment"
echo ""

