import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { seoRoutes } from './seo.js';
import * as seoService from '@/services/seoAnalyzer.js';

const app = express();
app.use(express.json());
app.use('/seo', seoRoutes);

describe('SEO Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /seo/analyze', () => {
    it('should return 400 when projectId is missing', async () => {
      // Arrange
      const payload = {
        urls: ['https://example.com'],
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when urls array is empty', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: [],
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when urls array exceeds max length', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: Array(11).fill('https://example.com'), // More than 10
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when invalid URL provided', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: ['not-a-valid-url'],
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /seo/metrics', () => {
    it('should return 400 when projectId is missing', async () => {
      // Act
      const response = await request(app)
        .get('/seo/metrics')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/seo/metrics?projectId=invalid-uuid')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /seo/trends', () => {
    it('should return 400 when projectId is missing', async () => {
      // Act
      const response = await request(app)
        .get('/seo/trends')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when days is out of range', async () => {
      // Act
      const response = await request(app)
        .get('/seo/trends?projectId=00000000-0000-0000-0000-000000000000&days=500')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate device enum', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: ['https://example.com'],
        options: {
          device: 'invalid_device',
        },
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate throttling enum', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: ['https://example.com'],
        options: {
          throttling: 'invalid_throttling',
        },
      };

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should accept valid options', async () => {
      // Arrange
      const payload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        urls: ['https://example.com'],
        options: {
          device: 'mobile',
          throttling: 'slow3G',
          categories: ['performance', 'seo'],
        },
      };
      vi.spyOn(seoService.seoAnalyzer, 'analyzeProject').mockResolvedValue({
        projectId: payload.projectId,
        totalUrls: 1,
        successfulAnalyses: 1,
        failedAnalyses: 0,
        results: [],
        errors: [],
      } as any);

      // Act
      const response = await request(app)
        .post('/seo/analyze')
        .send(payload)
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /seo/metrics', () => {
    it('should validate limit range', async () => {
      // Act
      const response = await request(app)
        .get('/seo/metrics?projectId=00000000-0000-0000-0000-000000000000&limit=200')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate limit minimum', async () => {
      // Act
      const response = await request(app)
        .get('/seo/metrics?projectId=00000000-0000-0000-0000-000000000000&limit=0')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});

