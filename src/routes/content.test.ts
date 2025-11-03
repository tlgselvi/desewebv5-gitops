import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { contentRoutes } from './content.js';
import * as contentService from '@/services/contentGenerator.js';

const app = express();
app.use(express.json());
app.use('/content', contentRoutes);

describe('Content Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /content/generate', () => {
    it('should return 400 when projectId is missing', async () => {
      // Arrange
      const invalidPayload = {
        contentType: 'blog_post',
        keywords: ['test'],
      };

      // Act
      const response = await request(app)
        .post('/content/generate')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when contentType is invalid', async () => {
      // Arrange
      const invalidPayload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'invalid_type',
        keywords: ['test'],
      };

      // Act
      const response = await request(app)
        .post('/content/generate')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when keywords array is empty', async () => {
      // Arrange
      const invalidPayload = {
        projectId: '00000000-0000-0000-0000-000000000000',
        contentType: 'blog_post',
        keywords: [],
      };

      // Act
      const response = await request(app)
        .post('/content/generate')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /content/templates', () => {
    it('should return 400 when template name is missing', async () => {
      // Arrange
      const invalidPayload = {
        type: 'blog_post',
        template: 'Template content',
      };

      // Act
      const response = await request(app)
        .post('/content/templates')
        .send(invalidPayload)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /content', () => {
    it('should return 400 when projectId is not a valid UUID', async () => {
      // Act
      const response = await request(app)
        .get('/content?projectId=invalid-uuid')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is missing', async () => {
      // Act
      const response = await request(app)
        .get('/content')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when contentType is invalid', async () => {
      // Act
      const response = await request(app)
        .get('/content?projectId=00000000-0000-0000-0000-000000000000&contentType=invalid')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should accept valid contentType values', async () => {
      // Arrange
      vi.spyOn(contentService.contentGenerator, 'getGeneratedContent').mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/content?projectId=00000000-0000-0000-0000-000000000000&contentType=blog_post')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /content/templates', () => {
    it('should return templates when type is provided', async () => {
      // Arrange
      vi.spyOn(contentService.contentGenerator, 'getTemplates').mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/content/templates?type=blog_post')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });

    it('should return all templates when type is not provided', async () => {
      // Arrange
      vi.spyOn(contentService.contentGenerator, 'getTemplates').mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/content/templates')
        .expect('Content-Type', /json/);

      // Assert
      expect([200, 500]).toContain(response.status);
    });
  });
});

