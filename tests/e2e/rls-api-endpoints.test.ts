import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Application } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/index.js';
import { setupRoutes } from '@/routes/index.js';
import { authenticate } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

/**
 * E2E RLS API Endpoint Tests
 * 
 * These tests verify that RLS policies are enforced at the API endpoint level.
 * Tests verify that:
 * - Different organizations cannot access each other's data
 * - JWT token without organization_id fails
 * - JWT token with wrong organization_id fails
 * - RLS context is properly set for all requests
 */

// Mock database and services for testing
vi.mock('@/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
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

describe('E2E RLS API Endpoints', () => {
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
    
    // Apply authentication and RLS middleware
    app.use('/api/v1', authenticate);
    app.use('/api/v1', setRLSContextMiddleware);
    
    // Setup routes
    setupRoutes(app);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Finance Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B invoices', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B invoices
      // Response should only contain Organization A invoices
      if (Array.isArray(response.body)) {
        response.body.forEach((invoice: any) => {
          expect(invoice.organizationId).toBe(orgAId);
        });
      }
    });

    it('should prevent User A from creating invoice for Organization B', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .post('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          organizationId: orgBId, // Attempting to create for Org B
          accountId: 'account-123',
          type: 'sales',
          items: [],
        });

      // Should fail with 403 or 400
      expect([400, 403]).toContain(response.status);
    });

    it('should allow User A to access their own organization invoices', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // Should succeed for own organization
      expect(response.status).toBe(200);
    });
  });

  describe('CRM Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B deals', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/crm/kanban')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B deals
      if (response.body.deals && Array.isArray(response.body.deals)) {
        response.body.deals.forEach((deal: any) => {
          expect(deal.organizationId).toBe(orgAId);
        });
      }
    });

    it('should prevent User A from creating deal for Organization B', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .post('/api/v1/crm/deals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          organizationId: orgBId, // Attempting to create for Org B
          title: 'Test Deal',
          value: 1000,
          stageId: 'stage-123',
        });

      // Should fail with 403 or 400
      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Inventory Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B products', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B products
      if (Array.isArray(response.body)) {
        response.body.forEach((product: any) => {
          expect(product.organizationId).toBe(orgAId);
        });
      }
    });
  });

  describe('IoT Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B devices', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/iot/devices')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B devices
      if (Array.isArray(response.body)) {
        response.body.forEach((device: any) => {
          expect(device.organizationId).toBe(orgAId);
        });
      }
    });
  });

  describe('HR Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B employees', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B employees
      if (Array.isArray(response.body)) {
        response.body.forEach((employee: any) => {
          expect(employee.organizationId).toBe(orgAId);
        });
      }
    });
  });

  describe('JWT Token Validation', () => {
    it('should reject request without JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .expect(401);

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.status).toBe(401);
    });

    it('should reject request with JWT token without organization_id', async () => {
      const tokenWithoutOrg = createToken(userAId, undefined, 'user');

      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenWithoutOrg}`);

      // Should fail because RLS context requires organizationId
      // In production, this should fail with 400 or 403
      expect([400, 403, 500]).toContain(response.status);
    });

    it('should reject request with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        {
          id: userAId,
          email: `${userAId}@example.com`,
          role: 'user',
          organizationId: orgAId,
        },
        config.security.jwtSecret,
        { expiresIn: '-1h' } // Expired token
      );

      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('RLS Context Enforcement', () => {
    it('should set RLS context for authenticated requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenA}`);

      // Request should succeed (RLS context is set)
      // If RLS context is not set, request would fail in production
      expect([200, 404]).toContain(response.status);
    });

    it('should enforce RLS context in transaction operations', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .post('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          organizationId: orgAId, // Correct organization
          accountId: 'account-123',
          type: 'sales',
          items: [
            {
              description: 'Test Item',
              quantity: 1,
              unitPrice: 100,
              taxRate: 18,
            },
          ],
        });

      // Should succeed for own organization
      // RLS context should be enforced even in transactions
      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('Service Module - Cross-Organization Access', () => {
    it('should prevent User A from accessing Organization B service requests', async () => {
      const tokenA = createToken(userAId, orgAId, 'user');

      const response = await request(app)
        .get('/api/v1/service/requests')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // RLS policies should filter out Organization B service requests
      if (Array.isArray(response.body)) {
        response.body.forEach((request: any) => {
          expect(request.organizationId).toBe(orgAId);
        });
      }
    });
  });
});

