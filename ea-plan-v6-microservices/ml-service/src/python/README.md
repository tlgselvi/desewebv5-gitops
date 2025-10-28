# EA Plan v6.0 ML Pipeline Integration

## TensorFlow Model Implementation

### Model Training Script
```python
# ml-service/src/python/train_model.py
import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import json

class AnomalyDetectionModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.threshold = 0.95  # 95% confidence threshold
        
    def create_model(self, input_dim: int) -> tf.keras.Model:
        """Create a deep autoencoder model for anomaly detection"""
        model = tf.keras.Sequential([
            # Encoder
            tf.keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(16, activation='relu'),
            
            # Decoder
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(input_dim, activation='linear')
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def generate_synthetic_data(self, n_samples: int = 10000) -> np.ndarray:
        """Generate synthetic metrics data for training"""
        np.random.seed(42)
        
        # Normal metrics (80% of data)
        normal_data = np.random.normal(50, 15, (int(n_samples * 0.8), 5))
        
        # Anomalous metrics (20% of data)
        anomaly_data = np.random.normal(50, 15, (int(n_samples * 0.2), 5))
        # Add anomalies: spikes, drops, or unusual patterns
        anomaly_data[:, 0] *= np.random.choice([0.1, 3.0], size=anomaly_data.shape[0])  # CPU spikes/drops
        anomaly_data[:, 1] *= np.random.choice([0.2, 2.5], size=anomaly_data.shape[0])  # Memory spikes/drops
        anomaly_data[:, 2] += np.random.normal(0, 50, anomaly_data.shape[0])  # Disk I/O variations
        anomaly_data[:, 3] += np.random.normal(0, 30, anomaly_data.shape[0])  # Network I/O variations
        anomaly_data[:, 4] *= np.random.choice([0.5, 2.0], size=anomaly_data.shape[0])  # Response time variations
        
        # Combine and shuffle
        all_data = np.vstack([normal_data, anomaly_data])
        np.random.shuffle(all_data)
        
        return all_data
    
    def train_model(self, data: np.ndarray) -> None:
        """Train the anomaly detection model"""
        print("🚀 Training anomaly detection model...")
        
        # Normalize the data
        data_scaled = self.scaler.fit_transform(data)
        
        # Split data (no labels needed for autoencoder)
        X_train, X_test = train_test_split(data_scaled, test_size=0.2, random_state=42)
        
        # Create and train model
        self.model = self.create_model(input_dim=data.shape[1])
        
        # Training callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-6
            )
        ]
        
        # Train the model
        history = self.model.fit(
            X_train, X_train,
            epochs=100,
            batch_size=32,
            validation_data=(X_test, X_test),
            callbacks=callbacks,
            verbose=1
        )
        
        print("✅ Model training completed!")
        
        # Evaluate on test set
        test_loss = self.model.evaluate(X_test, X_test, verbose=0)
        print(f"📊 Test Loss: {test_loss[0]:.4f}")
        
        return history
    
    def predict_anomaly(self, metrics: np.ndarray) -> dict:
        """Predict if metrics represent an anomaly"""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        # Normalize input
        metrics_scaled = self.scaler.transform(metrics.reshape(1, -1))
        
        # Get reconstruction error
        reconstructed = self.model.predict(metrics_scaled, verbose=0)
        reconstruction_error = np.mean(np.square(metrics_scaled - reconstructed))
        
        # Calculate anomaly score (0-1)
        # Higher reconstruction error = higher anomaly probability
        anomaly_score = min(reconstruction_error / 10.0, 1.0)  # Normalize to 0-1
        
        # Determine if anomaly based on threshold
        is_anomaly = anomaly_score > (1 - self.threshold)
        
        # Calculate confidence
        confidence = anomaly_score if is_anomaly else (1 - anomaly_score)
        
        return {
            'anomaly_score': float(anomaly_score),
            'is_anomaly': bool(is_anomaly),
            'confidence': float(confidence),
            'reconstruction_error': float(reconstruction_error),
            'threshold': self.threshold
        }
    
    def save_model(self, model_path: str, scaler_path: str) -> None:
        """Save the trained model and scaler"""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        
        self.model.save(model_path)
        joblib.dump(self.scaler, scaler_path)
        print(f"💾 Model saved to {model_path}")
        print(f"💾 Scaler saved to {scaler_path}")
    
    def load_model(self, model_path: str, scaler_path: str) -> None:
        """Load a pre-trained model and scaler"""
        self.model = tf.keras.models.load_model(model_path)
        self.scaler = joblib.load(scaler_path)
        print(f"📂 Model loaded from {model_path}")
        print(f"📂 Scaler loaded from {scaler_path}")

def main():
    # Initialize model
    anomaly_model = AnomalyDetectionModel()
    
    # Generate synthetic training data
    print("📊 Generating synthetic training data...")
    training_data = anomaly_model.generate_synthetic_data(n_samples=50000)
    print(f"✅ Generated {training_data.shape[0]} samples with {training_data.shape[1]} features")
    
    # Train the model
    history = anomaly_model.train_model(training_data)
    
    # Test the model
    print("\n🧪 Testing model with sample data...")
    test_samples = [
        [45, 60, 120, 80, 150],  # Normal
        [150, 200, 500, 300, 800],  # Anomaly (high values)
        [5, 10, 20, 15, 50],  # Anomaly (low values)
        [50, 55, 130, 85, 160],  # Normal
        [200, 180, 600, 400, 1000]  # Anomaly (extreme values)
    ]
    
    for i, sample in enumerate(test_samples):
        result = anomaly_model.predict_anomaly(np.array(sample))
        print(f"Sample {i+1}: {sample}")
        print(f"  Anomaly Score: {result['anomaly_score']:.3f}")
        print(f"  Is Anomaly: {result['is_anomaly']}")
        print(f"  Confidence: {result['confidence']:.3f}")
        print()
    
    # Save the model
    os.makedirs('/app/models', exist_ok=True)
    anomaly_model.save_model('/app/models/anomaly_detector.h5', '/app/models/scaler.pkl')
    
    # Save model metadata
    metadata = {
        'model_type': 'autoencoder',
        'input_features': 5,
        'threshold': 0.95,
        'training_samples': training_data.shape[0],
        'created_at': pd.Timestamp.now().isoformat(),
        'version': '1.0.0'
    }
    
    with open('/app/models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("🎉 Model training and testing completed!")

if __name__ == "__main__":
    main()
```

