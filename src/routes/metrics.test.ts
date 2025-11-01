import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { metricsRoutes } from './metrics.js';

const app = express();
app.use('/metrics', metricsRoutes);

describe('Metrics Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      // Act
      const response = await request(app)
        .get('/metrics')
        .expect('Content-Type', /text/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should include HTTP request metrics', async () => {
      // Act
      const response = await request(app)
        .get('/metrics')
        .expect('Content-Type', /text/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.text).toMatch(/http_request/);
    });
  });
});

