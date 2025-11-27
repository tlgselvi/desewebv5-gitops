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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: 'test-user', email: 'test@example.com', role: 'admin', organizationId: 'org-123' };
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

describe('Inventory MCP Server', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/inventory/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'inventory-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/inventory/query', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { query, context } = req.body;
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        
        const cacheKey = `mcp:inventory:query:${JSON.stringify(req.body)}`;
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const response = {
          query,
          response: {
            module: 'inventory',
            version: 'v1.0',
            context: {
              products: context?.products || [],
              stockLevels: context?.stockLevels || [],
              movements: context?.movements || [],
              suppliers: context?.suppliers || [],
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'inventory-mcp-server',
              cached: false,
            },
          },
        };
        
        await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
        await mockPushContextUpdate('inventory', 'stock', response.response.context);
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    });
    
    // Context endpoint
    app.get('/inventory/context', async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const cacheKey = 'mcp:inventory:context';
        const cached = await mockRedis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        
        const context = {
          module: 'inventory',
          version: 'v1.0',
          endpoints: ['/api/v1/inventory/products', '/api/v1/inventory/levels'],
          metrics: ['inventory_products_total', 'inventory_stock_value'],
          stream: 'inventory.events',
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
        .get('/inventory/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'inventory-mcp');
      expect(response.body).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Query Endpoint', () => {
    it('should handle valid query request', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockPushContextUpdate.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/inventory/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ 
          query: 'Get stock levels',
          context: { stockLevels: [{ productId: 'prod-1', quantity: 100 }] }
        })
        .expect(200);

      expect(response.body).toHaveProperty('query', 'Get stock levels');
      expect(response.body.response).toHaveProperty('module', 'inventory');
      expect(response.body.response.context).toHaveProperty('stockLevels');
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should use Redis cache', async () => {
      const cachedResponse = {
        query: 'Get products',
        response: { module: 'inventory', context: { cached: true } },
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
      
      const response = await request(app)
        .post('/inventory/query')
        .set('Authorization', 'Bearer valid-token')
        .send({ query: 'Get products' })
        .expect(200);

      expect(response.body).toEqual(cachedResponse);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/inventory/query')
        .send({ query: 'Get products' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Context Endpoint', () => {
    it('should return module context', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const response = await request(app)
        .get('/inventory/context')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('module', 'inventory');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('metrics');
    });
  });
});

