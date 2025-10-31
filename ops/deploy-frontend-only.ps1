# ===============================================
# Deploy Frontend Only (Dese Web has build issues)
# ===============================================

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Deploying Frontend (only)...`n" -ForegroundColor Cyan

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
Write-Host "=== 2. Frontend Deployment ===" -ForegroundColor Yellow

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
        image: frontend:latest
        imagePullPolicy: IfNotPresent
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
    Write-Host "✅ Frontend deployment and service created" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend deployment error" -ForegroundColor Red
}
Write-Host ""

# 3️⃣ Doğrulama
Write-Host "=== 3. Verification ===" -ForegroundColor Yellow
Write-Host "⏳ Waiting for pods to be ready (15 seconds)...`n" -ForegroundColor Gray
Start-Sleep -Seconds 15

kubectl get pods,svc -n $NAMESPACE -l app=frontend

Write-Host "`n✅ Frontend deployed!`n" -ForegroundColor Green
Write-Host "🔌 Port-forward:`n" -ForegroundColor Cyan
Write-Host "  kubectl port-forward svc/frontend 8083:80 -n aiops" -ForegroundColor White
Write-Host "  → http://localhost:8083`n" -ForegroundColor Gray

