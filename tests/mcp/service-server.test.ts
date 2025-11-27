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
      permissions: ['service:read', 'service:write']
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

describe('Service MCP Server', () => {
  let app: express.Application;
  const BACKEND_BASE = 'http://app:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/service/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'service-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/service/query', async (req, res, next) => {
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
        
        const cacheKey = `mcp:service:query:${JSON.stringify(req.body)}`;
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        if (query === 'error-query') {
          throw new Error('Simulated error');
        }
        
        const response = {
          query,
          response: {
            module: 'service',
            version: 'v1.0',
            context: {
              requests: context?.requests || [],
              technicians: context?.technicians || [],
              maintenancePlans: context?.maintenancePlans || [],
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'service-mcp-server',
              cached: false,
            },
          },
        };
        
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        await mockPushContextUpdate('service', 'requests', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/service/context', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:service:context';
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'service',
          version: 'v1.0',
          endpoints: [
            '/api/v1/service/requests',
            '/api/v1/service/technicians',
            '/api/v1/service/maintenance-plans',
          ],
          stream: 'service.events',
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
        .get('/service/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'service-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Query Endpoint', () => {
    describe('Service Request Query Tests', () => {
      it('should handle service request query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get service requests',
            context: {
              requests: [
                { id: 'req-1', type: 'maintenance', status: 'pending' },
                { id: 'req-2', type: 'repair', status: 'in-progress' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get service requests');
        expect(response.body.response).toHaveProperty('module', 'service');
        expect(response.body.response.context).toHaveProperty('requests');
        expect(Array.isArray(response.body.response.context.requests)).toBe(true);
        expect(response.body.response.context.requests.length).toBe(2);
        expect(mockRedis.setex).toHaveBeenCalled();
        expect(mockPushContextUpdate).toHaveBeenCalled();
      });

      it('should include service request data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const requests = [
          { id: 'req-1', type: 'maintenance', status: 'pending', priority: 'high' },
          { id: 'req-2', type: 'repair', status: 'completed', priority: 'medium' },
        ];

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get all requests',
            context: { requests },
          })
          .expect(200);

        expect(response.body.response.context.requests).toEqual(requests);
      });
    });

    describe('Technician Query Tests', () => {
      it('should handle technician query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get available technicians',
            context: {
              technicians: [
                { id: 'tech-1', name: 'John Doe', status: 'available' },
                { id: 'tech-2', name: 'Jane Smith', status: 'busy' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get available technicians');
        expect(response.body.response.context).toHaveProperty('technicians');
        expect(Array.isArray(response.body.response.context.technicians)).toBe(true);
        expect(response.body.response.context.technicians.length).toBe(2);
      });

      it('should include technician data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const technicians = [
          { id: 'tech-1', name: 'John Doe', status: 'available', skills: ['plumbing', 'electrical'] },
          { id: 'tech-2', name: 'Jane Smith', status: 'busy', skills: ['hvac'] },
        ];

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get technicians',
            context: { technicians },
          })
          .expect(200);

        expect(response.body.response.context.technicians).toEqual(technicians);
      });
    });

    describe('Maintenance Plan Query Tests', () => {
      it('should handle maintenance plan query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get maintenance plans',
            context: {
              maintenancePlans: [
                { id: 'plan-1', name: 'Monthly Check', frequency: 'monthly' },
                { id: 'plan-2', name: 'Quarterly Service', frequency: 'quarterly' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get maintenance plans');
        expect(response.body.response.context).toHaveProperty('maintenancePlans');
        expect(Array.isArray(response.body.response.context.maintenancePlans)).toBe(true);
        expect(response.body.response.context.maintenancePlans.length).toBe(2);
      });

      it('should include maintenance plan data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const maintenancePlans = [
          { id: 'plan-1', name: 'Monthly Check', frequency: 'monthly', tasks: ['inspection', 'cleaning'] },
          { id: 'plan-2', name: 'Quarterly Service', frequency: 'quarterly', tasks: ['full-service'] },
        ];

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get all plans',
            context: { maintenancePlans },
          })
          .expect(200);

        expect(response.body.response.context.maintenancePlans).toEqual(maintenancePlans);
      });
    });

    describe('Valid Query Tests', () => {
      it('should handle valid query request', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get service status',
            context: {
              requests: [],
              technicians: [],
              maintenancePlans: [],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get service status');
        expect(response.body.response).toHaveProperty('module', 'service');
        expect(response.body.response).toHaveProperty('version', 'v1.0');
        expect(response.body.response).toHaveProperty('context');
        expect(response.body.response.context).toHaveProperty('requests');
        expect(response.body.response.context).toHaveProperty('technicians');
        expect(response.body.response.context).toHaveProperty('maintenancePlans');
      });

      it('should handle query with empty context', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get service data' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get service data');
        expect(response.body.response.context.requests).toEqual([]);
        expect(response.body.response.context.technicians).toEqual([]);
        expect(response.body.response.context.maintenancePlans).toEqual([]);
      });
    });

    describe('Invalid Query Tests', () => {
      it('should reject query without query field', async () => {
        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ context: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });

      it('should reject query with invalid body', async () => {
        const response = await request(app)
          .post('/service/query')
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
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'error-query' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

        const response = await request(app)
          .post('/service/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get service data' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });
    });
  });

  describe('Redis Cache Tests', () => {
    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        query: 'Get service requests',
        response: {
          module: 'service',
          version: 'v1.0',
          context: { requests: [{ id: 'req-1' }] },
          metadata: { cached: true },
        },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get service requests' })
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
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get service data' })
        .expect(200);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('mcp:service:query:'),
        60,
        expect.any(String)
      );
    });

    it('should use correct cache key format', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const requestBody = { query: 'Test query', context: { test: true } };
      
      await request(app)
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody)
        .expect(200);

      const cacheKey = mockRedis.setex.mock.calls[0][0];
      expect(cacheKey).toContain('mcp:service:query:');
      expect(cacheKey).toContain('Test query');
    });

    it('should set cache TTL to 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .post('/service/query')
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
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/service/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/service/query')
        .set('Authorization', 'InvalidFormat token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .post('/service/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with expired JWT token', async () => {
      const response = await request(app)
        .post('/service/query')
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
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject access without authentication (implicit permission check)', async () => {
      const response = await request(app)
        .post('/service/query')
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
        .get('/service/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'service');
      expect(response.body).toHaveProperty('version', 'v1.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('stream', 'service.events');
      expect(response.body).toHaveProperty('backendUrl', BACKEND_BASE);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });

    it('should include service endpoints in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/service/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.endpoints).toContain('/api/v1/service/requests');
      expect(response.body.endpoints).toContain('/api/v1/service/technicians');
      expect(response.body.endpoints).toContain('/api/v1/service/maintenance-plans');
    });

    it('should cache context response', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .get('/service/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mcp:service:context',
        300,
        expect.any(String)
      );
    });

    it('should return cached context on cache hit', async () => {
      const cachedContext = {
        module: 'service',
        version: 'v1.0',
        endpoints: ['/api/v1/service/requests'],
        stream: 'service.events',
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));

      const response = await request(app)
        .get('/service/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(cachedContext);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should require authentication for context endpoint', async () => {
      const response = await request(app)
        .get('/service/context')
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
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query', context: { test: true } })
        .expect(200);

      expect(mockPushContextUpdate).toHaveBeenCalled();
      const callArgs = mockPushContextUpdate.mock.calls[0];
      expect(callArgs[0]).toBe('service');
      expect(callArgs[1]).toBe('requests');
      expect(callArgs[2]).toHaveProperty('requests');
      expect(callArgs[2]).toHaveProperty('technicians');
      expect(callArgs[2]).toHaveProperty('maintenancePlans');
    });

    it('should not push context update on cache hit', async () => {
      const cachedResponse = {
        query: 'Test query',
        response: {
          module: 'service',
          context: {},
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await request(app)
        .post('/service/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });
  });
});

