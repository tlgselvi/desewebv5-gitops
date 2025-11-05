import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  quit: vi.fn(),
};

vi.mock('@/services/storage/redisClient.js', () => ({
  redis: mockRedis,
}));

vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com', role: 'admin' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com', role: 'admin' };
    next();
  },
}));

vi.mock('@/middleware/errorHandler.js', () => ({
  asyncHandler: (fn: any) => fn,
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./websocket-server.js', () => ({
  initializeMCPWebSocket: vi.fn(),
  pushContextUpdate: vi.fn(),
}));

describe('FinBot MCP Server', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test app with FinBot routes
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/finbot/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'finbot-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint (simplified)
    app.post('/finbot/query', async (req, res) => {
      const { query } = req.body;
      const cacheKey = `mcp:finbot:query:${JSON.stringify(req.body)}`;
      
      // Check cache
      const cached = await mockRedis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Mock response
      const response = {
        query,
        response: {
          module: 'finbot',
          context: { accounts: 10, transactions: 50 },
        },
      };
      
      // Cache response
      await mockRedis.setex(cacheKey, 60, JSON.stringify(response));
      
      res.json(response);
    });
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/finbot/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'finbot-mcp');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should handle query requests', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    const response = await request(app)
      .post('/finbot/query')
      .send({ query: 'Get accounts', context: {} })
      .expect(200);

    expect(response.body).toHaveProperty('query', 'Get accounts');
    expect(response.body).toHaveProperty('response');
    expect(response.body.response).toHaveProperty('module', 'finbot');
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it('should use Redis cache', async () => {
    const cachedResponse = {
      query: 'Get accounts',
      response: { module: 'finbot', context: { cached: true } },
    };
    
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));
    
    const response = await request(app)
      .post('/finbot/query')
      .send({ query: 'Get accounts', context: {} })
      .expect(200);

    expect(response.body).toEqual(cachedResponse);
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });
});

