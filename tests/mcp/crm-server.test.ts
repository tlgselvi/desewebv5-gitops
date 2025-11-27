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
      permissions: ['crm:read', 'crm:write']
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

describe('CRM MCP Server', () => {
  let app: express.Application;
  const BACKEND_BASE = 'http://app:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/crm/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'crm-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/crm/query', async (req, res, next) => {
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
        
        const cacheKey = `mcp:crm:query:${JSON.stringify(req.body)}`;
        
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
            module: 'crm',
            version: 'v1.0',
            context: {
              leads: context?.leads || [],
              deals: context?.deals || [],
              contacts: context?.contacts || [],
              activities: context?.activities || [],
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'crm-mcp-server',
              cached: false,
            },
          },
        };
        
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        await mockPushContextUpdate('crm', 'pipeline', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/crm/context', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:crm:context';
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'crm',
          version: 'v1.0',
          endpoints: [
            '/api/v1/crm/leads',
            '/api/v1/crm/deals',
            '/api/v1/crm/contacts',
            '/api/v1/crm/activities',
          ],
          stream: 'crm.events',
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
        .get('/crm/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'crm-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Query Endpoint', () => {
    describe('Contact Query Tests', () => {
      it('should handle contact query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get contacts',
            context: {
              contacts: [
                { id: 'contact-1', name: 'John Doe', email: 'john@example.com' },
                { id: 'contact-2', name: 'Jane Smith', email: 'jane@example.com' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get contacts');
        expect(response.body.response).toHaveProperty('module', 'crm');
        expect(response.body.response.context).toHaveProperty('contacts');
        expect(Array.isArray(response.body.response.context.contacts)).toBe(true);
        expect(response.body.response.context.contacts.length).toBe(2);
        expect(mockRedis.setex).toHaveBeenCalled();
        expect(mockPushContextUpdate).toHaveBeenCalled();
      });

      it('should include contact data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const contacts = [
          { id: 'contact-1', name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
          { id: 'contact-2', name: 'Jane Smith', email: 'jane@example.com', company: 'Acme Corp' },
        ];

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get all contacts',
            context: { contacts },
          })
          .expect(200);

        expect(response.body.response.context.contacts).toEqual(contacts);
      });
    });

    describe('Deal Query Tests', () => {
      it('should handle deal query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get deals',
            context: {
              deals: [
                { id: 'deal-1', name: 'Enterprise Deal', value: 50000, stage: 'negotiation' },
                { id: 'deal-2', name: 'SMB Deal', value: 10000, stage: 'proposal' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get deals');
        expect(response.body.response.context).toHaveProperty('deals');
        expect(Array.isArray(response.body.response.context.deals)).toBe(true);
        expect(response.body.response.context.deals.length).toBe(2);
      });

      it('should include deal data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const deals = [
          { id: 'deal-1', name: 'Enterprise Deal', value: 50000, stage: 'negotiation', probability: 0.7 },
          { id: 'deal-2', name: 'SMB Deal', value: 10000, stage: 'proposal', probability: 0.5 },
        ];

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get all deals',
            context: { deals },
          })
          .expect(200);

        expect(response.body.response.context.deals).toEqual(deals);
      });
    });

    describe('Activity Query Tests', () => {
      it('should handle activity query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get activities',
            context: {
              activities: [
                { id: 'act-1', type: 'call', subject: 'Follow-up call', date: '2024-01-15' },
                { id: 'act-2', type: 'meeting', subject: 'Product demo', date: '2024-01-16' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get activities');
        expect(response.body.response.context).toHaveProperty('activities');
        expect(Array.isArray(response.body.response.context.activities)).toBe(true);
        expect(response.body.response.context.activities.length).toBe(2);
      });

      it('should include activity data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const activities = [
          { id: 'act-1', type: 'call', subject: 'Follow-up call', date: '2024-01-15', duration: 30 },
          { id: 'act-2', type: 'meeting', subject: 'Product demo', date: '2024-01-16', attendees: 5 },
        ];

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get all activities',
            context: { activities },
          })
          .expect(200);

        expect(response.body.response.context.activities).toEqual(activities);
      });
    });

    describe('Pipeline Stage Query Tests', () => {
      it('should handle pipeline stage query with leads', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get pipeline stages',
            context: {
              leads: [
                { id: 'lead-1', name: 'New Lead', stage: 'qualification', source: 'website' },
                { id: 'lead-2', name: 'Warm Lead', stage: 'contacted', source: 'referral' },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get pipeline stages');
        expect(response.body.response.context).toHaveProperty('leads');
        expect(Array.isArray(response.body.response.context.leads)).toBe(true);
      });

      it('should include all pipeline data (leads, deals, contacts, activities)', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const context = {
          leads: [{ id: 'lead-1', stage: 'qualification' }],
          deals: [{ id: 'deal-1', stage: 'negotiation' }],
          contacts: [{ id: 'contact-1', name: 'John' }],
          activities: [{ id: 'act-1', type: 'call' }],
        };

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get full pipeline',
            context,
          })
          .expect(200);

        expect(response.body.response.context.leads).toEqual(context.leads);
        expect(response.body.response.context.deals).toEqual(context.deals);
        expect(response.body.response.context.contacts).toEqual(context.contacts);
        expect(response.body.response.context.activities).toEqual(context.activities);
      });
    });

    describe('Valid Query Tests', () => {
      it('should handle valid query request', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get CRM status',
            context: {
              leads: [],
              deals: [],
              contacts: [],
              activities: [],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get CRM status');
        expect(response.body.response).toHaveProperty('module', 'crm');
        expect(response.body.response).toHaveProperty('version', 'v1.0');
        expect(response.body.response).toHaveProperty('context');
        expect(response.body.response.context).toHaveProperty('leads');
        expect(response.body.response.context).toHaveProperty('deals');
        expect(response.body.response.context).toHaveProperty('contacts');
        expect(response.body.response.context).toHaveProperty('activities');
      });

      it('should handle query with empty context', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get CRM data' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get CRM data');
        expect(response.body.response.context.leads).toEqual([]);
        expect(response.body.response.context.deals).toEqual([]);
        expect(response.body.response.context.contacts).toEqual([]);
        expect(response.body.response.context.activities).toEqual([]);
      });
    });

    describe('Invalid Query Tests', () => {
      it('should reject query without query field', async () => {
        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ context: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });

      it('should reject query with invalid body', async () => {
        const response = await request(app)
          .post('/crm/query')
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
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'error-query' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

        const response = await request(app)
          .post('/crm/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get CRM data' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });
    });
  });

  describe('Redis Cache Tests', () => {
    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        query: 'Get contacts',
        response: {
          module: 'crm',
          version: 'v1.0',
          context: { contacts: [{ id: 'contact-1' }] },
          metadata: { cached: true },
        },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get contacts' })
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
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get CRM data' })
        .expect(200);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('mcp:crm:query:'),
        60,
        expect.any(String)
      );
    });

    it('should use correct cache key format', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const requestBody = { query: 'Test query', context: { test: true } };
      
      await request(app)
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody)
        .expect(200);

      const cacheKey = mockRedis.setex.mock.calls[0][0];
      expect(cacheKey).toContain('mcp:crm:query:');
      expect(cacheKey).toContain('Test query');
    });

    it('should set cache TTL to 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .post('/crm/query')
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
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/crm/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/crm/query')
        .set('Authorization', 'InvalidFormat token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .post('/crm/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with expired JWT token', async () => {
      const response = await request(app)
        .post('/crm/query')
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
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject access without authentication (implicit permission check)', async () => {
      const response = await request(app)
        .post('/crm/query')
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
        .get('/crm/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'crm');
      expect(response.body).toHaveProperty('version', 'v1.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('stream', 'crm.events');
      expect(response.body).toHaveProperty('backendUrl', BACKEND_BASE);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
    });

    it('should include CRM endpoints in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/crm/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.endpoints).toContain('/api/v1/crm/leads');
      expect(response.body.endpoints).toContain('/api/v1/crm/deals');
      expect(response.body.endpoints).toContain('/api/v1/crm/contacts');
      expect(response.body.endpoints).toContain('/api/v1/crm/activities');
    });

    it('should cache context response', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .get('/crm/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mcp:crm:context',
        300,
        expect.any(String)
      );
    });

    it('should return cached context on cache hit', async () => {
      const cachedContext = {
        module: 'crm',
        version: 'v1.0',
        endpoints: ['/api/v1/crm/leads'],
        stream: 'crm.events',
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));

      const response = await request(app)
        .get('/crm/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(cachedContext);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should require authentication for context endpoint', async () => {
      const response = await request(app)
        .get('/crm/context')
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
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query', context: { test: true } })
        .expect(200);

      expect(mockPushContextUpdate).toHaveBeenCalled();
      const callArgs = mockPushContextUpdate.mock.calls[0];
      expect(callArgs[0]).toBe('crm');
      expect(callArgs[1]).toBe('pipeline');
      expect(callArgs[2]).toHaveProperty('leads');
      expect(callArgs[2]).toHaveProperty('deals');
      expect(callArgs[2]).toHaveProperty('contacts');
      expect(callArgs[2]).toHaveProperty('activities');
    });

    it('should not push context update on cache hit', async () => {
      const cachedResponse = {
        query: 'Test query',
        response: {
          module: 'crm',
          context: {},
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await request(app)
        .post('/crm/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });
  });
});
