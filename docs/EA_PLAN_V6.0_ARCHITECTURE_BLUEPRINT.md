# EA Plan v6.0 - Architecture Blueprint

## **Microservices Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EA Plan v6.0 Architecture                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐           │
│  │   Frontend      │    │   Mobile App    │    │   Admin Panel   │           │
│  │   Next.js 17    │    │   React Native  │    │   React Admin   │           │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘           │
│           │                       │                       │                   │
│           └───────────────────────┼───────────────────────┘                   │
│                                   │                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        API Gateway (Kong)                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   Auth      │ │   Rate      │ │   Load      │ │   Security  │    │   │
│  │  │   Service   │ │   Limiting  │ │   Balancing │ │   Policies  │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Microservices Layer                              │   │
│  │                                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   User      │ │   AIOps     │ │   Metrics   │ │   Alerts    │    │   │
│  │  │   Service   │ │   Engine    │ │   Service   │ │   Service   │    │   │
│  │  │   Fastify   │ │   Fastify   │ │   Fastify   │ │   Fastify   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  │                                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   ML        │ │   Remediation│ │   Dashboard │ │   Reports   │    │   │
│  │  │   Service   │ │   Service    │ │   Service   │ │   Service   │    │   │
│  │  │   Python    │ │   Fastify    │ │   Fastify   │ │   Fastify   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Event Streaming (Kafka)                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │   Metrics   │ │   Anomalies │ │   Alerts    │ │   Events    │    │   │
│  │  │   Topic     │ │   Topic     │ │   Topic     │ │   Topic     │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Data Layer                                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ PostgreSQL  │ │   Redis      │ │   InfluxDB  │ │   MinIO     │    │   │
│  │  │   Primary   │ │   Cache     │ │   Time      │ │   Object    │    │   │
│  │  │   Database  │ │   & Session │ │   Series    │ │   Storage   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Observability Stack                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ Prometheus  │ │   Grafana    │ │   Jaeger    │ │   ELK Stack  │    │   │
│  │  │   Metrics   │ │   Dashboards │ │   Tracing   │ │   Logging   │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## **API Gateway Comparison: Kong vs AWS API Gateway**

### **Kong Gateway**
```yaml
# kong-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
data:
  kong.yml: |
    _format_version: "3.0"
    
    services:
      - name: user-service
        url: http://user-service:3001
        routes:
          - name: user-routes
            paths: ["/api/v1/users"]
            methods: ["GET", "POST", "PUT", "DELETE"]
            plugins:
              - name: jwt
                config:
                  secret_is_base64: false
                  key_claim_name: iss
                  algorithm: HS256
              - name: rate-limiting
                config:
                  minute: 100
                  hour: 1000
                  
      - name: aiops-service
        url: http://aiops-service:3002
        routes:
          - name: aiops-routes
            paths: ["/api/v1/aiops"]
            methods: ["GET", "POST"]
            plugins:
              - name: jwt
              - name: cors
                config:
                  origins: ["*"]
                  methods: ["GET", "POST", "PUT", "DELETE"]
                  headers: ["Accept", "Authorization", "Content-Type"]
                  
      - name: metrics-service
        url: http://metrics-service:3003
        routes:
          - name: metrics-routes
            paths: ["/api/v1/metrics"]
            methods: ["GET", "POST"]
            plugins:
              - name: jwt
              - name: request-size-limiting
                config:
                  allowed_payload_size: 10
                  
    plugins:
      - name: prometheus
        config:
          per_consumer: true
          status_code_metrics: true
          latency_metrics: true
          bandwidth_metrics: true
          upstream_health_metrics: true
```

### **AWS API Gateway**
```yaml
# serverless.yml
service: ea-plan-v6-api-gateway

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    USER_SERVICE_URL: ${env:USER_SERVICE_URL}
    AIOPS_SERVICE_URL: ${env:AIOPS_SERVICE_URL}
    METRICS_SERVICE_URL: ${env:METRICS_SERVICE_URL}

functions:
  api:
    handler: src/handler.api
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
          authorizer:
            name: jwtAuthorizer
            type: COGNITO_USER_POOLS
            arn: ${env:COGNITO_USER_POOL_ARN}

plugins:
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  serverless-offline:
    httpPort: 3000
    lambdaPort: 3002
```

