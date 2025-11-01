import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { aiopsRoutes } from './aiops.js';
import { TelemetryAgent } from '@/services/aiops/telemetryAgent.js';

const app = express();
app.use(express.json());
app.use('/aiops', aiopsRoutes);

describe('AIOps Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /aiops/metrics', () => {
    it('should return telemetry data', async () => {
      // Arrange
      const mockData = {
        timestamp: Date.now(),
        avgLatency: 150,
        drift: false,
        metrics: {},
      };
      vi.spyOn(TelemetryAgent.prototype, 'getSystemState').mockResolvedValue(mockData);

      // Act
      const response = await request(app)
        .get('/aiops/metrics')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('avgLatency');
    });
  });

  describe('POST /aiops/drift', () => {
    it('should detect drift when threshold exceeded', async () => {
      // Arrange
      const mockData = {
        timestamp: Date.now(),
        avgLatency: 250,
        drift: true,
        metrics: {},
      };
      vi.spyOn(TelemetryAgent.prototype, 'run').mockResolvedValue(mockData);

      // Act
      const response = await request(app)
        .post('/aiops/drift')
        .send({ threshold: 0.1 })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});

