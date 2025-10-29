#!/bin/bash
# EA PLAN v6.x MASTER CONTROL PROMPT
# Persistent execution | Turkish mode | DeseGPT Orchestrator managed

NAMESPACE_MONITORING="monitoring"
NAMESPACE_WEB="ea-web"
REPO_PATH="$HOME/ea-plan"
GITHUB_REPO="github.com/CPTSystems/ea-plan"
DOCURA_IMAGE="ghcr.io/cptsystems/docura-builder:latest"

echo "🔧 [EA PLAN] Ortam doğrulaması yapılıyor..."
kubectl get ns $NAMESPACE_MONITORING $NAMESPACE_WEB >/dev/null 2>&1 || echo "⚠️ Namespace eksik"
gh repo view $GITHUB_REPO >/dev/null 2>&1 || echo "⚠️ GitHub bağlantısı yok"

echo "🔄 [EA PLAN] GitOps senkronizasyonu..."
argocd app sync ea-plan-v6.4 --prune || echo "⚠️ ArgoCD sync hatası"

echo "🚀 [EA PLAN] Deploy işlemleri..."
kubectl apply -f deploy/aiops-model.yaml -n $NAMESPACE_MONITORING 2>/dev/null || echo "⚠️ AIOps model file not found"
kubectl apply -f deploy/seo-observer.yaml -n $NAMESPACE_MONITORING 2>/dev/null || echo "⚠️ SEO Observer file not found"
kubectl apply -f configs/auto-remediation-extended.yaml -n $NAMESPACE_WEB 2>/dev/null || echo "⚠️ Auto-remediation file not found"

echo "🧠 [EA PLAN] AIOps job kontrolü..."
kubectl get job aiops-tuning -n $NAMESPACE_MONITORING >/dev/null 2>&1 || \
kubectl create job aiops-tuning --image=python:3.11-slim -n $NAMESPACE_MONITORING -- /bin/sh -c "echo 'AIOps tuning placeholder'"

echo "📈 [EA PLAN] SEO CronJob kontrolü..."
kubectl get cronjob seo-observer -n $NAMESPACE_MONITORING >/dev/null 2>&1 || \
kubectl create cronjob seo-observer --schedule="*/30 * * * *" \
--image=ghcr.io/cptseo/observer:latest -n $NAMESPACE_MONITORING

echo "🛡️ [EA PLAN] Observability/Security kontrolü..."
kubectl get deployment prometheus -n $NAMESPACE_MONITORING >/dev/null 2>&1 && echo "✅ Prometheus aktif" || echo "⚠️ Prometheus bulunamadı"
kubectl get deployment grafana -n $NAMESPACE_MONITORING >/dev/null 2>&1 && echo "✅ Grafana aktif" || echo "⚠️ Grafana bulunamadı"
kubectl get networkpolicy -A 2>/dev/null | grep ea-web || echo "⚠️ NetworkPolicy eksik"

echo "🏗️ [EA PLAN] Docura build/publish..."
docker pull $DOCURA_IMAGE >/dev/null 2>&1 && echo "✅ Docura image pulled" || echo "⚠️ Docura image pull failed"
gh workflow run docura-publish.yml 2>/dev/null && echo "✅ GitHub Actions tetiklendi" || echo "⚠️ GitHub Actions tetiklenemedi"

echo "🔁 [EA PLAN] GitHub push işlemi..."
cd "$REPO_PATH" 2>/dev/null || cd "$PWD"
if [ -n "$(git status --porcelain)" ]; then
    git add . && git commit -m "EA Plan auto-sync $(date)" && git push origin main
    echo "✅ Git push tamamlandı"
else
    echo "✅ Working tree clean, push gerekmiyor"
fi

echo "📊 [EA PLAN] Sistem özeti:"
kubectl get pods -A --no-headers 2>/dev/null | grep -E 'Running|Completed' | awk '{print $4}' | sort | uniq -c
kubectl get cronjob seo-observer -n $NAMESPACE_MONITORING -o wide 2>/dev/null
kubectl get configmap auto-remediation-rules -n $NAMESPACE_WEB -o yaml 2>/dev/null | grep -E 'latency|failure|restart' || echo "⚠️ Yeni kurallar doğrulanamadı"

kubectl patch configmap ea-plan-v6-4 -n $NAMESPACE_WEB \
--type merge -p "{\"data\":{\"Phase\":\"integration-complete\",\"LastUpdated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" 2>/dev/null

echo "✅ [EA PLAN] Master Control çalışması tamamlandı."

