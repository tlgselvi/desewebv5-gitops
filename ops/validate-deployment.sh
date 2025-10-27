#!/bin/bash
# Dese EA Plan v5.6 - Post-Deploy Validation Script

set -e

NAMESPACE="dese-ea-plan-v5"
MONITORING_NAMESPACE="monitoring"
TIMEOUT=120

echo "========================================="
echo "Dese EA Plan v5.6 - Post-Deploy Validation"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# 1. Pod durum kontrolü
echo "1️⃣ Checking Pod Status..."
echo "---------------------------"
kubectl get pods -n $NAMESPACE -o wide
echo ""

# Check if all pods are running
PODS_RUNNING=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].status.phase}' | grep -o Running | wc -l)
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --no-headers | wc -l)

if [ "$PODS_RUNNING" -eq "$TOTAL_PODS" ]; then
    print_status 0 "All pods are running"
else
    print_status 1 "Some pods are not running"
fi
echo ""

# 2. Deployment Health
echo "2️⃣ Checking Deployment Status..."
echo "---------------------------"
echo "Backend deployment:"
kubectl rollout status deployment/cpt-ajan-backend -n $NAMESPACE --timeout=${TIMEOUT}s
print_status $? "Backend deployment is healthy"

echo "Frontend deployment:"
kubectl rollout status deployment/cpt-ajan-frontend -n $NAMESPACE --timeout=${TIMEOUT}s
print_status $? "Frontend deployment is healthy"
echo ""

# 3. Service Monitor doğrulama
echo "3️⃣ Checking ServiceMonitor..."
echo "---------------------------"
kubectl get servicemonitor -n $MONITORING_NAMESPACE | grep cpt-ajan-backend
print_status $? "ServiceMonitor exists"
echo ""

# 4. Services
echo "4️⃣ Checking Services..."
echo "---------------------------"
kubectl get svc -n $NAMESPACE
print_status $? "Services are running"
echo ""

# 5. Backend Health Check
echo "5️⃣ Testing Backend Health Endpoint..."
echo "---------------------------"
BACKEND_SERVICE=$(kubectl get svc cpt-ajan-backend -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
if [ -n "$BACKEND_SERVICE" ]; then
    echo "Backend service IP: $BACKEND_SERVICE"
    # Check if metrics endpoint is accessible
    kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl -s -o /dev/null -w "%{http_code}" http://$BACKEND_SERVICE:8080/health 2>/dev/null || echo "Unable to reach health endpoint"
else
    echo "Backend service not found"
fi
echo ""

# 6. Frontend Health Check
echo "6️⃣ Testing Frontend Health Endpoint..."
echo "---------------------------"
FRONTEND_SERVICE=$(kubectl get svc cpt-ajan-frontend -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
if [ -n "$FRONTEND_SERVICE" ]; then
    echo "Frontend service IP: $FRONTEND_SERVICE"
    # Check if frontend is accessible
    kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl -s -o /dev/null -w "%{http_code}" http://$FRONTEND_SERVICE:80/ 2>/dev/null || echo "Unable to reach frontend"
else
    echo "Frontend service not found"
fi
echo ""

# 7. Check Logs for Errors
echo "7️⃣ Checking Logs for Errors..."
echo "---------------------------"
echo "Backend logs (last 20 lines):"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-backend --tail=20 --prefix=true
echo ""

echo "Frontend logs (last 20 lines):"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-frontend --tail=20 --prefix=true
echo ""

# Check for AIOps events in logs
echo "Checking for AIOps events:"
kubectl logs -n $NAMESPACE -l app=cpt-ajan-backend --tail=100 | grep -i "AIOPS" || echo "No AIOps events found in recent logs"
echo ""

# 8. Resource Usage
echo "8️⃣ Checking Resource Usage..."
echo "---------------------------"
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"
echo ""

# 9. Events
echo "9️⃣ Recent Events..."
echo "---------------------------"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
echo ""

# Summary
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo "- Pods Running: $PODS_RUNNING/$TOTAL_PODS"
echo "- Backend Service: ${BACKEND_SERVICE:-Not found}"
echo "- Frontend Service: ${FRONTEND_SERVICE:-Not found}"
echo ""
echo "For Prometheus and Grafana validation, run:"
echo "  kubectl port-forward svc/prometheus-k8s -n monitoring 9090:9090"
echo "  kubectl port-forward svc/grafana -n monitoring 3000:3000"
echo ""

