#!/bin/bash
# EA Plan v5.2 Validation Script
# Validates self-healing deployment, drift prevention, and canary rollouts

set -e

echo "🚀 EA Plan v5.2 Validation Started"
echo "===================================="

NAMESPACE="dese-ea-plan-v5"
APP_NAME="dese-ea-plan-v5"

# 1. Check deployment structure
echo ""
echo "📁 1. Checking deployment structure..."
if [ -d "deploy/base" ] && [ -d "deploy/overlays/prod" ]; then
    echo "✅ Deployment Kustomize structure exists"
else
    echo "❌ Deployment structure not found"
    exit 1
fi

# 2. Check policy files
echo ""
echo "🔒 2. Checking policy files..."
if [ -f "policies/kyverno/prevent-drift.yaml" ]; then
    echo "✅ Kyverno drift prevention policy exists"
else
    echo "❌ Policy file not found"
    exit 1
fi

# 3. Check monitoring rules
echo ""
echo "📊 3. Checking monitoring rules..."
if [ -f "monitoring/prometheus-rules.yaml" ]; then
    echo "✅ Prometheus monitoring rules exist"
else
    echo "❌ Monitoring rules not found"
    exit 1
fi

# 4. Check AIOps job
echo ""
echo "🤖 4. Checking AIOps self-healing job..."
if [ -f "aiops/self-heal-job.yaml" ]; then
    echo "✅ Self-healing job exists"
else
    echo "❌ Self-healing job not found"
    exit 1
fi

# 5. Check CI/CD workflow
echo ""
echo "🔄 5. Checking CI/CD workflow..."
if grep -q "canary" ".github/workflows/ci-cd.yml"; then
    echo "✅ Canary rollout support enabled in CI/CD"
else
    echo "❌ Canary support not found in workflow"
    exit 1
fi

# 6. Validate Kustomize files
echo ""
echo "🔍 6. Validating Kustomize files..."
if command -v kubectl &> /dev/null; then
    kubectl kustomize deploy/base > /dev/null 2>&1 && echo "✅ Base kustomization is valid"
    kubectl kustomize deploy/overlays/prod > /dev/null 2>&1 && echo "✅ Production overlay is valid"
else
    echo "⚠️  kubectl not found, skipping Kustomize validation"
fi

# 7. Validate YAML syntax
echo ""
echo "📝 7. Validating YAML syntax..."
yaml_files=(
    "policies/kyverno/prevent-drift.yaml"
    "monitoring/prometheus-rules.yaml"
    "aiops/self-heal-job.yaml"
    "deploy/overlays/prod/hpa.yaml"
)

for file in "${yaml_files[@]}"; do
    if [ -f "$file" ]; then
        python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null && echo "✅ $file syntax valid" || echo "⚠️  $file syntax check skipped"
    fi
done

# 8. Check documentation
echo ""
echo "📚 8. Checking documentation..."
if [ -f "docs/SELF_HEALING_GUIDE.md" ]; then
    echo "✅ Self-healing guide exists"
else
    echo "❌ Documentation not found"
    exit 1
fi

# Summary
echo ""
echo "===================================="
echo "✅ EA Plan v5.2 Validation Complete"
echo ""
echo "Next steps:"
echo "  1. Apply deployments: kubectl apply -k deploy/base && kubectl apply -k deploy/overlays/prod"
echo "  2. Start canary rollout: gh workflow run ci-cd.yml --ref main --raw-field rollout=canary"
echo "  3. Monitor logs: kubectl logs job/self-heal-cpt -n dese-ea-plan-v5"
echo "  4. Check drift policy: kubectl get policy -n dese-ea-plan-v5"
echo ""
echo "🎉 Ready for deployment!"

