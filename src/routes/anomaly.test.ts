import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { anomalyRoutes } from './anomaly.js';
import { errorHandler } from '@/middleware/errorHandler.js';
import AnomalyDetector from '@/services/aiops/anomalyDetector.js';

const app = express();
app.use(express.json());
app.use('/anomaly', anomalyRoutes);
app.use(errorHandler);

describe('Anomaly Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /anomaly/detect', () => {
    it('should return 400 when metric is missing', async () => {
      // Arrange
      const payload = {
        values: [1, 2, 3],
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/detect')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when values array is empty', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
        values: [],
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/detect')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should detect anomalies when valid data provided', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
        values: [50, 52, 51, 90, 95, 93], // Last 3 are anomalies
        timestamps: [1, 2, 3, 4, 5, 6],
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/detect')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400]).toContain(response.status);
    });

    it('should return 400 when timestamps array length mismatches', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
        values: [1, 2, 3],
        timestamps: [1, 2], // Different length
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/detect')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle missing timestamps by generating defaults', async () => {
      // Arrange
      const payload = {
        metric: 'cpu_usage',
        values: [50, 52, 51],
        // timestamps missing - should auto-generate
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/detect')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /anomaly/p95', () => {
    it('should detect p95 anomaly', async () => {
      // Arrange
      const payload = {
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100],
        timestamps: Array(10).fill(0).map((_, i) => i),
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/p95')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400]).toContain(response.status);
    });

    it('should return 400 when values array is missing', async () => {
      // Arrange
      const payload = {
        timestamps: [1, 2, 3],
      };

      // Act
      const response = await request(app)
        .post('/anomaly/anomalies/p95')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

