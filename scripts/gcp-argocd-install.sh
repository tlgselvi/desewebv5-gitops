#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="argocd"
MANIFEST_URL="https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required but not found in PATH" >&2
  exit 1
fi

echo "Ensuring namespace '${NAMESPACE}' exists..."
if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl create namespace "${NAMESPACE}"
fi

kubectl wait --for=condition=Active "namespace/${NAMESPACE}" --timeout=30s >/dev/null 2>&1 || true

echo "Applying ArgoCD stable manifest to namespace '${NAMESPACE}'..."
kubectl apply -n "${NAMESPACE}" -f "${MANIFEST_URL}"

echo "ArgoCD installation manifest applied successfully."
