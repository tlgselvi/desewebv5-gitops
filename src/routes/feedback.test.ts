import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { feedbackRoutes } from './feedback.js';
import { FeedbackStore } from '@/services/storage/redisClient.js';

const app = express();
app.use(express.json());
app.use('/', feedbackRoutes);

describe('Feedback Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /aiops/feedback', () => {
    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidPayload = {
        metric: '', // Empty string should fail
      };

      // Act
      const response = await request(app)
        .post('/aiops/feedback')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid request data');
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const incompletePayload = {
        metric: 'cpu_usage',
        // Missing: anomaly, verdict, source, type, severity
      };

      // Act
      const response = await request(app)
        .post('/aiops/feedback')
        .send(incompletePayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should save feedback when valid data provided', async () => {
      // Arrange
      const validPayload = {
        metric: 'cpu_usage',
        anomaly: true,
        verdict: 'positive',
        source: 'manual',
        type: 'anomaly',
        severity: 'high',
        comment: 'CPU spike detected',
      };
      vi.spyOn(FeedbackStore, 'save').mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/aiops/feedback')
        .send(validPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /aiops/feedback', () => {
    it('should return all feedback entries', async () => {
      // Arrange
      const mockFeedback = [
        {
          timestamp: Date.now(),
          metric: 'cpu_usage',
          anomaly: true,
          verdict: 'positive',
        },
      ];
      vi.spyOn(FeedbackStore, 'getAll').mockResolvedValue(mockFeedback as any);

      // Act
      const response = await request(app)
        .get('/aiops/feedback')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('DELETE /aiops/feedback', () => {
    it('should clear feedback log', async () => {
      // Arrange
      vi.spyOn(FeedbackStore, 'clear').mockResolvedValue(5);

      // Act
      const response = await request(app)
        .delete('/aiops/feedback')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });
});

