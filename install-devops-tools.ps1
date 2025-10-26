# === DevOps Araçlarını Yükleme Scripti ===

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DevOps Araçları Kurulum Başlatılıyor..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Kubectl - Kubernetes CLI
Write-Host "[1/7] Kubectl kuruluyor..." -ForegroundColor Yellow
winget install Kubernetes.kubectl -e --accept-source-agreements --accept-package-agreements

# Helm - Kubernetes Package Manager
Write-Host "`n[2/7] Helm kuruluyor..." -ForegroundColor Yellow
winget install Helm.Helm -e --accept-source-agreements --accept-package-agreements

# Docker Desktop
Write-Host "`n[3/7] Docker Desktop kuruluyor..." -ForegroundColor Yellow
winget install Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements

# Kustomize
Write-Host "`n[4/7] Kustomize kuruluyor..." -ForegroundColor Yellow
winget install Kubernetes.kustomize -e --accept-source-agreements --accept-package-agreements

# ArgoCD CLI
Write-Host "`n[5/7] ArgoCD CLI kuruluyor..." -ForegroundColor Yellow
winget install argoproj.argocd -e --accept-source-agreements --accept-package-agreements

# Cosign
Write-Host "`n[6/7] Cosign kuruluyor..." -ForegroundColor Yellow
winget install Sigstore.Cosign -e --accept-source-agreements --accept-package-agreements

# Grafana
Write-Host "`n[7/7] Grafana kuruluyor..." -ForegroundColor Yellow
winget install GrafanaLabs.Grafana.OSS -e --accept-source-agreements --accept-package-agreements

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Kurulum tamamlandı ✅" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "⚠️  Önemli: PATH değişiklikleri için PowerShell'i kapatıp yeniden açın!" -ForegroundColor Yellow
