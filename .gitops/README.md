# GitOps Repository Structure

This directory contains GitOps configurations for dese-ea-plan-v5.

## Directory Structure

```
.gitops/
├── applications/
│   └── argocd-application.yaml   # ArgoCD application definitions
├── README.md                      # This file
└── ...
```

## Applications

### Production Application

**File**: `applications/argocd-application.yaml`

- **Name**: dese-ea-plan-v5
- **Source**: GitHub repository (main branch)
- **Target**: Kubernetes cluster
- **Sync Policy**: Automated with self-heal
- **Health Checks**: Service + Deployment

### Staging Application

- **Name**: dese-ea-plan-v5-staging
- **Source**: GitHub repository (dev branch)
- **Target**: Kubernetes cluster
- **Sync Policy**: Automated with prune

## Setup ArgoCD

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at https://localhost:8080
# Username: admin
# Password: <from above>
```

## Apply Applications

```bash
kubectl apply -f applications/argocd-application.yaml
```

## Sync Applications

ArgoCD will automatically sync applications based on the defined sync policy, or you can manually sync:

```bash
argocd app sync dese-ea-plan-v5
argocd app sync dese-ea-plan-v5-staging
```

## Monitor Applications

```bash
# Watch application status
argocd app get dese-ea-plan-v5

# Get application logs
argocd app logs dese-ea-plan-v5

# Get application history
argocd app history dese-ea-plan-v5
```

