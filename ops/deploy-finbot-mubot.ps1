# ===============================================
# EA PLAN v6.6.0 FinBot + MuBot Monitoring Deploy
# PowerShell Version
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Deploying FinBot & MuBot Monitoring Stack...`n" -ForegroundColor Cyan

# 1️⃣ Namespace kontrolü
Write-Host "=== 1. Namespace Kontrolü ===" -ForegroundColor Yellow
$aiopsNs = kubectl get ns aiops 2>&1
if ($aiopsNs -match "NotFound") {
    Write-Host "aiops namespace oluşturuluyor..." -ForegroundColor Yellow
    kubectl create ns aiops 2>&1 | Out-Null
    Write-Host "✅ aiops namespace oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "✅ aiops namespace mevcut" -ForegroundColor Green
}
Write-Host ""

# 2️⃣ FinBot deployment + service
Write-Host "=== 2. FinBot Deployment ===" -ForegroundColor Yellow

$finbotYaml = @"
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
"@

$finbotYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ FinBot deployment ve service oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "❌ FinBot deployment hatası" -ForegroundColor Red
}
Write-Host ""

# 3️⃣ MuBot deployment + service
Write-Host "=== 3. MuBot Deployment ===" -ForegroundColor Yellow

$mubotYaml = @"
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
"@

$mubotYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ MuBot deployment ve service oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "❌ MuBot deployment hatası" -ForegroundColor Red
}
Write-Host ""

# 4️⃣ Prometheus ServiceMonitor ekle
Write-Host "=== 4. Prometheus ServiceMonitor ===" -ForegroundColor Yellow

$serviceMonitorYaml = @"
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
"@

$serviceMonitorYaml | kubectl apply -f - 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ServiceMonitor'lar oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "⚠️  ServiceMonitor hatası (Prometheus Operator eksik olabilir)" -ForegroundColor Yellow
}
Write-Host ""

# 5️⃣ Doğrulama
Write-Host "=== 5. Doğrulama ===" -ForegroundColor Yellow
Write-Host "`n🔍 Pods ve Services kontrol ediliyor...`n" -ForegroundColor Cyan

Start-Sleep -Seconds 5

$pods = kubectl get pods -n aiops 2>&1
if ($pods) {
    Write-Host "Pods:" -ForegroundColor Green
    $pods
} else {
    Write-Host "⚠️  Pod'lar henüz oluşmadı, birkaç saniye bekleyin..." -ForegroundColor Yellow
}

Write-Host "`nServices:" -ForegroundColor Green
kubectl get svc -n aiops 2>&1

Write-Host "`nServiceMonitors:" -ForegroundColor Green
kubectl get servicemonitor -n monitoring 2>&1 | Select-String "finbot|mubot" -CaseSensitive:$false

Write-Host "`n✅ FinBot & MuBot deployed and ServiceMonitors applied." -ForegroundColor Green
Write-Host "`n📊 Prometheus'da kontrol için:" -ForegroundColor Cyan
Write-Host '   Query: up{job=~".*finbot.*|.*mubot.*"}' -ForegroundColor White
Write-Host "   URL: http://localhost:9090/graph" -ForegroundColor White
Write-Host "`n🔌 Port-forward için:" -ForegroundColor Cyan
Write-Host "   FinBot: kubectl port-forward svc/finbot -n aiops 8081:80" -ForegroundColor White
Write-Host "   MuBot: kubectl port-forward svc/mubot -n aiops 8082:81" -ForegroundColor White
Write-Host ""

