#!/bin/bash
# ===============================================
# EA PLAN v6.6.0 FinBot + MuBot Monitoring Deploy
# Bash Version
# ===============================================

set -e

echo "🚀 Deploying FinBot & MuBot Monitoring Stack..."
echo ""

# 1️⃣ Namespace kontrolü
echo "=== 1. Namespace Kontrolü ==="
if ! kubectl get ns aiops &>/dev/null; then
    echo "aiops namespace oluşturuluyor..."
    kubectl create ns aiops
    echo "✅ aiops namespace oluşturuldu"
else
    echo "✅ aiops namespace mevcut"
fi
echo ""

# 2️⃣ FinBot deployment + service
echo "=== 2. FinBot Deployment ==="
kubectl apply -n aiops -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: finbot
  namespace: aiops
  labels:
    app: finbot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: finbot
  template:
    metadata:
      labels:
        app: finbot
    spec:
      containers:
      - name: finbot
        image: ghcr.io/cptsystems/finbot:latest
        env:
        - name: FINBOT_UPDATE_INTERVAL
          value: "300"  # 5 minutes default, set to 30 for testing
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /metrics
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: finbot
  namespace: aiops
  labels:
    app: finbot
spec:
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: finbot
EOF

if [ $? -eq 0 ]; then
    echo "✅ FinBot deployment ve service oluşturuldu"
else
    echo "❌ FinBot deployment hatası"
fi
echo ""

# 3️⃣ MuBot deployment + service
echo "=== 3. MuBot Deployment ==="
kubectl apply -n aiops -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mubot
  namespace: aiops
  labels:
    app: mubot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mubot
  template:
    metadata:
      labels:
        app: mubot
    spec:
      containers:
      - name: mubot
        image: ghcr.io/cptsystems/mubot:latest
        env:
        - name: MUBOT_UPDATE_INTERVAL
          value: "300"  # 5 minutes default, set to 30 for testing
        ports:
        - containerPort: 8081
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /metrics
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: mubot
  namespace: aiops
  labels:
    app: mubot
spec:
  ports:
  - port: 81
    targetPort: 8081
  selector:
    app: mubot
EOF

if [ $? -eq 0 ]; then
    echo "✅ MuBot deployment ve service oluşturuldu"
else
    echo "❌ MuBot deployment hatası"
fi
echo ""

# 4️⃣ Prometheus ServiceMonitor ekle
echo "=== 4. Prometheus ServiceMonitor ==="
kubectl apply -n monitoring -f - <<'EOF'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: finbot-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: finbot
  namespaceSelector:
    matchNames:
    - aiops
  endpoints:
  - port: 80
    path: /metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mubot-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: mubot
  namespaceSelector:
    matchNames:
    - aiops
  endpoints:
  - port: 81
    path: /metrics
    interval: 30s
EOF

if [ $? -eq 0 ]; then
    echo "✅ ServiceMonitor'lar oluşturuldu"
else
    echo "⚠️  ServiceMonitor hatası (Prometheus Operator eksik olabilir)"
fi
echo ""

# 5️⃣ Doğrulama
echo "=== 5. Doğrulama ==="
echo ""
echo "🔍 Checking pods and services..."
sleep 5

kubectl get pods,svc -n aiops
echo ""

echo "ServiceMonitors:"
kubectl get servicemonitor -n monitoring | grep -E "finbot|mubot" || echo "ServiceMonitor'lar kontrol ediliyor..."

echo ""
echo "✅ FinBot & MuBot deployed and ServiceMonitors applied."
echo ""
echo "📊 Prometheus UI: http://localhost:9090"
echo "   Query: up{job=~\".*finbot.*|.*mubot.*\"}"
echo ""
echo "🔌 Port-forward:"
echo "   FinBot: kubectl port-forward svc/finbot -n aiops 8081:80"
echo "   MuBot: kubectl port-forward svc/mubot -n aiops 8082:81"
echo ""

