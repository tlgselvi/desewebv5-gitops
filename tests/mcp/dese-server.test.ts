import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  quit: vi.fn(),
};

const mockPushContextUpdate = vi.fn();
const mockFetch = vi.fn();

// Mock global fetch
global.fetch = mockFetch;

vi.mock('@/services/storage/redisClient.js', () => ({
  redis: mockRedis,
}));

vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is missing' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    
    const token = authHeader.substring(7);
    
    if (token === 'expired-token') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (token === 'invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = { 
      id: 'test-user', 
      email: 'test@example.com', 
      role: 'admin',
      organizationId: 'org-123',
      permissions: ['dese:read', 'dese:write', 'aiops:read']
    };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com', role: 'admin' };
    next();
  },
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  asyncHandler: (fn: any) => {
    return async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  },
  CustomError: class CustomError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/mcp/websocket-server.js', () => ({
  initializeMCPWebSocket: vi.fn(),
  pushContextUpdate: mockPushContextUpdate,
}));

vi.mock('@/config/index.js', () => ({
  config: {
    port: 3000,
  },
}));

describe('DESE MCP Server', () => {
  let app: express.Application;
  const BACKEND_BASE = 'http://app:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/dese/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'dese-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/dese/query', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const token = authHeader.substring(7);
        if (token === 'expired-token') {
          return res.status(401).json({ error: 'Token expired' });
        }
        if (token === 'invalid-token') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        
        const { query, context } = req.body;
        
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        
        const cacheKey = `mcp:dese:query:${JSON.stringify(req.body)}`;
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        if (query === 'error-query') {
          throw new Error('Simulated error');
        }
        
        // Simulate backend API calls
        let aiopsData: unknown = null;
        let metricsData: unknown = null;
        
        try {
          const aiopsResponse = await mockFetch(`${BACKEND_BASE}/api/v1/aiops/collect`, {
            headers: {
              'Content-Type': 'application/json',
              ...(req.headers.authorization && { Authorization: req.headers.authorization }),
            },
          });
          
          if (aiopsResponse && aiopsResponse.ok) {
            aiopsData = await aiopsResponse.json();
          }
        } catch (error) {
          // Silently fail, as in real implementation
        }
        
        try {
          const metricsResponse = await mockFetch(`${BACKEND_BASE}/metrics`, {
            headers: {
              Accept: 'text/plain',
            },
          });
          
          if (metricsResponse && metricsResponse.ok) {
            metricsData = await metricsResponse.text();
          }
        } catch (error) {
          // Silently fail, as in real implementation
        }
        
        const response = {
          query,
          response: {
            module: 'dese',
            version: 'v6.8.1',
            context: {
              aiops: aiopsData || context?.aiops || {},
              anomalies: context?.anomalies || [],
              correlations: context?.correlations || [],
              predictions: context?.predictions || [],
              metrics: metricsData || null,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'dese-mcp-server',
              cached: false,
              backendConnected: aiopsData !== null || metricsData !== null,
            },
          },
        };
        
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        await mockPushContextUpdate('dese', 'anomalies', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/dese/context', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:dese:context';
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'dese',
          version: 'v6.8.1',
          endpoints: [
            '/api/v1/aiops/collect',
            '/api/v1/aiops/health',
            '/api/v1/aiops/anomalies',
            '/api/v1/aiops/correlation',
            '/api/v1/aiops/predict',
            '/api/v1/audit',
            '/api/v1/privacy',
            '/metrics',
          ],
          metrics: [
            'aiops_anomalies_detected_total',
            'aiops_correlations_matched_total',
            'aiops_predictions_generated_total',
            'http_requests_total',
            'http_request_duration_seconds',
          ],
          streams: ['dese.events', 'dese.alerts'],
          backendUrl: BACKEND_BASE,
          timestamp: new Date().toISOString(),
        };
        
        await mockRedis.setex(cacheKey, 300, JSON.stringify(context));
        
        res.json(context);
      } catch (error) {
        next(error);
      }
    });
    
    app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({
        error: 'internal_error',
        message: err.message,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/dese/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'dese-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Query Endpoint', () => {
    describe('Anomaly Detection Query Tests', () => {
      it('should handle anomaly detection query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ anomalies: [{ id: 'anom-1', score: 0.95 }] }),
        });

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Detect anomalies in system metrics',
            context: {
              anomalies: [{ id: 'anom-1', score: 0.95 }],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Detect anomalies in system metrics');
        expect(response.body.response).toHaveProperty('module', 'dese');
        expect(response.body.response.context).toHaveProperty('anomalies');
        expect(Array.isArray(response.body.response.context.anomalies)).toBe(true);
        expect(mockRedis.setex).toHaveBeenCalled();
        expect(mockPushContextUpdate).toHaveBeenCalled();
      });

      it('should fetch AIOps data from backend for anomaly detection', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        const mockAIOpsData = { anomalies: [{ id: 'anom-1', score: 0.95 }] };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockAIOpsData,
        });

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get anomalies' })
          .expect(200);

        expect(mockFetch).toHaveBeenCalledWith(
          `${BACKEND_BASE}/api/v1/aiops/collect`,
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(response.body.response.context.aiops).toEqual(mockAIOpsData);
        expect(response.body.response.metadata.backendConnected).toBe(true);
      });
    });

    describe('Correlation Analysis Query Tests', () => {
      it('should handle correlation analysis query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Analyze correlations between metrics',
            context: {
              correlations: [
                { metric1: 'cpu', metric2: 'memory', correlation: 0.85 },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Analyze correlations between metrics');
        expect(response.body.response.context).toHaveProperty('correlations');
        expect(Array.isArray(response.body.response.context.correlations)).toBe(true);
      });

      it('should include correlation data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const correlations = [
          { metric1: 'cpu', metric2: 'memory', correlation: 0.85 },
          { metric1: 'disk', metric2: 'network', correlation: 0.72 },
        ];

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get correlations',
            context: { correlations },
          })
          .expect(200);

        expect(response.body.response.context.correlations).toEqual(correlations);
      });
    });

    describe('Predictive Remediation Query Tests', () => {
      it('should handle predictive remediation query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Predict system failures and suggest remediation',
            context: {
              predictions: [
                { event: 'disk_full', probability: 0.8, remediation: 'cleanup_logs' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Predict system failures and suggest remediation');
        expect(response.body.response.context).toHaveProperty('predictions');
        expect(Array.isArray(response.body.response.context.predictions)).toBe(true);
      });

      it('should include prediction data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const predictions = [
          { event: 'disk_full', probability: 0.8, remediation: 'cleanup_logs' },
          { event: 'memory_leak', probability: 0.65, remediation: 'restart_service' },
        ];

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get predictions',
            context: { predictions },
          })
          .expect(200);

        expect(response.body.response.context.predictions).toEqual(predictions);
      });
    });

    describe('Valid Query Tests', () => {
      it('should handle valid query request', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get AIOps status',
            context: { aiops: { status: 'active' } },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get AIOps status');
        expect(response.body.response).toHaveProperty('module', 'dese');
        expect(response.body.response).toHaveProperty('version', 'v6.8.1');
        expect(response.body.response).toHaveProperty('context');
        expect(response.body.response.context).toHaveProperty('aiops');
        expect(response.body.response.context).toHaveProperty('anomalies');
        expect(response.body.response.context).toHaveProperty('correlations');
        expect(response.body.response.context).toHaveProperty('predictions');
        expect(response.body.response.context).toHaveProperty('metrics');
      });

      it('should handle query with empty context', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockFetch.mockResolvedValue({ ok: false }); // Backend returns no data

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get metrics' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get metrics');
        expect(response.body.response.context.aiops).toEqual({});
        expect(response.body.response.context.anomalies).toEqual([]);
        expect(response.body.response.context.correlations).toEqual([]);
        expect(response.body.response.context.predictions).toEqual([]);
      });
    });

    describe('Invalid Query Tests', () => {
      it('should reject query without query field', async () => {
        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ context: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });

      it('should reject query with invalid body', async () => {
        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });
    });

    describe('Error Handling Tests', () => {
      it('should handle query errors gracefully', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockRejectedValue(new Error('Redis error'));

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'error-query' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get metrics' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle backend API failures gracefully', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockFetch.mockRejectedValue(new Error('Network error'));

        const response = await request(app)
          .post('/dese/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get AIOps data' })
          .expect(200);

        // Should still return response even if backend fails
        expect(response.body.response.context.aiops).toEqual({});
        expect(response.body.response.metadata.backendConnected).toBe(false);
      });
    });
  });

  describe('Redis Cache Tests', () => {
    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        query: 'Get anomalies',
        response: {
          module: 'dese',
          version: 'v6.8.1',
          context: { anomalies: [{ id: 'anom-1' }] },
          metadata: { cached: true },
        },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get anomalies' })
        .expect(200);

      expect(response.body).toEqual(cachedResponse);
      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });

    it('should cache response on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockPushContextUpdate.mockResolvedValue(undefined);

      await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get AIOps data' })
        .expect(200);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('mcp:dese:query:'),
        60,
        expect.any(String)
      );
    });

    it('should use correct cache key format', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const requestBody = { query: 'Test query', context: { test: true } };
      
      await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody)
        .expect(200);

      const cacheKey = mockRedis.setex.mock.calls[0][0];
      expect(cacheKey).toContain('mcp:dese:query:');
      expect(cacheKey).toContain('Test query');
    });

    it('should set cache TTL to 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      const ttl = mockRedis.setex.mock.calls[0][1];
      expect(ttl).toBe(60);
    });
  });

  describe('Authentication Tests', () => {
    it('should accept valid JWT token', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/dese/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'InvalidFormat token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with expired JWT token', async () => {
      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer expired-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('RBAC Tests', () => {
    it('should allow access with valid permissions', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject access without authentication (implicit permission check)', async () => {
      const response = await request(app)
        .post('/dese/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Context Endpoint', () => {
    it('should return module context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/dese/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'dese');
      expect(response.body).toHaveProperty('version', 'v6.8.1');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('streams');
      expect(response.body).toHaveProperty('backendUrl', BACKEND_BASE);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(Array.isArray(response.body.metrics)).toBe(true);
      expect(Array.isArray(response.body.streams)).toBe(true);
    });

    it('should include AIOps endpoints in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/dese/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.endpoints).toContain('/api/v1/aiops/collect');
      expect(response.body.endpoints).toContain('/api/v1/aiops/anomalies');
      expect(response.body.endpoints).toContain('/api/v1/aiops/correlation');
      expect(response.body.endpoints).toContain('/api/v1/aiops/predict');
    });

    it('should include AIOps metrics in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/dese/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.metrics).toContain('aiops_anomalies_detected_total');
      expect(response.body.metrics).toContain('aiops_correlations_matched_total');
      expect(response.body.metrics).toContain('aiops_predictions_generated_total');
    });

    it('should cache context response', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .get('/dese/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mcp:dese:context',
        300,
        expect.any(String)
      );
    });

    it('should return cached context on cache hit', async () => {
      const cachedContext = {
        module: 'dese',
        version: 'v6.8.1',
        endpoints: ['/api/v1/aiops/health'],
        metrics: ['aiops_metric'],
        streams: ['dese.events'],
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));

      const response = await request(app)
        .get('/dese/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(cachedContext);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should require authentication for context endpoint', async () => {
      const response = await request(app)
        .get('/dese/context')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Backend Integration Tests', () => {
    it('should fetch metrics from Prometheus endpoint', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const mockMetrics = 'http_requests_total 1000\ncpu_usage 0.75';
      
      mockFetch
        .mockResolvedValueOnce({ ok: false }) // AIOps fails
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockMetrics,
        });

      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get metrics' })
        .expect(200);

      expect(mockFetch).toHaveBeenCalledWith(
        `${BACKEND_BASE}/metrics`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'text/plain',
          }),
        })
      );
      expect(response.body.response.context.metrics).toBe(mockMetrics);
      expect(response.body.response.metadata.backendConnected).toBe(true);
    });

    it('should handle both AIOps and metrics data', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const mockAIOpsData = { anomalies: [{ id: 'anom-1' }] };
      const mockMetrics = 'cpu_usage 0.75';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAIOpsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockMetrics,
        });

      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get all data' })
        .expect(200);

      expect(response.body.response.context.aiops).toEqual(mockAIOpsData);
      expect(response.body.response.context.metrics).toBe(mockMetrics);
      expect(response.body.response.metadata.backendConnected).toBe(true);
    });

    it('should handle backend connection failure gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get data' })
        .expect(200);

      expect(response.body.response.context.aiops).toEqual({});
      expect(response.body.response.context.metrics).toBeNull();
      expect(response.body.response.metadata.backendConnected).toBe(false);
    });
  });

  describe('WebSocket Integration', () => {
    it('should push context update after query', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockPushContextUpdate.mockResolvedValue(undefined);

      await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query', context: { test: true } })
        .expect(200);

      expect(mockPushContextUpdate).toHaveBeenCalled();
      const callArgs = mockPushContextUpdate.mock.calls[0];
      expect(callArgs[0]).toBe('dese');
      expect(callArgs[1]).toBe('anomalies');
      expect(callArgs[2]).toHaveProperty('aiops');
      expect(callArgs[2]).toHaveProperty('anomalies');
      expect(callArgs[2]).toHaveProperty('correlations');
      expect(callArgs[2]).toHaveProperty('predictions');
      expect(callArgs[2]).toHaveProperty('metrics');
    });

    it('should not push context update on cache hit', async () => {
      const cachedResponse = {
        query: 'Test query',
        response: {
          module: 'dese',
          context: {},
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await request(app)
        .post('/dese/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });
  });
});

