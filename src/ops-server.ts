import express from 'express';
import cors from 'cors';
import { logger } from '@/utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '5.8.0',
    service: 'dese-ea-plan-v5'
  });
});

// API health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    api: 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/v1/health',
      metrics: '/api/v1/metrics',
      aiops: '/api/v1/aiops'
    }
  });
});

// Mock AIOps metrics endpoint
app.get('/api/v1/aiops/metrics', (req, res) => {
  res.json({
    anomalyCount: 3,
    correlationAccuracy: 0.89,
    remediationSuccess: 0.92,
    avgLatency: 187,
    uptime: '99.9%',
    timestamp: new Date().toISOString()
  });
});

// Mock auth endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin') {
    res.json({
      success: true,
      user: {
        id: '1',
        username: 'admin',
        role: 'admin',
        token: 'mock-jwt-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info('Ops Mode Backend Server started', {
    port: PORT,
    healthCheck: `http://localhost:${PORT}/health`,
    apiHealth: `http://localhost:${PORT}/api/v1/health`,
    aiopsMetrics: `http://localhost:${PORT}/api/v1/aiops/metrics`,
  });
});

export default app;
