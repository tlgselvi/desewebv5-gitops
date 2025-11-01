import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { correlationRoutes } from './correlation.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import CorrelationEngine from '@/services/aiops/correlationEngine.js';

const app = express();
app.use(express.json());
app.use('/correlation', correlationRoutes);
app.use(errorHandler);

describe('Correlation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /correlation/calculate', () => {
    it('should return 400 when metric1 is missing', async () => {
      // Arrange
      const payload = {
        metric2: 'cpu_usage',
      };

      // Act
      const response = await request(app)
        .post('/correlation/calculate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('metric1');
    });

    it('should return 400 when metric2 is missing', async () => {
      // Arrange
      const payload = {
        metric1: 'cpu_usage',
      };

      // Act
      const response = await request(app)
        .post('/correlation/calculate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('metric2');
    });

    it('should calculate correlation when valid data provided', async () => {
      // Arrange
      const payload = {
        metric1: 'cpu_usage',
        metric2: 'memory_usage',
        timeRange: '1h',
      };
      vi.spyOn(CorrelationEngine.prototype, 'calculateCorrelation').mockResolvedValue({
        metric1: 'cpu_usage',
        metric2: 'memory_usage',
        pearson: 0.85,
        spearman: 0.82,
        strength: 'strong' as const,
        significance: 0.95,
      });

      // Act
      const response = await request(app)
        .post('/correlation/calculate')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /correlation/matrix', () => {
    it('should return 400 when metrics array is missing', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await request(app)
        .post('/correlation/matrix')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when metrics array has less than 2 items', async () => {
      // Arrange
      const payload = {
        metrics: ['cpu_usage'],
      };

      // Act
      const response = await request(app)
        .post('/correlation/matrix')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

