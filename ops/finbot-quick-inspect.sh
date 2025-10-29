#!/bin/bash
# ===============================================
# FinBot Quick Inspect + Port-Forward
# ===============================================
# FinBot pod, service, logs ve port-forward yönetimi

set -e

echo "=== FinBot QUICK INSPECT START ==="
echo ""

# 1) Bul FinBot ile ilgili objeleri (isimde veya label'da 'finbot' geçenler)
echo "🔍 Searching for FinBot resources..."
FINBOT_RESOURCES=$(kubectl get pods,deploy,svc,ing -A 2>&1 | grep -i finbot || true)

if [ -n "$FINBOT_RESOURCES" ]; then
    echo "✅ FinBot resources found:"
    echo "$FINBOT_RESOURCES" | head -20
else
    echo "⚠️  FinBot kaynak bulunamadı (isim/label 'finbot' yok)"
fi
echo ""

# 2) Eğer bulunduysa namespace ve isim yakala (ilk bulunanı kullan)
FB_POD=$(kubectl get pods -A --no-headers 2>&1 | grep -i finbot | head -1 | awk '{print $2}')
FB_NS=$(kubectl get pods -A --no-headers 2>&1 | grep -i finbot | head -1 | awk '{print $1}')

if [ -n "$FB_POD" ] && [ -n "$FB_NS" ]; then
    echo "📦 Found pod: $FB_POD"
    echo "📍 Namespace: $FB_NS"
else
    echo "⚠️  FinBot pod bulunamadı"
    FB_POD=""
    FB_NS=""
fi
echo ""

# 3) Pod/Deployment detayları
if [ -n "$FB_POD" ] && [ -n "$FB_NS" ]; then
    echo "📋 Pod Details (first 200 lines)..."
    echo "---"
    kubectl describe pod "$FB_POD" -n "$FB_NS" 2>&1 | head -200
    echo ""
    
    echo "📜 Logs (last 300 lines)..."
    echo "---"
    kubectl logs "$FB_POD" -n "$FB_NS" --tail=300 2>&1 | head -200
    echo ""
    echo "💡 Follow logs: kubectl logs -f $FB_POD -n $FB_NS"
    echo ""
else
    echo "⚠️  No FinBot pod to describe/log. Check deployments/services names manually."
    echo "   Try: kubectl get deploy -A | grep -i finbot"
fi
echo ""

# 4) Service -> port-forward for UI/API access
if [ -n "$FB_NS" ]; then
    FB_SVC=$(kubectl get svc -n "$FB_NS" --no-headers 2>&1 | grep -i finbot | head -1 | awk '{print $1}')
    
    if [ -n "$FB_SVC" ]; then
        echo "🔌 Service found: $FB_SVC in $FB_NS"
        
        # Check if port-forward already running
        PF_PID=$(pgrep -f "kubectl port-forward.*$FB_SVC" || true)
        
        if [ -n "$PF_PID" ]; then
            echo "⚠️  Port-forward already running (PID: $PF_PID)"
            echo "   To stop: kill $PF_PID"
        else
            echo "🚀 Starting port-forward to localhost:8080 -> service port 80 (background)..."
            nohup kubectl port-forward svc/"$FB_SVC" -n "$FB_NS" 8080:80 >/tmp/finbot-portforward.log 2>&1 &
            sleep 2
            
            # Check if it's running
            if pgrep -f "kubectl port-forward.*$FB_SVC" > /dev/null; then
                echo "✅ Port-forward started"
                echo "🌐 FinBot UI/API available at: http://localhost:8080"
                echo "   Try: http://localhost:8080/health or http://localhost:8080/api/predict"
                echo "📋 Port-forward logs: tail -f /tmp/finbot-portforward.log"
            else
                echo "❌ Port-forward failed. Check logs: tail -f /tmp/finbot-portforward.log"
            fi
        fi
    else
        echo "⚠️  No service named *finbot* found in $FB_NS"
        echo "   List services: kubectl get svc -n $FB_NS"
    fi
    echo ""
else
    echo "⚠️  No namespace found, skipping service port-forward"
fi

# 5) Prometheus quick-check (port-forward) to query finbot metrics
echo "📊 Prometheus port-forward setup..."
MONITORING_NS="monitoring"

# Check if Prometheus service exists
PROM_SVC=$(kubectl get svc -n "$MONITORING_NS" --no-headers 2>&1 | grep -i prometheus | head -1 | awk '{print $1}')

if [ -n "$PROM_SVC" ]; then
    # Check if port-forward already running
    PROM_PF_PID=$(pgrep -f "kubectl port-forward.*prometheus.*9090" || true)
    
    if [ -n "$PROM_PF_PID" ]; then
        echo "⚠️  Prometheus port-forward already running (PID: $PROM_PF_PID)"
        echo "   To stop: kill $PROM_PF_PID"
    else
        echo "🚀 Starting Prometheus port-forward (9090) for metric queries..."
        nohup kubectl port-forward svc/"$PROM_SVC" -n "$MONITORING_NS" 9090:9090 >/tmp/prom-pf.log 2>&1 &
        sleep 2
        
        if pgrep -f "kubectl port-forward.*prometheus.*9090" > /dev/null; then
            echo "✅ Prometheus port-forward started"
            echo "🌐 Prometheus UI: http://localhost:9090"
            echo "📊 Useful queries:"
            echo "   up{job=~\".*finbot.*\"}"
            echo "   finbot_failure_probability"
            echo "   finbot_predictive_score"
            echo "   (try autocomplete in Prometheus UI)"
        else
            echo "❌ Prometheus port-forward failed. Check logs: tail -f /tmp/prom-pf.log"
        fi
    fi
else
    echo "⚠️  Prometheus service not found in $MONITORING_NS"
fi
echo ""

# 6) Grafana dashboard hint
echo "📈 Grafana Dashboard..."
GRAFANA_SVC=$(kubectl get svc -n "$MONITORING_NS" --no-headers 2>&1 | grep -i grafana | head -1 | awk '{print $1}')

if [ -n "$GRAFANA_SVC" ]; then
    GRAFANA_PF_PID=$(pgrep -f "kubectl port-forward.*grafana.*3000" || true)
    
    if [ -n "$GRAFANA_PF_PID" ]; then
        echo "⚠️  Grafana port-forward already running (PID: $GRAFANA_PF_PID)"
    else
        echo "💡 To start Grafana port-forward:"
        echo "   kubectl port-forward svc/$GRAFANA_SVC -n $MONITORING_NS 3000:3000 &"
        echo ""
        echo "   Then access: http://localhost:3000"
        echo "   Search dashboard: 'EA Plan - FinBot' or 'Predictive Maintenance'"
    fi
else
    echo "⚠️  Grafana service not found"
fi
echo ""

# Summary
echo "=== FinBot QUICK INSPECT COMPLETE ==="
echo ""
echo "📋 Summary:"
[ -n "$FB_POD" ] && echo "  ✅ FinBot Pod: $FB_POD ($FB_NS)"
[ -n "$FB_SVC" ] && echo "  ✅ FinBot Service: $FB_SVC"
echo "  ✅ Port-forwards:"
echo "     - FinBot: http://localhost:8080"
echo "     - Prometheus: http://localhost:9090"
echo ""
echo "🔧 Useful Commands:"
echo "  - View FinBot logs: kubectl logs -f $FB_POD -n $FB_NS"
echo "  - Stop port-forwards: pkill -f 'kubectl port-forward'"
echo "  - Check port-forward logs: tail -f /tmp/finbot-portforward.log"
echo ""

