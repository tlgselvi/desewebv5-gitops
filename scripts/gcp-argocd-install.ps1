#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$namespace = 'argocd'
$manifestUrl = 'https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml'

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
  Write-Error 'kubectl is required but was not found in PATH.'
}

Write-Host "Ensuring namespace '$namespace' exists..."
$namespaceExists = $false
try {
  kubectl get namespace $namespace | Out-Null
  $namespaceExists = $true
} catch {
  $namespaceExists = $false
}

if (-not $namespaceExists) {
  kubectl create namespace $namespace | Out-Null
}

try {
  kubectl wait --for=condition=Active "namespace/$namespace" --timeout=30s | Out-Null
} catch {
  Write-Warning "Namespace '$namespace' did not reach Active condition within timeout; continuing."
}

Write-Host "Applying ArgoCD stable manifest to namespace '$namespace'..."
kubectl apply -n $namespace -f $manifestUrl | Out-Null

Write-Host 'ArgoCD installation manifest applied successfully.'
