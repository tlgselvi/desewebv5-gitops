#!/bin/bash

# =========================================================
# CI/CD Setup Script
# =========================================================

set -e

echo "🚀 Setting up CI/CD infrastructure..."

# =========================================================
# 1. GITHUB SECRETS VALIDATION
# =========================================================

echo ""
echo "=========================================="
echo "1. Validating GitHub Secrets"
echo "=========================================="

REQUIRED_SECRETS=(
  "KUBECONFIG_PRODUCTION"
  "KUBECONFIG_STAGING"
  "SLACK_WEBHOOK"
  "DOCKER_REGISTRY_TOKEN"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
  if [ -z "${!secret}" ]; then
    echo "❌ Missing secret: $secret"
    echo "Please set it in GitHub: Settings > Secrets and variables > Actions"
    exit 1
  else
    echo "✅ Secret $secret is set"
  fi
done

echo "✅ All secrets validated"

# =========================================================
# 2. INSTALL REQUIRED TOOLS
# =========================================================

echo ""
echo "=========================================="
echo "2. Installing Required Tools"
echo "=========================================="

# Install kubectl
if ! command -v kubectl &> /dev/null; then
    echo "Installing kubectl..."
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/
    echo "✅ kubectl installed"
else
    echo "✅ kubectl already installed"
fi

# Install Helm
if ! command -v helm &> /dev/null; then
    echo "Installing Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    echo "✅ Helm installed"
else
    echo "✅ Helm already installed"
fi

# Install ArgoCD CLI
if ! command -v argocd &> /dev/null; then
    echo "Installing ArgoCD CLI..."
    curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
    rm argocd-linux-amd64
    echo "✅ ArgoCD CLI installed"
else
    echo "✅ ArgoCD CLI already installed"
fi

# =========================================================
# 3. SETUP KUBERNETES CONFIGURATION
# =========================================================

echo ""
echo "=========================================="
echo "3. Configuring Kubernetes"
echo "=========================================="

# Create namespaces
echo "Creating namespaces..."
kubectl create namespace dese-ea-plan-v5 --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace dese-ea-plan-v5-staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Namespaces created"

# =========================================================
# 4. SETUP ARGOCD
# =========================================================

echo ""
echo "=========================================="
echo "4. Setting up ArgoCD"
echo "=========================================="

# Install ArgoCD
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=ready pod --all -n argocd --timeout=300s

echo "✅ ArgoCD installed"

# Get ArgoCD admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "✅ ArgoCD admin password: $ARGOCD_PASSWORD"
echo "🔐 Save this password for ArgoCD access!"

# =========================================================
# 5. SETUP MONITORING STACK
# =========================================================

echo ""
echo "=========================================="
echo "5. Setting up Monitoring Stack"
echo "=========================================="

# Apply Prometheus
kubectl apply -f prometheus-deployment.yaml
echo "✅ Prometheus deployed"

# Apply Grafana
kubectl apply -f monitoring-stack-production.yaml
echo "✅ Monitoring stack deployed"

# =========================================================
# 6. DEPLOY APPLICATION
# =========================================================

echo ""
echo "=========================================="
echo "6. Deploying Application"
echo "=========================================="

# Deploy to staging first
echo "Deploying to staging..."
helm upgrade --install dese-ea-plan-v5-staging \
  ./helm/dese-ea-plan-v5 \
  --namespace dese-ea-plan-v5-staging \
  --create-namespace \
  --wait

echo "✅ Staging deployment complete"

# =========================================================
# 7. RUN HEALTH CHECKS
# =========================================================

echo ""
echo "=========================================="
echo "7. Running Health Checks"
echo "=========================================="

# Wait for pods to be ready
echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=dese-ea-plan-v5 \
  -n dese-ea-plan-v5-staging \
  --timeout=300s

echo "✅ All pods are ready"

# =========================================================
# 8. SUMMARY
# =========================================================

echo ""
echo "=========================================="
echo "✅ CI/CD Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Access Information:"
echo "  - ArgoCD: kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "  - Username: admin"
echo "  - Password: $ARGOCD_PASSWORD"
echo ""
echo "🔗 Service URLs:"
echo "  - Staging: kubectl get svc -n dese-ea-plan-v5-staging"
echo "  - Production: kubectl get svc -n dese-ea-plan-v5"
echo ""
echo "📈 Monitoring:"
echo "  - Prometheus: kubectl port-forward svc/prometheus-service -n monitoring 9090:9090"
echo "  - Grafana: kubectl port-forward svc/grafana -n monitoring 3000:3000"
echo ""
echo "🎉 Setup complete! You can now push to trigger CI/CD pipeline."
echo ""

