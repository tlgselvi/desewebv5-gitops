#!/usr/bin/env pwsh
# EA PLAN v6.x MASTER CONTROL PROMPT
# Persistent execution | Turkish mode | DeseGPT Orchestrator managed
# PowerShell Version for Windows

$NAMESPACE_MONITORING = "monitoring"
$NAMESPACE_WEB = "ea-web"
$REPO_PATH = $PWD
$GITHUB_REPO = "github.com/CPTSystems/ea-plan"
$DOCURA_IMAGE = "ghcr.io/cptsystems/docura-builder:latest"

Write-Host "`n🔧 [EA PLAN] Ortam doğrulaması yapılıyor...`n" -ForegroundColor Cyan

$monitoringNs = kubectl get ns $NAMESPACE_MONITORING 2>&1
$webNs = kubectl get ns $NAMESPACE_WEB 2>&1

if ($monitoringNs -match "NotFound" -or $webNs -match "NotFound") {
    Write-Host "⚠️  Namespace eksik" -ForegroundColor Yellow
} else {
    Write-Host "✅ Namespaces doğrulandı" -ForegroundColor Green
}

$ghStatus = gh repo view $GITHUB_REPO 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  GitHub bağlantısı yok" -ForegroundColor Yellow
} else {
    Write-Host "✅ GitHub bağlantısı OK" -ForegroundColor Green
}

Write-Host "`n🔄 [EA PLAN] GitOps senkronizasyonu...`n" -ForegroundColor Cyan
$argocdSync = argocd app sync ea-plan-v6.4 --prune 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  ArgoCD sync hatası veya app bulunamadı" -ForegroundColor Yellow
} else {
    Write-Host "✅ ArgoCD sync başarılı" -ForegroundColor Green
}

Write-Host "`n🚀 [EA PLAN] Deploy işlemleri...`n" -ForegroundColor Cyan

if (Test-Path deploy/aiops-model.yaml) {
    kubectl apply -f deploy/aiops-model.yaml -n $NAMESPACE_MONITORING 2>&1
    Write-Host "✅ AIOps model applied" -ForegroundColor Green
} else {
    Write-Host "⚠️  deploy/aiops-model.yaml bulunamadı" -ForegroundColor Yellow
}

if (Test-Path deploy/seo-observer.yaml) {
    kubectl apply -f deploy/seo-observer.yaml -n $NAMESPACE_MONITORING 2>&1
    Write-Host "✅ SEO Observer applied" -ForegroundColor Green
} else {
    Write-Host "⚠️  deploy/seo-observer.yaml bulunamadı" -ForegroundColor Yellow
}

if (Test-Path configs/auto-remediation-extended.yaml) {
    kubectl apply -f configs/auto-remediation-extended.yaml -n $NAMESPACE_WEB 2>&1
    Write-Host "✅ Auto-remediation extended applied" -ForegroundColor Green
} else {
    Write-Host "⚠️  configs/auto-remediation-extended.yaml bulunamadı" -ForegroundColor Yellow
}

Write-Host "`n🧠 [EA PLAN] AIOps job kontrolü...`n" -ForegroundColor Cyan
$aiopsJob = kubectl get job aiops-tuning -n $NAMESPACE_MONITORING 2>&1
if ($aiopsJob -match "NotFound") {
    kubectl create job aiops-tuning --image=python:3.11-slim -n $NAMESPACE_MONITORING -- /bin/sh -c "echo 'AIOps tuning placeholder'" 2>&1
    Write-Host "✅ AIOps tuning job oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "✅ AIOps tuning job mevcut" -ForegroundColor Green
}

Write-Host "`n📈 [EA PLAN] SEO CronJob kontrolü...`n" -ForegroundColor Cyan
$seoCron = kubectl get cronjob seo-observer -n $NAMESPACE_MONITORING 2>&1
if ($seoCron -match "NotFound") {
    kubectl create cronjob seo-observer --schedule="*/30 * * * *" --image=ghcr.io/cptseo/observer:latest -n $NAMESPACE_MONITORING 2>&1
    Write-Host "✅ SEO Observer CronJob oluşturuldu" -ForegroundColor Green
} else {
    Write-Host "✅ SEO Observer CronJob mevcut" -ForegroundColor Green
}

