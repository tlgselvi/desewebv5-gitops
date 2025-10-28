#!/bin/bash
# setup-ai-infrastructure.sh

set -euo pipefail

echo "🧠 Setting up EA Plan v6.0 AI Infrastructure"

# Create AI-specific namespaces
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ai-services
  labels:
    name: ai-services
    environment: production
    tier: intelligence
---
apiVersion: v1
kind: Namespace
metadata:
  name: ai-training
  labels:
    name: ai-training
    environment: production
    tier: intelligence
---
apiVersion: v1
kind: Namespace
metadata:
  name: ai-inference
  labels:
    name: ai-inference
    environment: production
    tier: intelligence
EOF

echo "✅ AI namespaces created"

# Install Kubeflow for ML workflows
kubectl apply -k "github.com/kubeflow/manifests/example?ref=v1.7.0"

echo "✅ Kubeflow installed"

# Install MLflow for model lifecycle management
helm repo add mlflow https://helm.mlflow.org
helm repo update
helm install mlflow mlflow/mlflow \
  --namespace ai-services \
  --create-namespace \
  --values mlflow-values.yaml

echo "✅ MLflow installed"

# Install NVIDIA GPU Operator for GPU support
kubectl create namespace gpu-operator
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace

echo "✅ NVIDIA GPU Operator installed"

# Install Seldon Core for model serving
kubectl create namespace seldon-system
helm repo add seldonio https://storage.googleapis.com/seldon-charts
helm repo update
helm install seldon-core-operator seldonio/seldon-core-operator \
  --namespace seldon-system \
  --create-namespace

echo "✅ Seldon Core installed"

# Install Feast for feature store
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: feast
  labels:
    name: feast
    environment: production
    tier: intelligence
EOF

helm repo add feast-charts https://feast-charts.storage.googleapis.com
helm repo update
helm install feast feast-charts/feast \
  --namespace feast \
  --create-namespace \
  --values feast-values.yaml

echo "✅ Feast feature store installed"

# Install Ray for distributed computing
kubectl create namespace ray-system
helm repo add ray https://ray-project.github.io/ray-helm-charts
helm repo update
helm install ray-operator ray/ray-operator \
  --namespace ray-system \
  --create-namespace

echo "✅ Ray distributed computing installed"

# Create AI Gateway configuration
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-gateway-config
  namespace: ai-services
data:
  config.yaml: |
    services:
      - name: computer-vision
        endpoint: http://computer-vision-service:8000
        models:
          - object-detection
          - image-classification
          - face-recognition
      - name: nlp-service
        endpoint: http://nlp-service:8000
        models:
          - text-classification
          - sentiment-analysis
          - named-entity-recognition
      - name: recommendation-engine
        endpoint: http://recommendation-service:8000
        models:
          - collaborative-filtering
          - content-based
          - hybrid-recommendation
      - name: anomaly-detection
        endpoint: http://anomaly-detection-service:8000
        models:
          - time-series-anomaly
          - pattern-anomaly
          - behavioral-anomaly
    routing:
      load_balancing: round_robin
      timeout: 30s
      retry_attempts: 3
    monitoring:
      metrics_enabled: true
      tracing_enabled: true
      logging_level: info
EOF

echo "✅ AI Gateway configuration created"

# Create GPU resource quotas
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ai-training
spec:
  hard:
    requests.nvidia.com/gpu: "4"
    limits.nvidia.com/gpu: "8"
    requests.memory: "32Gi"
    limits.memory: "64Gi"
    requests.cpu: "16"
    limits.cpu: "32"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ai-inference
spec:
  hard:
    requests.nvidia.com/gpu: "8"
    limits.nvidia.com/gpu: "16"
    requests.memory: "64Gi"
    limits.memory: "128Gi"
    requests.cpu: "32"
    limits.cpu: "64"
EOF

echo "✅ GPU resource quotas created"

# Create AI monitoring configuration
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-monitoring-config
  namespace: ai-services
data:
  prometheus-rules.yaml: |
    groups:
    - name: ai-services
      rules:
      - alert: AIModelAccuracyLow
        expr: ai_model_accuracy < 0.95
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI Model accuracy is below threshold"
      - alert: AIInferenceLatencyHigh
        expr: ai_inference_latency_seconds > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AI inference latency is too high"
      - alert: AIServiceDown
        expr: up{job=~"ai-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AI service is down"
EOF

echo "✅ AI monitoring configuration created"

echo "🎉 AI Infrastructure setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify GPU nodes are available: kubectl get nodes -l accelerator=nvidia-tesla-gpu"
echo "2. Check AI services status: kubectl get pods -n ai-services"
echo "3. Access MLflow UI: kubectl port-forward svc/mlflow 5000:5000 -n ai-services"
echo "4. Access Kubeflow UI: kubectl port-forward svc/istio-ingressgateway 8080:80 -n istio-system"
echo "5. Deploy AI models: kubectl apply -f ai-models/"
