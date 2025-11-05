import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
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

vi.mock('./context-aggregator.js', () => ({
  getAggregatedContext: vi.fn(),
  selectContextByPriority: vi.fn(),
}));

describe('Observability MCP Server', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Health endpoint
    app.get('/observability/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'observability-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Query endpoint
    app.post('/observability/query', async (req, res) => {
      const { query } = req.body;
      const cacheKey = `mcp:observability:query:${JSON.stringify(req.body)}`;
      
      const cached = await mockRedis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      const response = {
        query,
        response: {
          module: 'observability',
          context: { metrics: { cpu: 50, memory: 60 } },
        },
      };
      
      await mockRedis.setex(cacheKey, 30, JSON.stringify(response));
      res.json(response);
    });
    
    // Aggregate endpoint
    app.post('/observability/aggregate', async (req, res) => {
      const { modules, query } = req.body;
      res.json({
        query,
        aggregated: {
          modules: modules.reduce((acc: any, mod: string) => {
            acc[mod] = { module: mod, data: {} };
            return acc;
          }, {}),
          context: { merged: true },
        },
      });
    });
  });

  it('should return health status', async () => {
    const response = await request(app)
      .get('/observability/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'observability-mcp');
    expect(response.body).toHaveProperty('version', '1.0.0');
  });

  it('should aggregate context from multiple modules', async () => {
    const response = await request(app)
      .post('/observability/aggregate')
      .send({
        query: 'Get all metrics',
        modules: ['finbot', 'mubot'],
      })
      .expect(200);

    expect(response.body).toHaveProperty('query', 'Get all metrics');
    expect(response.body).toHaveProperty('aggregated');
    expect(response.body.aggregated).toHaveProperty('modules');
    expect(response.body.aggregated.modules).toHaveProperty('finbot');
    expect(response.body.aggregated.modules).toHaveProperty('mubot');
  });

  it('should handle metrics queries', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');

    const response = await request(app)
      .post('/observability/query')
      .send({ query: 'Get metrics', context: {} })
      .expect(200);

    expect(response.body).toHaveProperty('query', 'Get metrics');
    expect(response.body).toHaveProperty('response');
    expect(response.body.response).toHaveProperty('module', 'observability');
    expect(mockRedis.setex).toHaveBeenCalled();
  });
});

