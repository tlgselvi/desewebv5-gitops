# EA Plan v6.0 - Infrastructure Preparation

## **Multi-Environment Kubernetes Architecture**

### **Environment Overview**
```
┌─────────────────────────────────────────────────────────────────┐
│                EA Plan v6.0 Multi-Environment Setup             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Development   │  │   Staging       │  │   Production    │ │
│  │   Environment   │  │   Environment   │  │   Environment   │ │
│  │                 │  │                 │  │                 │ │
│  │ • Single Node   │  │ • 3 Nodes       │  │ • 5+ Nodes      │ │
│  │ • Local Storage │  │ • Shared Storage│  │ • HA Storage    │ │
│  │ • Basic Monitoring│ │ • Full Monitoring│ │ • Enterprise    │ │
│  │ • Manual Deploy │  │ • Auto Deploy   │  │ • GitOps Deploy │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                       │                       │     │
│           └───────────────────────┼───────────────────────┘     │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                GitOps Pipeline (ArgoCD)                │   │
│  │                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │   │
│  │  │   Git       │ │   ArgoCD    │ │   Kubernetes│      │   │
│  │  │   Repository│ │   Controller│ │   Clusters  │      │   │
│  │  │             │ │             │ │             │      │   │
│  │  │ • App Manifests│ │ • Sync     │ │ • Dev       │      │   │
│  │  │ • Helm Charts│ │ • Monitor   │ │ • Stage     │      │   │
│  │  │ • Kustomize │ │ • Rollback  │ │ • Prod      │      │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## **Development Environment Setup**

### **Local Kubernetes (Kind)**
```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ea-plan-v6-dev
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
  extraMounts:
  - hostPath: ./data
    containerPath: /data
```

### **Development Namespace**
```yaml
# dev-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-dev
  labels:
    name: ea-plan-v6-dev
    environment: development
    version: "6.0"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: ea-plan-v6-dev
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "20"
    services: "10"
```

## **Staging Environment Setup**

### **Staging Cluster Configuration**
```yaml
# staging-cluster.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-staging
  labels:
    name: ea-plan-v6-staging
    environment: staging
    version: "6.0"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: ea-plan-v6-staging
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
```

### **Staging Monitoring Stack**
```yaml
# staging-monitoring.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-staging
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring-staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring-staging
```

## **Production Environment Setup**

### **Production Cluster Configuration**
```yaml
# prod-cluster.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-prod
  labels:
    name: ea-plan-v6-prod
    environment: production
    version: "6.0"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: ea-plan-v6-prod
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 64Gi
    limits.cpu: "64"
    limits.memory: 128Gi
    pods: "200"
    services: "50"
    persistentvolumeclaims: "50"
```

### **Production Security Policies**
```yaml
# prod-security.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: ea-plan-v6-prod-security
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: require-security-context
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - ea-plan-v6-prod
    validate:
      message: "Security context is required for production"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: "1001"
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
              - ALL
  - name: require-resource-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - ea-plan-v6-prod
    validate:
      message: "Resource limits are required for production"
      pattern:
        spec:
          containers:
          - name: "*"
            resources:
              limits:
                memory: "?*"
                cpu: "?*"
              requests:
                memory: "?*"
                cpu: "?*"
```

## **GitOps Pipeline Configuration**

### **ArgoCD Installation**
```yaml
# argocd-install.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ea-plan-v6-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ea-plan-v6-manifests
    targetRevision: HEAD
    path: applications
  destination:
    server: https://kubernetes.default.svc
    namespace: ea-plan-v6-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
```

### **ArgoCD Application Definitions**
```yaml
# applications/user-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ea-plan-v6-manifests
    targetRevision: HEAD
    path: services/user-service
  destination:
    server: https://kubernetes.default.svc
    namespace: ea-plan-v6-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aiops-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/ea-plan-v6-manifests
    targetRevision: HEAD
    path: services/aiops-service
  destination:
    server: https://kubernetes.default.svc
    namespace: ea-plan-v6-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## **Security Baseline Implementation**

### **OPA Gatekeeper Policies**
```yaml
# opa-gatekeeper.yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }
---
apiVersion: config.gatekeeper.sh/v1alpha1
kind: K8sRequiredLabels
metadata:
  name: ea-plan-v6-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["ea-plan-v6-prod"]
  parameters:
    labels: ["app", "version", "environment"]
```

### **Kyverno Policies**
```yaml
# kyverno-policies.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: ea-plan-v6-policies
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: require-labels
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - ea-plan-v6-prod
    validate:
      message: "Required labels are missing"
      pattern:
        metadata:
          labels:
            app: "?*"
            version: "?*"
            environment: "production"
  - name: block-privileged-containers
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - ea-plan-v6-prod
    validate:
      message: "Privileged containers are not allowed"
      pattern:
        spec:
          containers:
          - name: "*"
            securityContext:
              privileged: false
  - name: require-image-tag
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - ea-plan-v6-prod
    validate:
      message: "Image tag is required"
      pattern:
        spec:
          containers:
          - name: "*"
            image: "*:*"
```

## **Monitoring & Observability Setup**