### **Comparison Matrix**

| Feature | Kong | AWS API Gateway | Winner |
|---------|------|----------------|--------|
| **Cost** | Open source + hosting | Pay-per-request | **Kong** |
| **Performance** | ~1ms latency | ~10ms latency | **Kong** |
| **Scalability** | Horizontal scaling | Auto-scaling | **Tie** |
| **Customization** | Highly configurable | Limited | **Kong** |
| **Cloud Integration** | Manual setup | Native AWS | **AWS** |
| **Monitoring** | Prometheus + Grafana | CloudWatch | **Kong** |
| **Security** | Plugin ecosystem | AWS IAM | **Tie** |
| **Vendor Lock-in** | None | High | **Kong** |

### **Recommendation: Kong Gateway**

**Rationale:**
1. **Cost Efficiency:** No per-request charges, only infrastructure costs
2. **Performance:** Sub-millisecond latency vs 10ms+ for AWS
3. **Flexibility:** Rich plugin ecosystem for custom requirements
4. **Vendor Independence:** Avoid AWS lock-in
5. **Monitoring:** Native Prometheus integration for observability

## **Microservice Specifications**

### **1. User Service**
```typescript
// user-service/src/index.ts
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

// Authentication middleware
fastify.addHook('preHandler', async (request, reply) => {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    request.user = decoded;
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Routes
fastify.get('/api/v1/users', async (request, reply) => {
  const users = await prisma.user.findMany();
  return { users };
});

fastify.post('/api/v1/users', async (request, reply) => {
  const user = await prisma.user.create({
    data: request.body as any
  });
  return { user };
});

fastify.listen({ port: 3001, host: '0.0.0.0' });
```

### **2. AIOps Service**
```typescript
// aiops-service/src/index.ts
import Fastify from 'fastify';
import { Kafka } from 'kafkajs';

const fastify = Fastify({ logger: true });
const kafka = new Kafka({
  clientId: 'aiops-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'aiops-group' });

// Anomaly detection endpoint
fastify.post('/api/v1/aiops/detect', async (request, reply) => {
  const { metrics } = request.body as any;
  
  // Send to Kafka for processing
  await producer.send({
    topic: 'anomalies',
    messages: [{
      key: 'anomaly-detection',
      value: JSON.stringify(metrics)
    }]
  });
  
  return { status: 'processing' };
});

// Start Kafka consumer
await consumer.subscribe({ topic: 'anomalies' });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const anomaly = JSON.parse(message.value!.toString());
    // Process anomaly detection
    console.log('Processing anomaly:', anomaly);
  }
});

fastify.listen({ port: 3002, host: '0.0.0.0' });
```

### **3. ML Service**
```python
# ml-service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tensorflow as tf
import numpy as np
import json

app = FastAPI()

# Load pre-trained model
model = tf.keras.models.load_model('/app/models/anomaly_detector.h5')

class MetricsData(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_io: float
    network_io: float
    response_time: float

@app.post("/api/v1/ml/predict")
async def predict_anomaly(metrics: MetricsData):
    try:
        # Prepare input data
        input_data = np.array([[
            metrics.cpu_usage,
            metrics.memory_usage,
            metrics.disk_io,
            metrics.network_io,
            metrics.response_time
        ]])
        
        # Make prediction
        prediction = model.predict(input_data)
        anomaly_score = float(prediction[0][0])
        
        # Determine if anomaly
        is_anomaly = anomaly_score > 0.8
        
        return {
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "confidence": float(prediction[0][1]) if len(prediction[0]) > 1 else 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3004)
```

## **Event Streaming Architecture**