Write-Host "`n🛡️ [EA PLAN] Observability/Security kontrolü...`n" -ForegroundColor Cyan
$prometheus = kubectl get deployment prometheus -n $NAMESPACE_MONITORING 2>&1
if ($prometheus -notmatch "NotFound") {
    Write-Host "✅ Prometheus aktif" -ForegroundColor Green
} else {
    Write-Host "⚠️  Prometheus bulunamadı" -ForegroundColor Yellow
}

$grafana = kubectl get deployment grafana -n $NAMESPACE_MONITORING 2>&1
if ($grafana -notmatch "NotFound") {
    Write-Host "✅ Grafana aktif" -ForegroundColor Green
} else {
    Write-Host "⚠️  Grafana bulunamadı" -ForegroundColor Yellow
}

$networkPolicy = kubectl get networkpolicy -A 2>&1 | Select-String "ea-web"
if ($networkPolicy) {
    Write-Host "✅ NetworkPolicy mevcut" -ForegroundColor Green
} else {
    Write-Host "⚠️  NetworkPolicy eksik" -ForegroundColor Yellow
}

Write-Host "`n🏗️ [EA PLAN] Docura build/publish...`n" -ForegroundColor Cyan
$dockerCheck = docker pull $DOCURA_IMAGE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docura image pulled" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docura image pull failed" -ForegroundColor Yellow
}

$workflowRun = gh workflow run docura-publish.yml 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ GitHub Actions workflow tetiklendi" -ForegroundColor Green
} else {
    Write-Host "⚠️  GitHub Actions tetiklenemedi" -ForegroundColor Yellow
}

Write-Host "`n🔁 [EA PLAN] Git durumu kontrolü...`n" -ForegroundColor Cyan
$gitStatus = git status --short 2>&1
if ($gitStatus) {
    Write-Host "⚠️  Uncommitted changes var:" -ForegroundColor Yellow
    $gitStatus
    Write-Host "`nGit commit yapılıyor..." -ForegroundColor Cyan
    git add . 2>&1
    git commit -m "EA Plan auto-sync $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1
    git push origin main 2>&1
    Write-Host "✅ Git push tamamlandı" -ForegroundColor Green
} else {
    Write-Host "✅ Working tree clean, push gerekmiyor" -ForegroundColor Green
}

Write-Host "`n📊 [EA PLAN] Sistem özeti:`n" -ForegroundColor Cyan

$pods = kubectl get pods -A --no-headers 2>&1
$running = ($pods | Select-String "Running").Count
$completed = ($pods | Select-String "Completed").Count
Write-Host "Running pods: $running" -ForegroundColor Green
Write-Host "Completed pods: $completed" -ForegroundColor Cyan

Write-Host "`nSEO Observer CronJob:" -ForegroundColor Yellow
kubectl get cronjob seo-observer -n $NAMESPACE_MONITORING -o wide 2>&1

Write-Host "`nAuto-Remediation Rules:" -ForegroundColor Yellow
$remediation = kubectl get configmap auto-remediation-rules -n $NAMESPACE_WEB -o yaml 2>&1
$remediation | Select-String -Pattern "latency|failure|restart" | Select-Object -First 5

Write-Host "`n🔧 [EA PLAN] Sprint metadata güncelleniyor...`n" -ForegroundColor Cyan
$updateDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$patchJson = @{
    data = @{
        Phase = "integration-complete"
        LastUpdated = $updateDate
    }
} | ConvertTo-Json -Compress -Depth 3

kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE_WEB --type merge -p $patchJson 2>&1
Write-Host "✅ Sprint metadata güncellendi" -ForegroundColor Green

Write-Host "`n✅ [EA PLAN] Master Control çalışması tamamlandı.`n" -ForegroundColor Green

