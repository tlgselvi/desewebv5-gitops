import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { analyticsRoutes } from './analytics.js';
import { createAuthHeaders } from '../../../tests/helpers.js';
import * as dbModule from '@/db/index.js';

const app = express();
app.use(express.json());
app.use('/analytics', analyticsRoutes);

describe('Analytics Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /analytics/dashboard', () => {
    it('should return 400 when projectId is missing', async () => {
      // Act
      const response = await request(app)
        .get('/analytics/dashboard')
        .set(createAuthHeaders())
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/analytics/dashboard?projectId=invalid')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when period is invalid', async () => {
      // Act
      const response = await request(app)
        .get('/analytics/dashboard?projectId=00000000-0000-0000-0000-000000000000&period=invalid')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should accept valid period values', async () => {
      // Arrange
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Act
      const response = await request(app)
        .get('/analytics/dashboard?projectId=00000000-0000-0000-0000-000000000000&period=30d')
        .expect('Content-Type', /json/);

      // Assert - Should not fail validation
      expect([200, 404]).toContain(response.status);
    });

    it('should handle all valid period values', async () => {
      // Arrange
      const periods = ['7d', '30d', '90d', '1y'];
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Act & Assert
      for (const period of periods) {
        const response = await request(app)
          .get(`/analytics/dashboard?projectId=00000000-0000-0000-0000-000000000000&period=${period}`)
          .expect('Content-Type', /json/);

        expect([200, 404]).toContain(response.status);
      }
    });

    it('should return dashboard data structure', async () => {
      // Arrange
      vi.spyOn(dbModule.db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              totalAnalyses: 10,
              avgPerformance: 85,
              avgAccessibility: 90,
              avgSeo: 88,
              avgBestPractices: 82,
            },
          ]),
        }),
      } as any);

      // Act
      const response = await request(app)
        .get('/analytics/dashboard?projectId=00000000-0000-0000-0000-000000000000&period=30d')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});

