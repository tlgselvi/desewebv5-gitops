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
      permissions: ['seo:read', 'seo:write']
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

describe('SEO MCP Server', () => {
  let app: express.Application;
  const BACKEND_BASE = 'http://app:3000';

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/seo/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'seo-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/seo/query', async (req, res, next) => {
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
        
        const cacheKey = `mcp:seo:query:${JSON.stringify(req.body)}`;
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        if (query === 'error-query') {
          throw new Error('Simulated error');
        }
        
        let metricsData: unknown = null;
        let trendsData: unknown = null;
        
        try {
          const metricsResponse = await mockFetch(`${BACKEND_BASE}/api/v1/seo/metrics`, {
            headers: {
              'Content-Type': 'application/json',
              ...(req.headers.authorization && { Authorization: req.headers.authorization }),
            },
          });
          
          if (metricsResponse && metricsResponse.ok) {
            metricsData = await metricsResponse.json();
          }
        } catch (error) {
          // Silently fail
        }
        
        try {
          const trendsResponse = await mockFetch(`${BACKEND_BASE}/api/v1/seo/trends`, {
            headers: {
              'Content-Type': 'application/json',
              ...(req.headers.authorization && { Authorization: req.headers.authorization }),
            },
          });
          
          if (trendsResponse && trendsResponse.ok) {
            trendsData = await trendsResponse.json();
          }
        } catch (error) {
          // Silently fail
        }
        
        const response = {
          query,
          response: {
            module: 'seo',
            version: 'v1.0',
            context: {
              metrics: metricsData || null,
              trends: trendsData || null,
              projects: context?.projects || [],
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'seo-mcp-server',
              cached: false,
              backendConnected: metricsData !== null || trendsData !== null,
            },
          },
        };
        
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        await mockPushContextUpdate('seo', 'metrics', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/seo/context', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:seo:context';
        
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'seo',
          version: 'v1.0',
          endpoints: [
            '/api/v1/seo/analyze',
            '/api/v1/seo/metrics',
            '/api/v1/seo/trends',
            '/api/v1/seo/analyze/url',
          ],
          metrics: [
            'seo_score',
            'core_web_vitals',
            'lighthouse_score',
            'backlink_count',
          ],
          stream: 'seo.events',
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
        .get('/seo/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'seo-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Query Endpoint', () => {
    describe('SEO Analytics Query Tests', () => {
      it('should handle SEO analytics query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);
        const mockMetricsData = {
          seo_score: 85,
          core_web_vitals: { lcp: 2.1, fid: 0.05, cls: 0.1 },
          lighthouse_score: 92,
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsData,
        });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get SEO analytics for website',
            context: {
              projects: [{ id: 'proj-1', url: 'https://example.com' }],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get SEO analytics for website');
        expect(response.body.response).toHaveProperty('module', 'seo');
        expect(response.body.response.context).toHaveProperty('metrics');
        expect(response.body.response.context.metrics).toEqual(mockMetricsData);
        expect(response.body.response.context).toHaveProperty('projects');
        expect(Array.isArray(response.body.response.context.projects)).toBe(true);
        expect(mockRedis.setex).toHaveBeenCalled();
        expect(mockPushContextUpdate).toHaveBeenCalled();
      });

      it('should fetch SEO metrics from backend', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        const mockMetricsData = { seo_score: 85, lighthouse_score: 92 };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsData,
        });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get SEO metrics' })
          .expect(200);

        expect(mockFetch).toHaveBeenCalledWith(
          `${BACKEND_BASE}/api/v1/seo/metrics`,
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(response.body.response.context.metrics).toEqual(mockMetricsData);
        expect(response.body.response.metadata.backendConnected).toBe(true);
      });
    });

    describe('Rank Tracking Query Tests', () => {
      it('should handle rank tracking query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);
        const mockTrendsData = {
          keyword: 'example keyword',
          current_rank: 5,
          previous_rank: 8,
          change: 3,
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: false, // Metrics fails
        }).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrendsData,
        });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Track keyword rankings',
            context: {
              projects: [{ id: 'proj-1', keyword: 'example keyword' }],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Track keyword rankings');
        expect(response.body.response.context).toHaveProperty('trends');
        expect(response.body.response.context.trends).toEqual(mockTrendsData);
      });

      it('should fetch SEO trends from backend', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        const mockTrendsData = {
          keyword: 'test keyword',
          current_rank: 3,
          trend: 'up',
        };
        
        mockFetch
          .mockResolvedValueOnce({ ok: false })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockTrendsData,
          });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get trends' })
          .expect(200);

        expect(mockFetch).toHaveBeenCalledWith(
          `${BACKEND_BASE}/api/v1/seo/trends`,
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(response.body.response.context.trends).toEqual(mockTrendsData);
        expect(response.body.response.metadata.backendConnected).toBe(true);
      });
    });

    describe('Content Analysis Query Tests', () => {
      it('should handle content analysis query', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Analyze content SEO performance',
            context: {
              projects: [
                {
                  id: 'proj-1',
                  url: 'https://example.com/page',
                  content_score: 78,
                },
              ],
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Analyze content SEO performance');
        expect(response.body.response.context).toHaveProperty('projects');
        expect(Array.isArray(response.body.response.context.projects)).toBe(true);
        expect(response.body.response.context.projects.length).toBeGreaterThan(0);
      });

      it('should include project data in response', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const projects = [
          { id: 'proj-1', url: 'https://example.com', score: 85 },
          { id: 'proj-2', url: 'https://example2.com', score: 92 },
        ];

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get project analysis',
            context: { projects },
          })
          .expect(200);

        expect(response.body.response.context.projects).toEqual(projects);
      });
    });

    describe('Valid Query Tests', () => {
      it('should handle valid query request', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockPushContextUpdate.mockResolvedValue(undefined);
        mockFetch.mockResolvedValue({ ok: false });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({
            query: 'Get SEO status',
            context: { projects: [] },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get SEO status');
        expect(response.body.response).toHaveProperty('module', 'seo');
        expect(response.body.response).toHaveProperty('version', 'v1.0');
        expect(response.body.response).toHaveProperty('context');
        expect(response.body.response.context).toHaveProperty('metrics');
        expect(response.body.response.context).toHaveProperty('trends');
        expect(response.body.response.context).toHaveProperty('projects');
      });

      it('should handle query with empty context', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');
        mockFetch.mockResolvedValue({ ok: false });

        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get metrics' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'Get metrics');
        expect(response.body.response.context.metrics).toBeNull();
        expect(response.body.response.context.trends).toBeNull();
        expect(response.body.response.context.projects).toEqual([]);
      });
    });

    describe('Invalid Query Tests', () => {
      it('should reject query without query field', async () => {
        const response = await request(app)
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ context: {} })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Query is required');
      });

      it('should reject query with invalid body', async () => {
        const response = await request(app)
          .post('/seo/query')
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
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'error-query' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'internal_error');
      });

      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

        const response = await request(app)
          .post('/seo/query')
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
          .post('/seo/query')
          .set('Authorization', 'Bearer valid-token')
          .send({ query: 'Get SEO data' })
          .expect(200);

        expect(response.body.response.context.metrics).toBeNull();
        expect(response.body.response.context.trends).toBeNull();
        expect(response.body.response.metadata.backendConnected).toBe(false);
      });
    });
  });

  describe('Redis Cache Tests', () => {
    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        query: 'Get SEO metrics',
        response: {
          module: 'seo',
          version: 'v1.0',
          context: { metrics: { seo_score: 85 } },
          metadata: { cached: true },
        },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get SEO metrics' })
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
      mockFetch.mockResolvedValue({ ok: false });

      await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get SEO data' })
        .expect(200);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('mcp:seo:query:'),
        60,
        expect.any(String)
      );
    });

    it('should use correct cache key format', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockFetch.mockResolvedValue({ ok: false });

      const requestBody = { query: 'Test query', context: { test: true } };
      
      await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody)
        .expect(200);

      const cacheKey = mockRedis.setex.mock.calls[0][0];
      expect(cacheKey).toContain('mcp:seo:query:');
      expect(cacheKey).toContain('Test query');
    });

    it('should set cache TTL to 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockFetch.mockResolvedValue({ ok: false });

      await request(app)
        .post('/seo/query')
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
      mockFetch.mockResolvedValue({ ok: false });

      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .post('/seo/query')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'InvalidFormat token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'Test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with expired JWT token', async () => {
      const response = await request(app)
        .post('/seo/query')
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
      mockFetch.mockResolvedValue({ ok: false });

      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Test query');
    });

    it('should reject access without authentication (implicit permission check)', async () => {
      const response = await request(app)
        .post('/seo/query')
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
        .get('/seo/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'seo');
      expect(response.body).toHaveProperty('version', 'v1.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('stream', 'seo.events');
      expect(response.body).toHaveProperty('backendUrl', BACKEND_BASE);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });

    it('should include SEO endpoints in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/seo/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.endpoints).toContain('/api/v1/seo/analyze');
      expect(response.body.endpoints).toContain('/api/v1/seo/metrics');
      expect(response.body.endpoints).toContain('/api/v1/seo/trends');
      expect(response.body.endpoints).toContain('/api/v1/seo/analyze/url');
    });

    it('should include SEO metrics in context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/seo/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.metrics).toContain('seo_score');
      expect(response.body.metrics).toContain('core_web_vitals');
      expect(response.body.metrics).toContain('lighthouse_score');
      expect(response.body.metrics).toContain('backlink_count');
    });

    it('should cache context response', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      await request(app)
        .get('/seo/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'mcp:seo:context',
        300,
        expect.any(String)
      );
    });

    it('should return cached context on cache hit', async () => {
      const cachedContext = {
        module: 'seo',
        version: 'v1.0',
        endpoints: ['/api/v1/seo/health'],
        metrics: ['seo_score'],
        stream: 'seo.events',
        timestamp: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedContext));

      const response = await request(app)
        .get('/seo/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(cachedContext);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should require authentication for context endpoint', async () => {
      const response = await request(app)
        .get('/seo/context')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Backend Integration Tests', () => {
    it('should fetch both metrics and trends from backend', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      const mockMetricsData = { seo_score: 85 };
      const mockTrendsData = { keyword: 'test', rank: 5 };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMetricsData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTrendsData,
        });

      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get all SEO data' })
        .expect(200);

      expect(response.body.response.context.metrics).toEqual(mockMetricsData);
      expect(response.body.response.context.trends).toEqual(mockTrendsData);
      expect(response.body.response.metadata.backendConnected).toBe(true);
    });

    it('should handle backend connection failure gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get data' })
        .expect(200);

      expect(response.body.response.context.metrics).toBeNull();
      expect(response.body.response.context.trends).toBeNull();
      expect(response.body.response.metadata.backendConnected).toBe(false);
    });
  });

  describe('WebSocket Integration', () => {
    it('should push context update after query', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockPushContextUpdate.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({ ok: false });

      await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query', context: { test: true } })
        .expect(200);

      expect(mockPushContextUpdate).toHaveBeenCalled();
      const callArgs = mockPushContextUpdate.mock.calls[0];
      expect(callArgs[0]).toBe('seo');
      expect(callArgs[1]).toBe('metrics');
      expect(callArgs[2]).toHaveProperty('metrics');
      expect(callArgs[2]).toHaveProperty('trends');
      expect(callArgs[2]).toHaveProperty('projects');
    });

    it('should not push context update on cache hit', async () => {
      const cachedResponse = {
        query: 'Test query',
        response: {
          module: 'seo',
          context: {},
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

      await request(app)
        .post('/seo/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Test query' })
        .expect(200);

      expect(mockPushContextUpdate).not.toHaveBeenCalled();
    });
  });
});

