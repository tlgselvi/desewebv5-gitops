#!/bin/bash
# deploy-intelligence-phase.sh

set -euo pipefail

echo "🧠 Starting EA Plan v6.0 Intelligence Phase Deployment"

# Step 1: Setup AI Infrastructure
echo "⚙️  Step 1/6: Setting up AI infrastructure..."
bash scripts/setup-ai-infrastructure.sh
echo "✅ AI infrastructure setup complete."

# Step 2: Deploy AI Services
echo "🤖 Step 2/6: Deploying AI services..."
kubectl apply -f ai-services/k8s/ai-services-deployment.yaml
echo "✅ AI services deployed."

# Step 3: Setup AI Gateway
echo "🌐 Step 3/6: Setting up AI Gateway..."
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-gateway
  namespace: ai-services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-gateway
  template:
    metadata:
      labels:
        app: ai-gateway
    spec:
      containers:
      - name: ai-gateway
        image: kong:latest
        ports:
        - containerPort: 8000
        - containerPort: 8001
        env:
        - name: KONG_DATABASE
          value: "off"
        - name: KONG_DECLARATIVE_CONFIG
          value: "/kong/declarative/kong.yml"
        volumeMounts:
        - name: kong-config
          mountPath: /kong/declarative
      volumes:
      - name: kong-config
        configMap:
          name: ai-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: ai-gateway
  namespace: ai-services
spec:
  selector:
    app: ai-gateway
  ports:
    - name: proxy
      port: 8000
      targetPort: 8000
    - name: admin
      port: 8001
      targetPort: 8001
EOF
echo "✅ AI Gateway deployed."

# Step 4: Setup AI Monitoring
echo "📊 Step 4/6: Setting up AI monitoring..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ai-monitoring-rules
  namespace: monitoring-prod
data:
  ai-rules.yaml: |
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
          description: "AI model {{ \$labels.model_name }} has accuracy {{ \$value }} which is below 95%"
      - alert: AIInferenceLatencyHigh
        expr: ai_inference_latency_seconds > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AI inference latency is too high"
          description: "AI service {{ \$labels.service }} has latency {{ \$value }}s which exceeds 100ms"
      - alert: AIServiceDown
        expr: up{job=~"ai-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AI service is down"
          description: "AI service {{ \$labels.job }} is not responding"
      - alert: AIGPUUtilizationHigh
        expr: nvidia_gpu_utilization_percent > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GPU utilization is high"
          description: "GPU {{ \$labels.gpu }} utilization is {{ \$value }}%"
      - alert: AIMemoryUsageHigh
        expr: ai_service_memory_usage_percent > 85
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "AI service memory usage is high"
          description: "AI service {{ \$labels.service }} memory usage is {{ \$value }}%"
EOF
echo "✅ AI monitoring configured."

# Step 5: Setup AI Security Policies
echo "🔒 Step 5/6: Setting up AI security policies..."
kubectl apply -f - <<EOF
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: ai-service-security
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: require-ai-service-labels
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - ai-services
    validate:
      message: "AI services must have required labels"
      pattern:
        metadata:
          labels:
            app: "?*"
            version: "?*"
            tier: "intelligence"
  - name: require-ai-service-resources
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - ai-services
    validate:
      message: "AI services must have resource limits"
      pattern:
        spec:
          template:
            spec:
              containers:
              - name: "?*"
                resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
                  requests:
                    memory: "?*"
                    cpu: "?*"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-services-network-policy
  namespace: ai-services
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
    - namespaceSelector:
        matchLabels:
          name: monitoring-prod
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ai-services
    ports:
    - protocol: TCP
      port: 8000
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF
echo "✅ AI security policies implemented."

# Step 6: Validate AI Services
echo "✅ Step 6/6: Validating AI services deployment..."
echo "Checking AI services status..."

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=300s deployment/computer-vision-service -n ai-services
kubectl wait --for=condition=available --timeout=300s deployment/nlp-service -n ai-services
kubectl wait --for=condition=available --timeout=300s deployment/recommendation-engine -n ai-services
kubectl wait --for=condition=available --timeout=300s deployment/knowledge-graph -n ai-services
kubectl wait --for=condition=available --timeout=300s deployment/conversational-ai -n ai-services

echo "✅ All AI services are ready!"

# Display service status
echo ""
echo "📊 AI Services Status:"
kubectl get pods -n ai-services
echo ""
echo "🌐 AI Services Endpoints:"
kubectl get services -n ai-services

echo ""
echo "🎉 EA Plan v6.0 Intelligence Phase Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Test AI services: kubectl port-forward svc/computer-vision-service 8000:8000 -n ai-services"
echo "2. Access AI Gateway: kubectl port-forward svc/ai-gateway 8000:8000 -n ai-services"
echo "3. Monitor AI services: kubectl logs -f deployment/computer-vision-service -n ai-services"
echo "4. Check AI metrics: kubectl port-forward svc/prometheus-server 9090:80 -n monitoring-prod"
echo "5. Deploy AI models: kubectl apply -f ai-models/"
echo ""
echo "🧠 Intelligence Phase Features:"
echo "✅ Computer Vision Service (Object Detection, Image Classification, Face Recognition)"
echo "✅ NLP Service (Sentiment Analysis, Text Classification, Entity Extraction, Summarization)"
echo "✅ Recommendation Engine (Collaborative, Content-based, Hybrid Filtering)"
echo "✅ Knowledge Graph (Entity Search, Graph Query, Path Finding)"
echo "✅ Conversational AI (Chatbot, Virtual Assistant, Intent Detection)"
echo "✅ AI Gateway (Service Routing, Load Balancing, Monitoring)"
echo "✅ AI Monitoring (Model Accuracy, Inference Latency, GPU Utilization)"
echo "✅ AI Security (Network Policies, Resource Limits, Access Control)"
