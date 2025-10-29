# ===============================================
# EA PLAN v6.x Frontend Deployments (FinBot/MuBot Style)
# PowerShell Version
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Deploying Frontends with Monitoring...`n" -ForegroundColor Cyan

$NAMESPACE = "aiops"

# 1️⃣ Namespace kontrolü
Write-Host "=== 1. Namespace Kontrolü ===" -ForegroundColor Yellow
$ns = kubectl get ns $NAMESPACE 2>&1
if ($ns -match "NotFound") {
    Write-Host "Creating $NAMESPACE namespace..." -ForegroundColor Yellow
    kubectl create ns $NAMESPACE 2>&1 | Out-Null
    Write-Host "✅ $NAMESPACE namespace created" -ForegroundColor Green
} else {
    Write-Host "✅ $NAMESPACE namespace exists" -ForegroundColor Green
}
Write-Host ""

# 2️⃣ frontend deployment + service
Write-Host "=== 2. Frontend Deployment (frontend/) ===" -ForegroundColor Yellow

$frontendYaml = @"
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
"@

$frontendYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend (frontend/) deployment and service created" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend deployment error" -ForegroundColor Red
}
Write-Host ""

# 3️⃣ dese-web deployment + service
Write-Host "=== 3. Dese Web Deployment (dese-web/) ===" -ForegroundColor Yellow

$deseWebYaml = @"
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
"@

$deseWebYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dese Web (dese-web/) deployment and service created" -ForegroundColor Green
} else {
    Write-Host "❌ Dese Web deployment error" -ForegroundColor Red
}
Write-Host ""

# 4️⃣ Prometheus ServiceMonitor ekle
Write-Host "=== 4. Prometheus ServiceMonitor ===" -ForegroundColor Yellow

$serviceMonitorYaml = @"
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
"@

$serviceMonitorYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ServiceMonitors created" -ForegroundColor Green
} else {
    Write-Host "⚠️  ServiceMonitor error (Prometheus Operator may be missing)" -ForegroundColor Yellow
}
Write-Host ""

# 5️⃣ Doğrulama
Write-Host "=== 5. Verification ===" -ForegroundColor Yellow
Write-Host "`n🔍 Pods ve Services kontrol ediliyor...`n" -ForegroundColor Cyan

Start-Sleep -Seconds 5

$pods = kubectl get pods -n $NAMESPACE -l 'app in (frontend,dese-web)' 2>&1
if ($pods) {
    Write-Host "Pods:" -ForegroundColor Green
    $pods
} else {
    Write-Host "⚠️  Pod'lar henüz oluşmadı, birkaç saniye bekleyin..." -ForegroundColor Yellow
}

Write-Host "`nServices:" -ForegroundColor Green
kubectl get svc -n $NAMESPACE -l 'app in (frontend,dese-web)' 2>&1

Write-Host "`nServiceMonitors:" -ForegroundColor Green
kubectl get servicemonitor -n monitoring 2>&1 | Select-String "frontend|dese-web" -CaseSensitive:$false

Write-Host "`n✅ Frontends deployed with monitoring enabled." -ForegroundColor Green
Write-Host "`n📊 Prometheus'da kontrol için:" -ForegroundColor Cyan
Write-Host '   Query: up{job=~".*frontend.*|.*dese-web.*"}' -ForegroundColor White
Write-Host "   URL: http://localhost:9090/graph" -ForegroundColor White
Write-Host "`n🔌 Port-forward için:" -ForegroundColor Cyan
Write-Host "   Frontend: kubectl port-forward svc/frontend -n aiops 8083:80" -ForegroundColor White
Write-Host "   Dese Web: kubectl port-forward svc/dese-web -n aiops 8084:80" -ForegroundColor White
Write-Host ""

