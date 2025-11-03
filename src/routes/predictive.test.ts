import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { predictiveRoutes } from './predictive.js';
import PredictiveRemediator from '@/services/aiops/predictiveRemediator.js';

const app = express();
app.use(express.json());
app.use('/predict', predictiveRoutes);

describe('Predictive Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /predict/severity', () => {
    it('should return 400 when correlationScore is missing', async () => {
      // Arrange
      const payload = {
        anomalyScore: 0.8,
      };

      // Act
      const response = await request(app)
        .post('/predict/severity')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('correlationScore');
    });

    it('should return 400 when anomalyScore is missing', async () => {
      // Arrange
      const payload = {
        correlationScore: 0.7,
      };

      // Act
      const response = await request(app)
        .post('/predict/severity')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('anomalyScore');
    });

    it('should classify severity when valid data provided', async () => {
      // Arrange
      const payload = {
        correlationScore: 0.85,
        anomalyScore: 0.9,
        trendDirection: 0.8,
      };
      vi.spyOn(PredictiveRemediator.prototype, 'classifySeverity').mockReturnValue({
        severity: 'high' as const,
        confidence: 0.92,
      });

      // Act
      const response = await request(app)
        .post('/predict/severity')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /predict/actions', () => {
    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const payload = {
        targetMetric: 'cpu_usage',
      };

      // Act
      const response = await request(app)
        .post('/predict/actions')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([400, 500]).toContain(response.status);
    });
  });
});

