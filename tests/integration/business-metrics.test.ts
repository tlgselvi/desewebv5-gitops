/**
 * Business Metrics Integration Tests
 * 
 * Tests business metrics calculation and API endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { businessMetricsService } from '@/services/analytics/business-metrics.service.js';
import { businessMetricsRoutes } from '@/routes/analytics/business-metrics.js';
import { authenticate, authorize } from '@/middleware/auth.js';

// Mock auth middleware
vi.mock('@/middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'admin', organizationId: 'test-org-id' };
    next();
  },
  authorize: (roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
}));

describe('Business Metrics Integration Tests', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/analytics', businessMetricsRoutes);
  });

  it('should return business metrics', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/business-metrics')
      .expect(200);

    expect(response.body).toHaveProperty('revenue');
    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('features');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return revenue metrics', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/revenue')
      .expect(200);

    expect(response.body).toHaveProperty('mrr');
    expect(response.body).toHaveProperty('arr');
    expect(response.body).toHaveProperty('growthRate');
  });

  it('should return user metrics', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/users')
      .expect(200);

    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('active');
    expect(response.body.active).toHaveProperty('dau');
    expect(response.body.active).toHaveProperty('mau');
    expect(response.body.active).toHaveProperty('wau');
    expect(response.body).toHaveProperty('growth');
    expect(response.body).toHaveProperty('retention');
  });

  it('should require authentication', async () => {
    // Remove auth middleware for this test
    const appWithoutAuth = express();
    appWithoutAuth.use(express.json());
    appWithoutAuth.use('/api/v1/analytics', businessMetricsRoutes);

    await request(appWithoutAuth)
      .get('/api/v1/analytics/business-metrics')
      .expect(401);
  });

  it('should require admin or analytics.read role', async () => {
    // Mock non-admin user
    vi.mock('@/middleware/auth.js', () => ({
      authenticate: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user-id', role: 'user', organizationId: 'test-org-id' };
        next();
      },
      authorize: (roles: string[]) => (req: any, res: any, next: any) => {
        if (roles.includes(req.user.role)) {
          next();
        } else {
          res.status(403).json({ error: 'Forbidden' });
        }
      },
    }));

    const appWithUser = express();
    appWithUser.use(express.json());
    appWithUser.use('/api/v1/analytics', businessMetricsRoutes);

    await request(appWithUser)
      .get('/api/v1/analytics/business-metrics')
      .expect(403);
  });
});

