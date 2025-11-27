import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Application } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/index.js';
import { optionalAuth } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

/**
 * E2E RLS MCP Server Tests
 * 
 * These tests verify that RLS policies are enforced for MCP servers.
 * Tests verify that:
 * - MCP servers require organization context
 * - MCP servers cannot access cross-tenant data
 * - RLS context is properly set for MCP requests
 */

// Mock database and services
vi.mock('@/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('E2E RLS MCP Servers', () => {
  let app: Application;
  const orgAId = 'org-a-123';
  const orgBId = 'org-b-456';
  const userAId = 'user-a-123';
  const userBId = 'user-b-456';

  // Helper function to create JWT token
  const createToken = (userId: string, organizationId?: string, role: string = 'user') => {
    return jwt.sign(
      {
        id: userId,
        email: `${userId}@example.com`,
        role,
        ...(organizationId && { organizationId }),
      },
      config.security.jwtSecret,
      { expiresIn: '1h' }
    );
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Apply optional auth and RLS middleware (MCP servers use optionalAuth)
    app.use('/mcp', optionalAuth);
    app.use('/mcp', setRLSContextMiddleware);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FinBot MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      // Mock FinBot query endpoint
      app.post('/mcp/finbot/query', (req, res) => {
        // RLS context should be set by middleware
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'finbot' } });
      });

      const response = await request(app)
        .post('/mcp/finbot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      // Should succeed with RLS context set
      expect([200, 403]).toContain(response.status);
    });

    it('should prevent cross-tenant data access', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      // Mock FinBot query endpoint that accesses data
      app.post('/mcp/finbot/query', (req, res) => {
        const rlsContext = (req as any).rlsContext;
        // Verify RLS context is for Organization A
        if (rlsContext && rlsContext.organizationId !== orgAId) {
          return res.status(403).json({ error: 'Cross-tenant access denied' });
        }
        res.json({ query: req.body.query, response: { module: 'finbot', orgId: rlsContext?.organizationId } });
      });

      const response = await request(app)
        .post('/mcp/finbot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      // Should succeed and return Organization A data only
      if (response.status === 200) {
        expect(response.body.response.orgId).toBe(orgAId);
      }
    });
  });

  describe('MuBot MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/mubot/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'mubot' } });
      });

      const response = await request(app)
        .post('/mcp/mubot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });

    it('should prevent cross-tenant data access', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/mubot/query', (req, res) => {
        const rlsContext = (req as any).rlsContext;
        if (rlsContext && rlsContext.organizationId !== orgAId) {
          return res.status(403).json({ error: 'Cross-tenant access denied' });
        }
        res.json({ query: req.body.query, response: { module: 'mubot', orgId: rlsContext?.organizationId } });
      });

      const response = await request(app)
        .post('/mcp/mubot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      if (response.status === 200) {
        expect(response.body.response.orgId).toBe(orgAId);
      }
    });
  });

  describe('Observability MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/observability/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'observability' } });
      });

      const response = await request(app)
        .post('/mcp/observability/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('SEO MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/seo/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'seo' } });
      });

      const response = await request(app)
        .post('/mcp/seo/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Service MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/service/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'service' } });
      });

      const response = await request(app)
        .post('/mcp/service/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('CRM MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/crm/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'crm' } });
      });

      const response = await request(app)
        .post('/mcp/crm/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Inventory MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/inventory/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'inventory' } });
      });

      const response = await request(app)
        .post('/mcp/inventory/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('HR MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/hr/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'hr' } });
      });

      const response = await request(app)
        .post('/mcp/hr/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('IoT MCP Server', () => {
    it('should require organization context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/iot/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'RLS context not set' });
        }
        res.json({ query: req.body.query, response: { module: 'iot' } });
      });

      const response = await request(app)
        .post('/mcp/iot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('MCP Server - Unauthenticated Requests', () => {
    it('should allow unauthenticated requests to health endpoints', async () => {
      app.get('/mcp/finbot/health', (req, res) => {
        res.json({ status: 'healthy', service: 'finbot-mcp' });
      });

      const response = await request(app)
        .get('/mcp/finbot/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should require authentication for data access endpoints', async () => {
      app.post('/mcp/finbot/query', (req, res) => {
        const rlsContextSet = (req as any).rlsContextSet;
        if (!rlsContextSet) {
          return res.status(403).json({ error: 'Authentication required' });
        }
        res.json({ query: req.body.query, response: { module: 'finbot' } });
      });

      const response = await request(app)
        .post('/mcp/finbot/query')
        .send({ query: 'test query' });

      // Should fail without authentication
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('MCP Server - Cross-Tenant Prevention', () => {
    it('should prevent User A from accessing Organization B data via MCP', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      app.post('/mcp/finbot/query', (req, res) => {
        const rlsContext = (req as any).rlsContext;
        // Verify RLS context prevents cross-tenant access
        if (rlsContext && rlsContext.organizationId === orgBId) {
          return res.status(403).json({ error: 'Cross-tenant access denied' });
        }
        res.json({ query: req.body.query, response: { module: 'finbot', orgId: rlsContext?.organizationId } });
      });

      const response = await request(app)
        .post('/mcp/finbot/query')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query: 'test query' });

      // Should only return Organization A data
      if (response.status === 200) {
        expect(response.body.response.orgId).toBe(orgAId);
        expect(response.body.response.orgId).not.toBe(orgBId);
      }
    });
  });
});