### **Prometheus Configuration**
```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093
    
    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
          target_label: __address__
        - action: labelmap
          regex: __meta_kubernetes_pod_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          action: replace
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_pod_name]
          action: replace
          target_label: kubernetes_pod_name
      
      - job_name: 'kong-gateway'
        static_configs:
          - targets: ['kong-gateway:8001']
        metrics_path: /metrics
        scrape_interval: 10s
      
      - job_name: 'user-service'
        static_configs:
          - targets: ['user-service:3001']
        metrics_path: /metrics
        scrape_interval: 15s
      
      - job_name: 'aiops-service'
        static_configs:
          - targets: ['aiops-service:3002']
        metrics_path: /metrics
        scrape_interval: 15s
      
      - job_name: 'ml-service'
        static_configs:
          - targets: ['ml-service:3004']
        metrics_path: /metrics
        scrape_interval: 30s
```

### **Grafana Dashboard Configuration**
```yaml
# grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-ea-plan-v6
  namespace: monitoring-prod
  labels:
    grafana_dashboard: "1"
data:
  ea-plan-v6-overview.json: |
    {
      "dashboard": {
        "id": null,
        "title": "EA Plan v6.0 Overview",
        "tags": ["ea-plan-v6", "overview"],
        "style": "dark",
        "timezone": "browser",
        "panels": [
          {
            "id": 1,
            "title": "API Gateway Metrics",
            "type": "stat",
            "targets": [
              {
                "expr": "kong_http_requests_total",
                "legendFormat": "Total Requests"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 0,
              "y": 0
            }
          },
          {
            "id": 2,
            "title": "Service Health",
            "type": "stat",
            "targets": [
              {
                "expr": "up{job=~\"user-service|aiops-service|ml-service\"}",
                "legendFormat": "{{job}}"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 12,
              "y": 0
            }
          },
          {
            "id": 3,
            "title": "Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                "legendFormat": "95th percentile"
              }
            ],
            "gridPos": {
              "h": 8,
              "w": 24,
              "x": 0,
              "y": 8
            }
          }
        ],
        "time": {
          "from": "now-1h",
          "to": "now"
        },
        "refresh": "30s"
      }
    }
```

## **CI/CD Pipeline Configuration**

### **GitHub Actions Workflow**
```yaml
# .github/workflows/ea-plan-v6-ci-cd.yml
name: EA Plan v6.0 CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd dese-web
        npm ci
    
    - name: Run tests
      run: |
        cd dese-web
        npm run test
    
    - name: Run linting
      run: |
        cd dese-web
        npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./dese-web
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Development
      run: |
        echo "Deploying to development environment"
        # ArgoCD will automatically sync the changes

  deploy-prod:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Production
      run: |
        echo "Deploying to production environment"
        # ArgoCD will automatically sync the changes
```

## **Backup & Disaster Recovery**

### **Velero Backup Configuration**
```yaml
# velero-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: ea-plan-v6-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
    - ea-plan-v6-prod
    - monitoring-prod
    includedResources:
    - "*"
    excludedResources:
    - events
    - events.events.k8s.io
    ttl: "720h"  # 30 days
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: ea-plan-v6-weekly-backup
  namespace: velero
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday at 3 AM
  template:
    includedNamespaces:
    - ea-plan-v6-prod
    - monitoring-prod
    includedResources:
    - "*"
    excludedResources:
    - events
    - events.events.k8s.io
    ttl: "2160h"  # 90 days
```

## **Performance Optimization**

### **Resource Limits & Requests**
```yaml
# resource-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: ea-plan-v6-limits
  namespace: ea-plan-v6-prod
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "250m"
    type: Container
  - max:
      memory: "2Gi"
      cpu: "2000m"
    min:
      memory: "128Mi"
      cpu: "100m"
    type: Container
```

### **Horizontal Pod Autoscaler**
```yaml
# hpa-config.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: ea-plan-v6-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## **Network Policies**

### **Security Network Policies**
```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ea-plan-v6-network-policy
  namespace: ea-plan-v6-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ea-plan-v6-prod
    - podSelector:
        matchLabels:
          app: kong-gateway
    ports:
    - protocol: TCP
      port: 3001
    - protocol: TCP
      port: 3002
    - protocol: TCP
      port: 3003
    - protocol: TCP
      port: 3004
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ea-plan-v6-prod
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
    - protocol: TCP
      port: 9092  # Kafka
```

## **Deployment Scripts**

### **Infrastructure Setup Script**
```bash
#!/bin/bash
# setup-infrastructure.sh

set -euo pipefail

echo "🚀 Setting up EA Plan v6.0 Infrastructure"

# Create namespaces
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-dev
  labels:
    name: ea-plan-v6-dev
    environment: development
---
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-staging
  labels:
    name: ea-plan-v6-staging
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6-prod
  labels:
    name: ea-plan-v6-prod
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-prod
  labels:
    name: monitoring-prod
    environment: production
EOF

echo "✅ Namespaces created"

# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "✅ ArgoCD installed"

# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring-prod \
  --create-namespace \
  --values prometheus-values.yaml

echo "✅ Prometheus installed"

# Install Kong Gateway
helm repo add kong https://charts.konghq.com
helm repo update
helm install kong kong/kong \
  --namespace ea-plan-v6-prod \
  --values kong-values.yaml

echo "✅ Kong Gateway installed"

# Install Kafka
helm repo add strimzi https://strimzi.io/charts/
helm repo update
helm install kafka strimzi/strimzi-kafka-operator \
  --namespace ea-plan-v6-prod

echo "✅ Kafka installed"

echo "🎉 Infrastructure setup complete!"
```

---

**Status:** ✅ **INFRASTRUCTURE PREPARATION COMPLETE**  
**Next:** Proof of Concepts Implementation