### **Kafka Topics Configuration**
```yaml
# kafka-topics.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: metrics-topic
  namespace: ea-plan-v6
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000  # 7 days
    segment.ms: 86400000     # 1 day
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: anomalies-topic
  namespace: ea-plan-v6
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 2592000000  # 30 days
    segment.ms: 86400000      # 1 day
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: alerts-topic
  namespace: ea-plan-v6
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 1209600000  # 14 days
    segment.ms: 86400000      # 1 day
```

## **Data Layer Architecture**

### **PostgreSQL Schema**
```sql
-- Primary database schema
CREATE SCHEMA IF NOT EXISTS ea_plan_v6;

-- Users table
CREATE TABLE ea_plan_v6.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Metrics table
CREATE TABLE ea_plan_v6.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    tags JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Anomalies table
CREATE TABLE ea_plan_v6.anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open'
);

-- Create indexes for performance
CREATE INDEX idx_metrics_service_timestamp ON ea_plan_v6.metrics(service_name, timestamp);
CREATE INDEX idx_anomalies_status ON ea_plan_v6.anomalies(status);
CREATE INDEX idx_anomalies_detected_at ON ea_plan_v6.anomalies(detected_at);
```

### **Redis Configuration**
```yaml
# redis-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    # Performance settings
    maxmemory 2gb
    maxmemory-policy allkeys-lru
    
    # Persistence settings
    save 900 1
    save 300 10
    save 60 10000
    
    # Security settings
    requirepass ${REDIS_PASSWORD}
    
    # Logging
    loglevel notice
    logfile /var/log/redis/redis-server.log
```

## **Deployment Architecture**

### **Kubernetes Namespace**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ea-plan-v6
  labels:
    name: ea-plan-v6
    environment: production
    version: "6.0"
```

### **Service Mesh (Istio)**
```yaml
# istio-gateway.yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: ea-plan-v6-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.ea-plan-v6.local"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api.ea-plan-v6.local"
    tls:
      mode: SIMPLE
      credentialName: ea-plan-v6-tls
```

## **Security Architecture**

### **OPA Policies**
```rego
# opa-policies.rego
package ea_plan_v6.auth

# JWT token validation
default allow = false

allow {
    input.method == "GET"
    input.path = ["api", "v1", "health"]
}

allow {
    input.method == "POST"
    input.path = ["api", "v1", "auth", "login"]
}

allow {
    input.method == "GET"
    input.path = ["api", "v1", "users"]
    input.user.role == "admin"
}

allow {
    input.method == "POST"
    input.path = ["api", "v1", "aiops"]
    input.user.role in ["admin", "operator"]
}
```

### **Kyverno Policies**
```yaml
# kyverno-policies.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: ea-plan-v6-security
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
          - ea-plan-v6
    validate:
      message: "Security context is required"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: "1001"
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
```

## **Monitoring & Observability**

### **Prometheus Configuration**
```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
      - job_name: 'kong-gateway'
        static_configs:
          - targets: ['kong-gateway:8001']
      
      - job_name: 'user-service'
        static_configs:
          - targets: ['user-service:3001']
      
      - job_name: 'aiops-service'
        static_configs:
          - targets: ['aiops-service:3002']
      
      - job_name: 'metrics-service'
        static_configs:
          - targets: ['metrics-service:3003']
      
      - job_name: 'ml-service'
        static_configs:
          - targets: ['ml-service:3004']
```

## **Performance Targets**

### **Service Level Objectives (SLOs)**
- **API Gateway:** 99.9% availability, <10ms p95 latency
- **User Service:** 99.95% availability, <50ms p95 latency
- **AIOps Service:** 99.9% availability, <100ms p95 latency
- **ML Service:** 99.5% availability, <500ms p95 latency
- **Database:** 99.99% availability, <5ms p95 latency

### **Scalability Targets**
- **Concurrent Users:** 100,000+
- **API Requests:** 1M+ per minute
- **Data Processing:** 10TB+ per day
- **Anomaly Detection:** 1M+ metrics per minute

---

**Status:** ✅ **ARCHITECTURE BLUEPRINT COMPLETE**  
**Next:** Resource & Skill Planning