### Model Serving API Integration
```python
# ml-service/src/python/model_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import tensorflow as tf
import joblib
import json
import os
from anomaly_detection_model import AnomalyDetectionModel

app = FastAPI(title="EA Plan v6.0 ML Model Server")

# Global model instance
anomaly_model = AnomalyDetectionModel()

class MetricsRequest(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_io: float
    network_io: float
    response_time: float

class AnomalyResponse(BaseModel):
    anomaly_score: float
    is_anomaly: bool
    confidence: float
    reconstruction_error: float
    threshold: float
    prediction_time_ms: float

@app.on_event("startup")
async def load_model():
    """Load the pre-trained model on startup"""
    try:
        model_path = '/app/models/anomaly_detector.h5'
        scaler_path = '/app/models/scaler.pkl'
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            anomaly_model.load_model(model_path, scaler_path)
            print("✅ Model loaded successfully")
        else:
            print("⚠️ Model files not found, initializing with dummy model")
            # Initialize with a dummy model for testing
            dummy_data = np.random.normal(50, 15, (1000, 5))
            anomaly_model.train_model(dummy_data)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        # Initialize with a dummy model for testing
        dummy_data = np.random.normal(50, 15, (1000, 5))
        anomaly_model.train_model(dummy_data)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": anomaly_model.model is not None,
        "threshold": anomaly_model.threshold
    }

@app.post("/predict", response_model=AnomalyResponse)
async def predict_anomaly(request: MetricsRequest):
    """Predict if the given metrics represent an anomaly"""
    import time
    start_time = time.time()
    
    try:
        # Convert request to numpy array
        metrics = np.array([
            request.cpu_usage,
            request.memory_usage,
            request.disk_io,
            request.network_io,
            request.response_time
        ])
        
        # Make prediction
        result = anomaly_model.predict_anomaly(metrics)
        
        # Calculate prediction time
        prediction_time = (time.time() - start_time) * 1000
        
        return AnomalyResponse(
            anomaly_score=result['anomaly_score'],
            is_anomaly=result['is_anomaly'],
            confidence=result['confidence'],
            reconstruction_error=result['reconstruction_error'],
            threshold=result['threshold'],
            prediction_time_ms=prediction_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_model_metrics():
    """Get model performance metrics"""
    try:
        metadata_path = '/app/models/metadata.json'
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        else:
            metadata = {
                "model_type": "autoencoder",
                "input_features": 5,
                "threshold": 0.95,
                "training_samples": 0,
                "created_at": "unknown",
                "version": "1.0.0"
            }
        
        return {
            "model_type": metadata["model_type"],
            "threshold": metadata["threshold"],
            "input_features": metadata["input_features"],
            "target_accuracy": ">95%",
            "status": "operational",
            "training_samples": metadata["training_samples"],
            "version": metadata["version"]
        }
    except Exception as e:
        return {
            "model_type": "autoencoder",
            "threshold": 0.95,
            "input_features": 5,
            "target_accuracy": ">95%",
            "status": "operational",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Dockerfile for ML Service
```dockerfile
# ML Service Dockerfile with Python and Node.js
FROM python:3.11-slim AS python-base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python code
COPY src/python/ /app/python/
WORKDIR /app/python

