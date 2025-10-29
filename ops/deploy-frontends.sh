#!/bin/bash
# ===============================================
# EA PLAN v6.x Frontend Deployments (FinBot/MuBot Style)
# Deploys frontend/ and dese-web/ with monitoring
# ===============================================

set -e

echo "🚀 Deploying Frontends with Monitoring..."
echo ""

NAMESPACE="aiops"

# 1️⃣ Namespace kontrolü
echo "=== 1. Namespace Kontrolü ==="
if ! kubectl get ns $NAMESPACE &>/dev/null; then
    echo "Creating $NAMESPACE namespace..."
    kubectl create ns $NAMESPACE
    echo "✅ $NAMESPACE namespace created"
else
    echo "✅ $NAMESPACE namespace exists"
fi
echo ""

# 2️⃣ frontend deployment + service
echo "=== 2. Frontend Deployment (frontend/) ==="
kubectl apply -n $NAMESPACE -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: aiops
  labels:
    app: frontend
    component: frontend-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ghcr.io/cptsystems/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: aiops
  labels:
    app: frontend
spec:
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: frontend
EOF

if [ $? -eq 0 ]; then
    echo "✅ Frontend (frontend/) deployment and service created"
else
    echo "❌ Frontend deployment error"
fi
echo ""

# 3️⃣ dese-web deployment + service
echo "=== 3. Dese Web Deployment (dese-web/) ==="
kubectl apply -n $NAMESPACE -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dese-web
  namespace: aiops
  labels:
    app: dese-web
    component: dese-web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dese-web
  template:
    metadata:
      labels:
        app: dese-web
    spec:
      containers:
      - name: dese-web
        image: ghcr.io/cptsystems/dese-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: dese-web
  namespace: aiops
  labels:
    app: dese-web
spec:
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: dese-web
EOF

if [ $? -eq 0 ]; then
    echo "✅ Dese Web (dese-web/) deployment and service created"
else
    echo "❌ Dese Web deployment error"
fi
echo ""

# 4️⃣ Prometheus ServiceMonitor ekle
echo "=== 4. Prometheus ServiceMonitor ==="
kubectl apply -n monitoring -f - <<'EOF'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: frontend-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: frontend
  namespaceSelector:
    matchNames:
    - aiops
  endpoints:
  - port: 80
    path: /api/metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dese-web-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: dese-web
  namespaceSelector:
    matchNames:
    - aiops
  endpoints:
  - port: 80
    path: /api/metrics
    interval: 30s
EOF

if [ $? -eq 0 ]; then
    echo "✅ ServiceMonitors created"
else
    echo "⚠️  ServiceMonitor error (Prometheus Operator may be missing)"
fi
echo ""

# 5️⃣ Doğrulama
echo "=== 5. Verification ==="
echo ""
echo "🔍 Checking pods and services..."
sleep 5

kubectl get pods,svc -n $NAMESPACE -l 'app in (frontend,dese-web)'
echo ""

echo "ServiceMonitors:"
kubectl get servicemonitor -n monitoring | grep -E "frontend|dese-web" || echo "ServiceMonitors being checked..."

echo ""
echo "✅ Frontends deployed with monitoring enabled."
echo ""
echo "📊 Prometheus UI: http://localhost:9090"
echo "   Query: up{job=~\".*frontend.*|.*dese-web.*\"}"
echo ""
echo "🔌 Port-forward:"
echo "   Frontend: kubectl port-forward svc/frontend -n aiops 8083:80"
echo "   Dese Web: kubectl port-forward svc/dese-web -n aiops 8084:80"
echo ""

