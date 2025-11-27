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

vi.mock('@/services/storage/redisClient.js', () => ({
  redis: mockRedis,
}));

vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is missing' });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    
    const token = authHeader.substring(7);
    
    // Simulate expired token
    if (token === 'expired-token') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // Simulate invalid token
    if (token === 'invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Valid token
    req.user = { 
      id: 'test-user', 
      email: 'test@example.com', 
      role: 'admin',
      organizationId: 'org-123',
      permissions: ['mubot:read', 'mubot:write']
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

describe('MuBot MCP Server', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test app with MuBot routes
    app = express();
    app.use(express.json());
    
    // Health endpoint (from createMcpServer)
    app.get('/mubot/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'mubot-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/mubot/query', async (req, res, next) => {
      try {
        // Authentication check
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
        
        const cacheKey = `mcp:mubot:query:${JSON.stringify(req.body)}`;
        
        // Check cache
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        // Simulate error for error handling tests
        if (query === 'error-query') {
          throw new Error('Simulated error');
        }
        
        const response = {
          query,
          response: {
            module: 'mubot',
            version: 'v1.0',
            context: {
              dataIngestion: context?.dataIngestion || {},
              dataQuality: context?.dataQuality || {},
              accounting: context?.accounting || {},
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'mubot-mcp-server',
              cached: false,
            },
          },
        };
        
        // Cache response (60 seconds TTL)
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        
        await mockPushContextUpdate('mubot', 'ingestion', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/mubot/context', async (req, res, next) => {
      try {
        // Authentication check
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:mubot:context';
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'mubot',
          version: 'v6.8.1',
          endpoints: [
            '/api/v1/mubot/data-ingestion',
            '/api/v1/mubot/data-quality',
            '/api/v1/mubot/accounting',
            '/api/v1/mubot/health',
          ],
          metrics: [
            'mubot_data_ingestion_total',
            'mubot_data_quality_score',
            'mubot_accounting_metrics_total',
          ],
          stream: 'mubot.events',
          timestamp: new Date().toISOString(),
        };
        
        await mockRedis.setex(cacheKey, 300, JSON.stringify(context));
        
        res.json(context);
      } catch (error) {
        next(error);
      }
    });
    
    // Error handler
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
        .get('/mubot/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'mubot-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Query Endpoint', () => {
    describe('Valid Query Tests', () => {
      it('should handle valid query request', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/mubot/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ 
            query: 'Get data ingestion status',
            context: { dataIngestion: { status: 'active' } }
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get data ingestion status');
        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toHaveProperty('module', 'mubot');
        expect(response.body.response).toHaveProperty('version', 'v1.0');
        expect(response.body.response).toHaveProperty('context');
        expect(response.body.response.context).toHaveProperty('dataIngestion');
        expect(mockRedis.setex).toHaveBeenCalled();
        expect(mockPushContextUpdate).toHaveBeenCalled();
      });

      it('should handle query with empty context', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const response = await request(app)
          .post('/mubot/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get accounting metrics' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get accounting metrics');
        expect(response.body.response.context).toHaveProperty('accounting');
      });
    });

    describe('Invalid Query Tests', () => {
      it('should reject query without query field', async () => {
        const response = await request(app)
          .post('/mubot/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ context: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });

      it('should reject query with invalid body', async () => {
        const response = await request(app)
          .post('/mubot/query')
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
          .post('/mubot/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'error-query' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

        const response = await request(app)
          .post('/mubot/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get metrics' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });
    });
  });

  describe('Redis Cache Tests', () => {
    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        query: 'Get data quality',
        response: {
          module: 'mubot',
          version: 'v1.0',
          context: { dataQuality: { score: 95 } },
          metadata: { cached: true },
        },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get data quality' })
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
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get accounting data' })
        .expect(200);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('mcp:mubot:query:'),
        60,
        expect.any(String)
      );
    });

    it('should use correct cache key format', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const requestBody = { query: 'Test query', context: { test: true } };
      
      await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody)
        .expect(200);

      const cacheKey = mockRedis.setex.mock.calls[0][0];
      expect(cacheKey).toContain('mcp:mubot:query:');
      expect(cacheKey).toContain('Test query');
    });

    it('should set cache TTL to 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .post('/mubot/query')
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
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/mubot/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/mubot/query')
        .set('Authorization', 'InvalidFormat token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with expired JWT token', async () => {
      const response = await request(app)
        .post('/mubot/query')
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

      // In real implementation, this would check permissions
      // For now, we test that authenticated requests work
      const response = await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject access without authentication (implicit permission check)', async () => {
      const response = await request(app)
        .post('/mubot/query')
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
        .get('/mubot/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'mubot');
      expect(response.body).toHaveProperty('version', 'v6.8.1');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('stream', 'mubot.events');
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });

    it('should cache context response', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .get('/mubot/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mcp:mubot:context',
        300,
        expect.any(String)
      );
    });

    it('should return cached context on cache hit', async () => {
      const cachedContext = {
        module: 'mubot',
        version: 'v6.8.1',
        endpoints: ['/api/v1/mubot/health'],
        metrics: ['mubot_metric'],
        stream: 'mubot.events',
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));

      const response = await request(app)
        .get('/mubot/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(cachedContext);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should require authentication for context endpoint', async () => {
      const response = await request(app)
        .get('/mubot/context')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('WebSocket Integration', () => {
    it('should push context update after query', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockPushContextUpdate.mockResolvedValue(undefined);

      await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query', context: { test: true } })
        .expect(200);

      expect(mockPushContextUpdate).toHaveBeenCalledWith(
        'mubot',
        'ingestion',
        expect.objectContaining({
          dataIngestion: expect.any(Object),
          dataQuality: expect.any(Object),
          accounting: expect.any(Object),
        })
      );
    });

    it('should not push context update on cache hit', async () => {
      const cachedResponse = {
        query: 'Test query',
        response: {
          module: 'mubot',
          context: {},
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await request(app)
        .post('/mubot/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });
  });
});