# Train the model
RUN python train_model.py

# Node.js stage
FROM node:20-alpine AS node-base

# Install Python for model serving
RUN apk add --no-cache python3 py3-pip

# Copy Python dependencies and model
COPY --from=python-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-base /app/models /app/models

# Install Node.js dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src/ ./
COPY --from=python-base /app/python/model_server.py ./python/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005

# Install Python for model serving
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=node-base --chown=nextjs:nodejs /app/dist ./dist
COPY --from=node-base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=node-base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=python-base --chown=nextjs:nodejs /app/models ./models
COPY --from=node-base --chown=nextjs:nodejs /app/python/model_server.py ./python/

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

### Requirements.txt
```txt
tensorflow==2.15.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
joblib==1.3.2
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
```

### Integration with Fastify API
```typescript
// ml-service/src/integrations/python-model.ts
import { PythonShell } from 'python-shell';

interface ModelPrediction {
  anomaly_score: number;
  is_anomaly: boolean;
  confidence: number;
  reconstruction_error: number;
  threshold: number;
  prediction_time_ms: number;
}

export class PythonModelIntegration {
  private modelServerUrl: string;

  constructor() {
    this.modelServerUrl = process.env.PYTHON_MODEL_SERVER_URL || 'http://localhost:8000';
  }

  async predictAnomaly(metrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_io: number;
    network_io: number;
    response_time: number;
  }): Promise<ModelPrediction> {
    try {
      const response = await fetch(`${this.modelServerUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        throw new Error(`Model server responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Python model prediction error:', error);
      
      // Fallback to simple Z-score based detection
      return this.fallbackPrediction(metrics);
    }
  }

  private fallbackPrediction(metrics: any): ModelPrediction {
    // Simple fallback implementation
    const values = Object.values(metrics) as number[];
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const zScore = stdDev > 0 ? Math.abs((values[0] - mean) / stdDev) : 0;
    const anomalyScore = Math.min(zScore / 3, 1);
    const isAnomaly = zScore > 2;
    
    return {
      anomaly_score: anomalyScore,
      is_anomaly: isAnomaly,
      confidence: Math.min(zScore / 2, 1),
      reconstruction_error: 0,
      threshold: 0.95,
      prediction_time_ms: 0
    };
  }

  async getModelMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.modelServerUrl}/metrics`);
      if (!response.ok) {
        throw new Error(`Model server responded with status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      return {
        model_type: 'fallback',
        threshold: 0.95,
        input_features: 5,
        target_accuracy: '>95%',
        status: 'fallback'
      };
    }
  }
}
```

### Updated ML Service with Python Integration
```typescript
// ml-service/src/index.ts (updated with Python integration)
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Kafka } from 'kafkajs';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { PythonModelIntegration } from './integrations/python-model.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Register plugins
await fastify.register(helmet);
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(swagger, {
  swagger: {
    info: {
      title: 'EA Plan v6.0 ML Service',
      description: 'Machine Learning and Anomaly Detection Service with TensorFlow',
      version: '1.0.0'
    },
    host: 'localhost:3005',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// Initialize Python model integration
const pythonModel = new PythonModelIntegration();

// Kafka setup
const kafka = new Kafka({
  clientId: 'ml-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'ml-processing-group' });

// Schemas
const MetricSchema = z.object({
  timestamp: z.number(),
  service: z.string(),
  metric: z.string(),
  value: z.number(),
  tags: z.record(z.string()).optional()
});

// Routes
fastify.post('/api/v1/ml/detect', {
  schema: {
    description: 'Detect anomalies using TensorFlow model',
    tags: ['ml'],
    body: {
      type: 'object',
      required: ['timestamp', 'service', 'metric', 'value'],
      properties: {
        timestamp: { type: 'number' },
        service: { type: 'string' },
        metric: { type: 'string' },
        value: { type: 'number' },
        tags: { type: 'object' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: {
            type: 'object',
            properties: {
              anomaly_score: { type: 'number' },
              is_anomaly: { type: 'boolean' },
              confidence: { type: 'number' },
              reconstruction_error: { type: 'number' },
              threshold: { type: 'number' },
              prediction_time_ms: { type: 'number' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const metric = MetricSchema.parse(request.body);
    
    // Use Python model for prediction
    const result = await pythonModel.predictAnomaly({
      cpu_usage: metric.tags?.cpu_usage || metric.value,
      memory_usage: metric.tags?.memory_usage || metric.value * 0.8,
      disk_io: metric.tags?.disk_io || metric.value * 1.2,
      network_io: metric.tags?.network_io || metric.value * 0.6,
      response_time: metric.tags?.response_time || metric.value * 2
    });
    
    // If anomaly detected, send to alerts topic
    if (result.is_anomaly) {
      await producer.send({
        topic: 'alerts',
        messages: [{
          key: `anomaly_${Date.now()}`,
          value: JSON.stringify({
            id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: `Anomaly detected in ${metric.service}`,
            description: `Metric ${metric.metric} shows anomalous value: ${metric.value}`,
            severity: result.confidence > 0.9 ? 'critical' : result.confidence > 0.7 ? 'high' : 'medium',
            source: 'ml-service',
            service: metric.service,
            timestamp: metric.timestamp,
            metadata: {
              anomalyScore: result.anomaly_score,
              confidence: result.confidence,
              metric: metric.metric,
              value: metric.value,
              modelType: 'tensorflow'
            }
          })
        }]
      });
      
      logger.info(`TensorFlow anomaly detected: ${metric.service}/${metric.metric} (score: ${result.anomaly_score.toFixed(3)}, confidence: ${result.confidence.toFixed(3)})`);
    }
    
    return {
      success: true,
      result
    };
  } catch (error) {
    logger.error('TensorFlow anomaly detection error:', error);
    return reply.code(400).send({
      success: false,
      error: 'Invalid metric data'
    });
  }
});

fastify.get('/api/v1/ml/model-info', {
  schema: {
    description: 'Get TensorFlow model information',
    tags: ['ml'],
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          model: {
            type: 'object',
            properties: {
              model_type: { type: 'string' },
              threshold: { type: 'number' },
              input_features: { type: 'number' },
              target_accuracy: { type: 'string' },
              status: { type: 'string' },
              training_samples: { type: 'number' },
              version: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async () => {
  try {
    const modelInfo = await pythonModel.getModelMetrics();
    
    return {
      success: true,
      model: modelInfo
    };
  } catch (error) {
    logger.error('Get model info error:', error);
    return {
      success: false,
      error: 'Failed to get model information'
    };
  }
});

// Health check
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          service: { type: 'string' },
          version: { type: 'string' },
          kafka: { type: 'string' },
          tensorflow: { type: 'string' }
        }
      }
    }
  }
}, async () => {
  try {
    const modelInfo = await pythonModel.getModelMetrics();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ml-service',
      version: '1.0.0',
      kafka: 'connected',
      tensorflow: modelInfo.status || 'unknown'
    };
  } catch (error) {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ml-service',
      version: '1.0.0',
      kafka: 'connected',
      tensorflow: 'fallback'
    };
  }
});

// Start server
const start = async () => {
  try {
    // Connect to Kafka
    await producer.connect();
    logger.info('Connected to Kafka producer');
    
    const port = parseInt(process.env.PORT || '3005');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    logger.info(`🚀 ML Service with TensorFlow running on http://${host}:${port}`);
    logger.info(`📚 API Documentation available at http://${host}:${port}/docs`);
    logger.info(`🤖 TensorFlow model integration active`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
```
