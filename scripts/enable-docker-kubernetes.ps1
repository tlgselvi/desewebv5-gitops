# Enable Docker Desktop Kubernetes
# This script provides instructions and checks for Docker Desktop Kubernetes

Write-Host "🔍 Checking Docker Desktop Kubernetes Status..." -ForegroundColor Cyan

# Check if Docker Desktop is running
$dockerRunning = docker info 2>&1 | Select-String -Pattern "Server Version" -Quiet
if (-not $dockerRunning) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker Desktop is running" -ForegroundColor Green

# Check Kubernetes context
Write-Host "`n📋 Current Kubernetes Context:" -ForegroundColor Cyan
kubectl config current-context

Write-Host "`n📝 To enable Kubernetes in Docker Desktop:" -ForegroundColor Yellow
Write-Host "1. Open Docker Desktop" -ForegroundColor White
Write-Host "2. Go to Settings (⚙️ icon)" -ForegroundColor White
Write-Host "3. Navigate to 'Kubernetes' section" -ForegroundColor White
Write-Host "4. Check 'Enable Kubernetes'" -ForegroundColor White
Write-Host "5. Click 'Apply & Restart'" -ForegroundColor White
Write-Host "6. Wait for Kubernetes to start (this may take 2-3 minutes)" -ForegroundColor White

Write-Host "`n⏳ Waiting for Kubernetes to be enabled..." -ForegroundColor Cyan
Write-Host "After enabling in Docker Desktop, run this script again to verify." -ForegroundColor Yellow

# Try to check if Kubernetes is available
Write-Host "`n🔍 Testing Kubernetes connection..." -ForegroundColor Cyan
kubectl cluster-info 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Kubernetes is running!" -ForegroundColor Green
    kubectl get nodes
} else {
    Write-Host "❌ Kubernetes is not available yet." -ForegroundColor Red
    Write-Host "Please enable Kubernetes in Docker Desktop Settings." -ForegroundColor Yellow
}

