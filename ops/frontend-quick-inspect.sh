#!/bin/bash
# ===============================================
# Frontend Quick Inspect Script
# Similar to finbot-quick-inspect.sh
# ===============================================

NAMESPACE="aiops"

echo "🔍 Frontend Services Quick Inspect"
echo "=================================="
echo ""

# Auto-discover pods
FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
DESE_WEB_POD=$(kubectl get pods -n $NAMESPACE -l app=dese-web -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

echo "📊 Service Status:"
echo "-------------------"
kubectl get pods,svc -n $NAMESPACE -l 'app in (frontend,dese-web)'
echo ""

if [ -n "$FRONTEND_POD" ]; then
    echo "📝 Frontend Logs (last 20 lines):"
    echo "-----------------------------------"
    kubectl logs $FRONTEND_POD -n $NAMESPACE --tail=20
    echo ""
fi

if [ -n "$DESE_WEB_POD" ]; then
    echo "📝 Dese Web Logs (last 20 lines):"
    echo "----------------------------------"
    kubectl logs $DESE_WEB_POD -n $NAMESPACE --tail=20
    echo ""
fi

echo "🔌 Port-Forward Setup:"
echo "----------------------"
echo ""
echo "To access Frontend:"
echo "  kubectl port-forward svc/frontend 8083:80 -n $NAMESPACE"
echo "  → http://localhost:8083"
echo ""
echo "To access Dese Web:"
echo "  kubectl port-forward svc/dese-web 8084:80 -n $NAMESPACE"
echo "  → http://localhost:8084"
echo ""
echo "To access Prometheus:"
echo "  kubectl port-forward svc/prometheus 9090:9090 -n monitoring"
echo "  → http://localhost:9090"
echo ""
echo "📊 Prometheus Queries:"
echo "----------------------"
echo "  up{app=\"frontend\",namespace=\"aiops\"}"
echo "  up{app=\"dese-web\",namespace=\"aiops\"}"
echo ""

